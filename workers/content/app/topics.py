from typing import Literal, get_args


# ----------------------------------------------------------------------
# SINGLE SOURCE OF TRUTH FOR FLOW TOPICS
# ----------------------------------------------------------------------

TOPICS: list[dict[str, str]] = [
    {"id": "artificial-intelligence", "label": "Artificial Intelligence"},
    {"id": "technology", "label": "Technology"},
    {"id": "psychology", "label": "Psychology"},
    {"id": "philosophy", "label": "Philosophy"},
    {"id": "business", "label": "Business"},
    {"id": "startups", "label": "Startups"},
    {"id": "science", "label": "Science"},
    {"id": "space", "label": "Space"},
    {"id": "design", "label": "Design"},
    {"id": "creativity", "label": "Creativity"},
    {"id": "music", "label": "Music"},
    {"id": "cinema", "label": "Cinema"},
    {"id": "writing", "label": "Writing"},
    {"id": "photography", "label": "Photography"},
    {"id": "history", "label": "History"},
    {"id": "economics", "label": "Economics"},
    {"id": "finance", "label": "Finance"},
    {"id": "health", "label": "Health"},
    {"id": "fitness", "label": "Fitness"},
    {"id": "food", "label": "Food"},
    {"id": "travel", "label": "Travel"},
    {"id": "nature", "label": "Nature"},
    {"id": "culture", "label": "Culture"},
    {"id": "society", "label": "Society"},
    {"id": "relationships", "label": "Relationships"},
    {"id": "personal-growth", "label": "Personal Growth"},
    {"id": "programming", "label": "Programming"},
    {"id": "mathematics", "label": "Mathematics"},
    {"id": "games", "label": "Games"},
    {"id": "human-behavior", "label": "Human Behavior"},
]


# ----------------------------------------------------------------------
# TYPE USED BY THE PYDANTIC MODEL
#
# A Literal makes structured output constrain the LLM to these exact
# values, and makes Pydantic reject anything else.
#
# NOTE: keep this in sync with TOPICS above. The assert at the bottom
# fails at import time if they ever drift apart.
# ----------------------------------------------------------------------

TopicLabel = Literal[
    "Artificial Intelligence",
    "Technology",
    "Psychology",
    "Philosophy",
    "Business",
    "Startups",
    "Science",
    "Space",
    "Design",
    "Creativity",
    "Music",
    "Cinema",
    "Writing",
    "Photography",
    "History",
    "Economics",
    "Finance",
    "Health",
    "Fitness",
    "Food",
    "Travel",
    "Nature",
    "Culture",
    "Society",
    "Relationships",
    "Personal Growth",
    "Programming",
    "Mathematics",
    "Games",
    "Human Behavior",
]

TOPIC_LABELS: list[str] = [t["label"] for t in TOPICS]
TOPIC_LABEL_TO_ID: dict[str, str] = {t["label"]: t["id"] for t in TOPICS}

assert set(get_args(TopicLabel)) == set(TOPIC_LABELS), (
    "TopicLabel Literal is out of sync with TOPICS."
)


# ----------------------------------------------------------------------
# PROMPT BLOCK
# ----------------------------------------------------------------------

def build_topic_prompt_block() -> str:
    options = "\n".join(f"- {label}" for label in TOPIC_LABELS)

    return f"""
TOPIC LABEL
-----------

Choose exactly ONE `label` for this Flow from the list below.

Allowed labels (copy the text EXACTLY, including capitalization
and spacing):

{options}

Selection rules:

- Pick the single topic that best describes the central idea
  of the canonical content, not a passing detail.
- If several topics fit, choose the most specific one that
  still fits the core idea.
- Never invent a new label.
- Never combine two labels.
- Never abbreviate, translate, or reword a label.
- Never output the id form (for example "personal-growth");
  output the label form ("Personal Growth").
- The label is metadata. It must not influence the wording of
  any Flow section or add any information to it.
"""


# ----------------------------------------------------------------------
# DETERMINISTIC VALIDATION
# ----------------------------------------------------------------------

def validate_topic_label(label: str) -> None:
    if label not in TOPIC_LABEL_TO_ID:
        raise ValueError(
            f"Flow label '{label}' is not an allowed topic. "
            f"Allowed labels: {', '.join(TOPIC_LABELS)}"
        )
