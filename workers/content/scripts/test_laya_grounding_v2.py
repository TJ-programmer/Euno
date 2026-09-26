from laya import Router


SOURCE = """
The Zeigarnik effect is a psychological phenomenon in which people
remember interrupted or incomplete tasks better than completed tasks.

The effect was associated with psychologist Bluma Zeigarnik, who
observed that waiters appeared to remember unpaid orders better than
orders that had already been completed.

The phenomenon is commonly described as a tendency for incomplete
tasks to remain more accessible in memory.
"""


TEST_CASES = [
    {
        "name": "supported_core_effect",
        "claim": (
            "People tend to remember incomplete tasks better "
            "than completed tasks."
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
    {
        "name": "supported_zeigarnik_association",
        "claim": (
            "The Zeigarnik effect was associated with "
            "psychologist Bluma Zeigarnik."
        ),
        "expected": "supported",
    },
    {
        "name": "overclaim_always",
        "claim": (
            "People always remember incomplete tasks better "
            "than completed tasks."
        ),
        "expected": "overclaim",
    },
    {
        "name": "overclaim_everyone",
        "claim": (
            "Everyone remembers incomplete tasks better "
            "than completed tasks."
        ),
        "expected": "overclaim",
    },
    {
        "name": "overclaim_causation",
        "claim": (
            "Incomplete tasks cause the brain to permanently "
            "store stronger memories."
        ),
        "expected": "overclaim",
    },
    {
        "name": "overclaim_neural_mechanism",
        "claim": (
            "The prefrontal cortex keeps incomplete tasks "
            "active until they are completed."
        ),
        "expected": "unsupported",
    },
    {
        "name": "unsupported_productivity",
        "claim": (
            "Writing down unfinished tasks completely removes "
            "the Zeigarnik effect."
        ),
        "expected": "unsupported",
    },
    {
        "name": "unsupported_sleep",
        "claim": (
            "The Zeigarnik effect causes people to lose sleep "
            "whenever they have unfinished tasks."
        ),
        "expected": "unsupported",
    },
    {
        "name": "contradiction",
        "claim": (
            "People remember completed tasks better than "
            "incomplete tasks."
        ),
        "expected": "contradictory",
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
                "Is the CLAIM directly supported by the SOURCE? "
                "Answer true only when the SOURCE supports the "
                "entire CLAIM without requiring additional facts, "
                "assumptions, or interpretation."
            ),
            "criteria": {
                "true": (
                    "The SOURCE directly supports the entire CLAIM "
                    "without adding unsupported information."
                ),
                "false": (
                    "The SOURCE does not support the entire CLAIM, "
                    "or the CLAIM contains additional unsupported "
                    "information, exaggeration, universal language, "
                    "causal claims, or mechanisms not stated by "
                    "the SOURCE."
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
    print("LAYA GROUNDING BENCHMARK V2")
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

    supported = [
        r["noul"]
        for r in results
        if r["expected"] == "supported"
    ]

    non_supported = [
        r["noul"]
        for r in results
        if r["expected"] != "supported"
    ]

    print("\nSupported claims:")
    print(f"  min: {min(supported):.4f}")
    print(f"  max: {max(supported):.4f}")

    print("\nNon-supported claims:")
    print(f"  min: {min(non_supported):.4f}")
    print(f"  max: {max(non_supported):.4f}")


if __name__ == "__main__":
    main()
