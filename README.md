# Euno — a curiosity engine

Euno is a mobile product built around curiosity, discovery, understanding, and connection. It is not a learning app, productivity app, or social feed: a few seconds of attention become a small piece of understanding, which creates a natural desire to discover something else.

> Quiet interface. Strong content. Intelligent motion.

## Product

E has four core user-facing experiences, preceded by onboarding:

- **Home** — a calm, editorial front page that curates attention ("What is worth my attention?")
- **Flow** — effortless discovery, one idea at a time ("What can I discover?")
- **Deep Dive** — structured understanding of an idea ("Can I understand this?")
- **You / Profile** — a mirror of how your curiosity is evolving ("What is my curiosity becoming?")

E optimizes for **value density**, not session length. Feedback signals such as *Interesting* and *Not for me* are preference-learning instruments, not social status. There are no streaks, XP, badges, or algorithmic-status mechanics.

See the full specification:

- [`docs/Product-Experience-and-Philosophy-Specification.md`](docs/Product-Experience-and-Philosophy-Specification.md) — product philosophy and experience architecture
- [`docs/design.md`](docs/design.md) — design principles and visual system
- [`docs/agent.md`](docs/agent.md) — engineering guide and architecture decisions

## Status

Early pre-implementation. The onboarding slice is in progress (`Curiosity → Purpose → Depth → Authentication → Profile → First discovery`). Home, Flow, recommendation logic, profile evolution, and notifications are intentionally out of scope for this phase.

## Repository structure

Modular monorepo, not microservices. See [`docs/agent.md`](docs/agent.md) for the architecture principles.

```text
E/
├── apps/
│   └── mobile/             # React Native + Expo app (TypeScript, Expo Router)
├── packages/               # Shared code (contracts, design-system, config — planned)
├── docs/                   # Product, design, and engineering documentation
├── content/                # Knowledge-object content (planned)
├── supabase/               # Database migrations and seed (planned)
├── package.json
└── pnpm-workspace.yaml
```

## Tech stack

| Area | Technology |
| --- | --- |
| Mobile | React Native, Expo SDK 57, TypeScript, Expo Router |
| Auth & data | Supabase (Auth, Postgres, Storage) — planned |
| API | Python + FastAPI — planned |
| Package manager | pnpm |

## Getting started

Currently only the mobile app exists. Install dependencies and start it:

```bash
pnpm install
pnpm --dir apps/mobile start
```

Or run directly inside `apps/mobile`:

```bash
cd apps/mobile
npx expo start
```

In the output you can open the app on an Android emulator, iOS simulator, or in the Expo Go sandbox. The app uses file-based routing via Expo Router.

### Lint

```bash
cd apps/mobile
pnpm lint
```

## Principles

- **Curiosity before engagement** — discovery feels effortless, but what is discovered is genuinely valuable.
- **Understanding, not consumption** — every card is an entry point into an idea, not content to scroll past.
- **Agency, not coercion** — continuing and stopping are both frictionless; going deeper is invited, never forced.
- **The idea is the interface** — minimal chrome; the knowledge object and the user's attention stay central.
