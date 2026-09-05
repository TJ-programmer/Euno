# E — Product Experience & Philosophy Specification

**Status:** Pre-implementation source of truth  
**Scope:** Onboarding, Home, Flow, Deep Dive, Related Ideas, and You/Profile  
**Purpose:** Preserve the product philosophy and experience architecture before implementation planning.

---

## 1. Product thesis

E is a **curiosity engine**. It is not primarily a learning app, productivity app, or a social-media alternative.

Its fundamental experience is:

> A few seconds of attention become a small piece of understanding, which creates a natural desire to discover something else.

Most attention products optimize a loop of:

```text
Attention → Engagement → More attention
```

E should optimize a different loop:

```text
Curiosity → Discovery → Understanding → Connection → New curiosity
```

The intended outcome is not that a person spends as long as possible in the product. It is that they leave feeling:

> “I found something interesting.”

Not:

> “I spent an hour scrolling.”

E should optimize for **value density**, not session length. A successful session may be short: a person discovers one meaningful idea, understands it, follows a related connection if they choose, and leaves satisfied.

### What E should feel like

```text
Calm + intelligent + curious + rewarding
```

It should not feel:

```text
Stimulating + addictive + noisy + exhausting
```

---

## 2. Emotional progression

The experience should support a natural movement through these states:

```text
Calm
  ↓
Curious
  ↓
Surprised
  ↓
Understood
  ↓
Interested
  ↓
Deeper
  ↓
Satisfied
  ↓
Curious again
```

This progression is the product's psychological model. Every section has a distinct role in it; no section should attempt to do every job.

---

## 3. Experience architecture

E has four core user-facing sections, preceded by Onboarding. Deep Dive and Related Ideas are part of the core discovery loop, rather than separate equal destinations.

```text
ONBOARDING
     ↓
   HOME ──────────────────┐
     ↓                    │
   FLOW                   │
     ↓                    │
DEEP DIVE                 │
     ↓                    │
RELATED IDEAS             │
     ↓                    │
FLOW / HOME ──────────────┘
     ↓
 YOU / PROFILE
```

| Experience | User question | Primary psychological job |
|---|---|---|
| Onboarding | What am I curious about? | Establish curiosity and relevance |
| Home | What is worth my attention? | Curate attention |
| Flow | What can I discover? | Make discovery effortless |
| Deep Dive | Can I understand this? | Turn interest into understanding |
| Related Ideas | Where could this lead? | Create connections and new curiosity |
| You/Profile | What is my curiosity becoming? | Reflect evolution |

### The sections are intentionally different

- **Home** is quiet, editorial, and intentional: “Here is what matters.”
- **Flow** is immersive and dynamic: “Show me something.”
- **Deep Dive** is focused and structured: “Now I understand.”
- **You** is reflective: “Look at what your curiosity is becoming.”

Profile is important, but it is not the core discovery loop. It is a mirror of the journey, not a competing destination that demands attention.

---

## 4. Principles that constrain the product

### Curiosity before engagement

E may make discovery as effortless as scrolling, but it must not reproduce the incentive structure of an infinite social feed. The question is not “How do we maximize engagement?” It is:

> Can discovery feel effortless while the thing being discovered is genuinely valuable?

### Understanding, not consumption

The product must allow a user to gain a small but real unit of understanding. A card is not merely content to consume; it is an entry point into an idea.

### Agency, not coercion

The next action should be obvious but optional. E should never make a person feel trapped or automatically carry them onward.

- Discovery is frictionless.
- Stopping is also frictionless.
- Going deeper is invited, never forced.

### Meaningful signals, not social mechanics

Feedback actions such as **Interesting** and **Not for me** can be used as explicit preference signals and experimentation instruments. They are not social-status mechanics.

Traditional social metrics should not define the experience:

- no streak-driven identity;
- no XP or level grinding;
- no badge collection as the primary reward;
- no follower, comment, or algorithmic-status machinery in the discovery interface.

### Value density, not time spent

E does not reward a person for spending more time. It reflects what their curiosity has become.

### The idea is the interface

Discovery should have very little competing UI. No feed of thumbnails, social counts, or visible algorithmic machinery. The knowledge object and the user's attention remain central.

---

## 5. Onboarding — establishing curiosity

### Purpose

Onboarding establishes an initial **Curiosity Profile**. It should not feel like registration or a form the user has to complete for the product's benefit. It should feel as though E is discovering the person.

### Exchange

```text
The user gives: Curiosity → Intent → Depth → Identity
E gives:        Personalization → Relevance → Appropriate depth → First discovery
```

### Core rule

> Do not ask the user to work for E before E gives them something.

The onboarding flow should therefore be brief. It begins with the person's interests or curiosity, then moves quickly into a first discovery rather than a dashboard or profile-completion task.

### First experience

```text
What are you curious about?
        ↓
E is ready.
        ↓
First discovery
```

The first discovery is the proof of the product. It should demonstrate the core interaction: a compelling idea, a small reveal or explanation, and an optional invitation to go deeper.

### User-flow effect

This creates relevance before asking for commitment. The product starts with a moment of value rather than setup fatigue, establishing a relationship based on discovery rather than obligation.

---

## 6. Home — curated attention

### Purpose

Home answers:

> “What is worth my attention?”

It is the intentional, editorial surface of E. It presents a small set of things worth knowing, not an endless feed.

### Experience character

- quiet;
- calm;
- selective;
- editorial rather than algorithmically noisy;
- oriented around what matters now and what relates to the user's curiosity.

Home can include a concise daily selection and a visible reminder of the areas a person has been exploring. Its job is curation, not maximization of interaction.

### User-flow effect

Home lowers the cost of choosing what to pay attention to. Instead of confronting a person with abundance, it creates a calm starting point and a sense that E has considered their attention carefully.

### Distinction from Flow

Home says, “Here is what is worth knowing.” Flow says, “Show me something.” Home begins from intentional selection; Flow begins from open discovery.

---

## 7. Flow — effortless discovery

### Purpose

Flow is the experimental core of E. It asks whether E can make discovery feel as easy as scrolling while preserving genuine value.

Its core loop is:

```text
DISCOVER
   ↓
UNDERSTAND
   ↓
INTEREST
 ↙       ↘
NEXT    DEEPER
 ↓         ↓
DISCOVER  UNDERSTAND
     └──→ NEW CURIOSITY
```

**Next is effortless. Deeper is optional.**

### Interaction meaning

```text
Vertical movement   = breadth / next discovery
Horizontal movement = depth / explore the idea
```

This is not merely a gesture convention. The movement teaches the user the conceptual model of E.

### Content rhythm

Vertical movement should not always produce unrelated cards. Flow can move through a short micro-narrative:

```text
Idea → Revelation → Why → Example → Implication → Next idea
```

The person is still moving quickly, but is progressing through a meaningful thought rather than only sampling disconnected facts.

### Feedback and experimentation

Flow may include lightweight feedback such as **Interesting** and **Not for me**. These are signals that help E learn what is useful or relevant; they should remain secondary to the discovery itself.

Double-tap and other familiar patterns may be explored as product hypotheses, but should not automatically reproduce social-media reward behavior. The meaning of an interaction must remain aligned with curiosity, not popularity.

### User-flow effect

Flow reduces the friction of encountering something new. It creates an accessible entry into knowledge without making the person feel they have entered a course, task, or commitment. Optional depth preserves agency and lets interest, rather than pressure, decide the next step.

### Constraints

- Avoid an explicit “infinite feed” framing, such as large card counts.
- Do not autoplay or create artificial urgency.
- Do not use aggressive reward loops, haptics, notifications, or motion to hold attention.
- Keep navigation minimal and the progress rhythm subtle.

---

## 8. Deep Dive — understanding

### Purpose

Deep Dive answers:

> “Can I understand this?”

It is entered when a person chooses depth from Flow. It should not be a generic long article. It should make the underlying idea understandable through a clear structure: why it happens, the mechanism, an example, and what it means.

### Experience character

- focused;
- calm;
- structured;
- more explanatory than Flow;
- still connected to the original moment of curiosity.

The transition from Flow to Deep Dive should feel like entering the inner structure of an idea. The horizontal movement carries this meaning: the person has chosen to move inward, not merely opened another screen.

### User-flow effect

Deep Dive turns surprise into comprehension. This is what keeps E from becoming educational entertainment or a collection of clever facts. It provides a satisfying stopping point while also revealing possible paths onward.

### Distinction from Flow

Flow gives the hook, discovery, and momentum. Deep Dive provides the explanation and context needed for understanding. Flow should invite curiosity; Deep Dive should honor it.

---

## 9. Related Ideas — connection and continuation

### Purpose

Related Ideas answer:

> “Where could this lead?”

After a person understands an idea, E can reveal concepts, mechanisms, examples, or domains connected to it. This makes the experience a knowledge graph entry point rather than a feed endpoint.

### User-flow effect

Related Ideas transform a completed insight into a choiceful new direction. They can lead back to Flow or Home, creating new curiosity without interrupting the sense of completion.

The person should see that knowledge has structure: ideas can connect, deepen, and recur rather than vanish once scrolled past.

---

## 10. You/Profile — the mirror of curiosity

### Purpose

You/Profile should not primarily answer:

> “How much have you used E?”

It should answer:

> “What is your curiosity becoming?”

The Profile is a reflective experience. It makes the person's evolving intellectual identity visible without turning self-development into a game.

### One evolving identity

E has one central, evolving symbol or logo. It represents the current state and structure of a person's curiosity.

> The logo is not a badge. The logo is the person.

It begins simple and gradually becomes more complex as curiosity develops structure. This is not a fixed, linear level system and has no final completed state.

Illustrative states discussed so far are:

```text
Spark → Explorer → Connector → Deep Diver → Synthesizer → ever-expanding curiosity
```

These express different qualities of engagement with ideas, not a required ladder or time-based reward progression. The final state remains deliberately unnamed: curiosity should not culminate in a finish line.

### What drives evolution

The logo evolves from behavior, not time or arbitrary consumption totals. Relevant dimensions include:

- **Exploration:** encountering different ideas and topics;
- **Depth:** choosing to understand further;
- **Connection:** moving among related ideas;
- **Diversity:** broadening the range of curiosity;
- **Reflection:** returning to ideas and building on them;
- **Serendipity:** exploring beyond obvious interests.

```text
Curiosity behavior
        ↓
Curiosity profile
        ↓
Curiosity state
        ↓
Evolving logo
```

This means a person who explores deeply and connects ideas may evolve differently from someone who encounters many unrelated cards, regardless of how long either has used E.

### Individual shape, not one prescribed identity

The longer-term intent is that the logo can express the structure of an individual's curiosity. A concentrated, deep interest may produce a more central form; an interdisciplinary pattern may become more network-like.

> The logo can become a visual fingerprint of how someone thinks.

The exact visual language and evolution model are still to be designed. This specification only establishes the philosophical requirement: the identity must reflect curiosity rather than reward time spent.

### Profile content

The profile can make the evolution legible through:

- the central evolving logo for identity;
- a curiosity map for evidence of topics and their relationships;
- recent areas of exploration;
- concise reflective language about emerging patterns;
- supporting counts such as ideas explored, deep dives, topics, or connections.

Counts are secondary. The map and the reflection are more important than numerical status.

### What not to expose

Do not present underlying dimensions as points to grind (for example, “12 connection points”). Prefer human reflection such as “Your curiosity is becoming more connected” and evidence of the ideas the person has been linking.

### User-flow effect

Profile closes the loop with self-recognition. Home guides attention, Flow reveals possibilities, Deep Dive produces understanding, and Profile helps a person notice the pattern those choices are creating.

---

## 11. Content and knowledge architecture

E should be built as a knowledge system with experiences rendered on top of it, not as a collection of independently generated screens.

### Central object: the Knowledge Object

One knowledge object can support multiple experiences:

```text
Knowledge Object
      ├── Discovery card / Flow sequence
      ├── Deep Dive
      └── Related Ideas
```

At a conceptual level, a knowledge object contains:

- topic and topic relationships;
- a curiosity-provoking but non-clickbait hook;
- an accurate insight and concise explanation;
- deeper explanation, mechanism, example, and implications;
- related concepts;
- sources and quality information;
- characteristics such as difficulty and novelty where useful.

### Content pipeline

The content process should be structured rather than relying on a single request to generate a flashcard:

```text
Insight candidate
   ↓
Hook
   ↓
Clear explanation
   ↓
Deep Dive
   ↓
Related ideas
   ↓
Verification of factual claims / quality control
```

This supports a consistent experience where the initial hook can be understood, expanded, and connected.

### Three product engines

```text
Content Engine
  What should exist?
  Generates, structures, and validates knowledge objects.

Experience Engine
  How should knowledge be experienced?
  Renders knowledge as Home selections, Flow, Deep Dive, and Related Ideas.

Personalization Engine
  What should this person see next?
  Uses the Curiosity Profile and behavior signals to select from the content pool.
```

For the initial product, personalization can remain simple and rules-based. The philosophical requirement is relevance without premature complexity, not a specific recommendation technology.

---

## 12. The complete product loop

```text
Curiosity profile
       ↓
Curated / selected knowledge object
       ↓
Home or Flow
       ↓
Discovery
       ↓
Optional Deep Dive
       ↓
Related Ideas
       ↓
User signals and behavior
       ↓
Evolving curiosity profile
       ↓
More relevant future discovery
```

The loop must remain user-led. Behavior informs relevance; it must not become a mechanism for maximizing compulsive consumption.

---

## 13. Product success criteria

The guiding success concept is **Meaningful Discovery**, rather than raw time spent or cards viewed.

A meaningful session is one in which a person:

```text
discovers → understands → chooses whether to deepen or connect → leaves with value
```

The retention question is therefore not:

> “How do we make them come back?”

It is:

> “What happened in their last session that gives them a reason to come back?”

Possible answers include:

- “I discovered something.”
- “I understood something.”
- “I found a new interest.”
- “I want to continue that idea.”
- “I want to see what E finds next.”

---

## 14. Decisions preserved for implementation planning

The following are product decisions or constraints established so far:

1. E is a curiosity engine centered on discovery, understanding, connection, and renewed curiosity.
2. Home, Flow, Deep Dive, and You/Profile have distinct psychological roles.
3. Onboarding should establish relevance quickly and lead into an immediate first discovery.
4. Home is a quiet, curated editorial surface, not an engagement feed.
5. Flow makes discovery effortless; vertical movement represents breadth and horizontal movement represents optional depth.
6. Deep Dive is the structured understanding layer, not simply a longer article.
7. Related Ideas make the product a connected knowledge experience rather than a terminal feed.
8. Feedback is for preference learning and experimentation, not social validation.
9. The product should make both continuation and stopping frictionless.
10. Profile reflects what a person's curiosity is becoming through a single evolving identity, a curiosity map, and reflective evidence—not badges, XP, streaks, or time-based levels.
11. The identity evolves from patterns of curiosity behavior, not time or arbitrary totals.
12. Knowledge objects, relationships, and quality control are the foundation beneath each user-facing experience.
13. E optimizes for meaningful discovery and value density, not session duration.

## 15. Deliberately unresolved before implementation planning

These topics were identified but are not yet product decisions:

- the exact visual grammar of the evolving E logo;
- the detailed multidimensional evolution model and whether/how identity changes over time;
- final labels for curiosity states, especially any long-term state;
- exact Flow gesture behavior, feedback interaction, and experiment design;
- screen-level component specification, visual design tokens, and motion details;
- implementation schema, analytics event definitions, and content operations.

They should be resolved in the implementation planning phase while remaining consistent with this specification.

