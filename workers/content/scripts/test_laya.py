from laya import Router


def main():
    router = Router(preload=True)

    source = """
The Zeigarnik effect is a psychological phenomenon in which people
remember interrupted or incomplete tasks better than completed tasks.

The effect was associated with psychologist Bluma Zeigarnik, who
observed that waiters appeared to remember unpaid orders better than
orders that had already been completed.

The phenomenon is commonly described as a tendency for incomplete
tasks to remain more accessible in memory.
"""

    claims = {
        "claim_directly_supported": """
People remember interrupted or incomplete tasks better than completed
tasks.
""",
        "claim_partially_supported": """
Unfinished tasks remain active in memory because the brain creates a
state of mental tension.
""",
        "claim_unsupported": """
The prefrontal cortex continuously maintains the neural representation
of unfinished tasks until they are completed.
""",
    }

    questions = {}

    for name, claim in claims.items():
        questions[name] = {
            "type": "noul",
            "instructions": (
                "Is the CLAIM directly supported by the SOURCE? "
                "Answer true only when the source supports the claim "
                "without requiring additional facts or assumptions."
            ),
            "criteria": {
                "true": "The SOURCE directly supports the entire CLAIM.",
                "false": "The SOURCE does not directly support the entire CLAIM.",
            },
        }

    # Each question needs its own claim in the state.
    # Therefore run them as separate states for this experiment.
    for name, claim in claims.items():
        state = {
            "source": source,
            "claim": claim,
        }

        result = router.predict(
            state,
            {name: questions[name]},
        )

        answer = result["answers"][name]

        print(f"\n{name}")
        print(f"  noul:       {answer['noul']}")
        print(f"  confidence: {answer['confidence']}")


if __name__ == "__main__":
    main()
