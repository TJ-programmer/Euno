from laya import Router


SOURCE = """
The Zeigarnik effect is a psychological phenomenon in which people
remember interrupted or incomplete tasks better than completed tasks.

The effect was associated with psychologist Bluma Zeigarnik, who
observed that waiters appeared to remember unpaid orders better than
orders that had already been completed.

The phenomenon is commonly described as a tendency for incomplete
tasks to remain more accessible in memory.

Later research has questioned how broadly the original effect
generalizes across different situations and experimental conditions.
"""


TEST_CASES = [
    # ---------------------------------------------------------
    # DIRECTLY SUPPORTED
    # ---------------------------------------------------------

    {
        "name": "supported_effect",
        "claim": (
            "Incomplete tasks tend to be remembered better than "
            "completed tasks."
        ),
        "expected": "supported",
    },
    {
        "name": "supported_accessibility",
        "claim": (
            "Incomplete tasks tend to remain more accessible "
            "in memory."
        ),
        "expected": "supported",
    },

    # ---------------------------------------------------------
    # PARTIALLY SUPPORTED
    # ---------------------------------------------------------

    {
        "name": "partial_effect_plus_unrelated_claim",
        "claim": (
            "Incomplete tasks tend to be remembered better than "
            "completed tasks, and this effect makes people more "
            "productive."
        ),
        "expected": "partial",
    },
    {
        "name": "partial_effect_plus_universal",
        "claim": (
            "Incomplete tasks tend to be remembered better than "
            "completed tasks, and this happens to everyone."
        ),
        "expected": "partial",
    },
    {
        "name": "partial_waiters_plus_wrong_detail",
        "claim": (
            "Waiters remembered unpaid orders better than completed "
            "orders because unfinished tasks permanently occupy "
            "working memory."
        ),
        "expected": "partial",
    },
    {
        "name": "partial_generalization",
        "claim": (
            "The Zeigarnik effect shows that incomplete tasks are "
            "always more memorable in every situation."
        ),
        "expected": "partial",
    },

    # ---------------------------------------------------------
    # UNSUPPORTED
    # ---------------------------------------------------------

    {
        "name": "unsupported_productivity",
        "claim": (
            "The Zeigarnik effect increases workplace productivity."
        ),
        "expected": "unsupported",
    },
    {
        "name": "unsupported_sleep",
        "claim": (
            "Unfinished tasks cause people to lose sleep."
        ),
        "expected": "unsupported",
    },
    {
        "name": "unsupported_neural_mechanism",
        "claim": (
            "The prefrontal cortex keeps unfinished tasks active "
            "until they are completed."
        ),
        "expected": "unsupported",
    },

    # ---------------------------------------------------------
    # CONTRADICTORY
    # ---------------------------------------------------------

    {
        "name": "contradictory_memory",
        "claim": (
            "Completed tasks are generally remembered better than "
            "unfinished tasks."
        ),
        "expected": "contradictory",
    },

    # ---------------------------------------------------------
    # SUBTLE / SOURCE-BOUNDARY TEST
    # ---------------------------------------------------------

    {
        "name": "supported_with_caveat",
        "claim": (
            "The Zeigarnik effect is a tendency for incomplete tasks "
            "to remain more accessible in memory, although research "
            "has questioned how broadly the effect generalizes."
        ),
        "expected": "supported",
    },
]


def evaluate_case(router: Router, case: dict) -> dict:
    state = {
        "source": SOURCE,
        "claim": case["claim"],
    }

    questions = {
        "grounding": {
            "type": "noul",
            "instructions": (
                "Is the CLAIM fully supported by the SOURCE? "
                "Answer true only when the SOURCE supports the "
                "entire CLAIM without requiring additional facts, "
                "assumptions, or outside knowledge."
            ),
            "criteria": {
                "true": (
                    "The SOURCE directly supports the entire CLAIM. "
                    "Every substantive part of the CLAIM is supported "
                    "by information in the SOURCE."
                ),
                "false": (
                    "Any substantive part of the CLAIM is unsupported, "
                    "exaggerated, universalized, causally inferred, "
                    "contradicted, or requires information not present "
                    "in the SOURCE."
                ),
            },
        }
    }

    result = router.predict(state, questions)
    answer = result["answers"]["grounding"]

    return {
        "name": case["name"],
        "expected": case["expected"],
        "noul": answer["noul"],
        "confidence": answer["confidence"],
    }


def main():
    router = Router(preload=True)

    results = []

    print("\n")
    print("=" * 80)
    print("LAYA GROUNDING BENCHMARK V3")
    print("MULTI-FACT / PARTIAL-SUPPORT TEST")
    print("=" * 80)

    for case in TEST_CASES:
        result = evaluate_case(router, case)
        results.append(result)

        print(f"\n{result['name']}")
        print(f"  expected:   {result['expected']}")
        print(f"  noul:       {result['noul']}")
        print(f"  confidence: {result['confidence']}")

    print("\n")
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)

    for category in [
        "supported",
        "partial",
        "unsupported",
        "contradictory",
    ]:
        values = [
            r["noul"]
            for r in results
            if r["expected"] == category
        ]

        if values:
            print(f"\n{category.upper()}:")
            print(f"  min: {min(values):.4f}")
            print(f"  max: {max(values):.4f}")
            print(f"  avg: {sum(values) / len(values):.4f}")


if __name__ == "__main__":
    main()
