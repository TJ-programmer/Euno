# E — Engineering Guide

## Product context

E is a mobile product built around curiosity and discovery. The first experience to implement is onboarding: help a new user express what they are curious about, why they are exploring, and their preferred depth; authenticate them; create their profile; then take them to first discovery.

The initial flow is:

```text
Curiosity → Purpose → Depth → Authentication → Profile creation → First discovery
```

Do not build Home, Flow recommendation logic, profile evolution, notifications, or advanced personalization as part of this slice.

## Architecture principle

Use a **modular monorepo** with clearly separated mobile and API applications. This is explicitly **not** a microservice architecture.

Optimize first for safe, independent change between areas of the product—not hypothetical scale to millions of users. Keep boundaries clear while keeping the system simple.

## Repository shape

```text
E/
├── apps/
│   ├── mobile/              # React Native + Expo app
│   └── api/                 # FastAPI application
├── packages/
│   ├── contracts/           # Shared API schemas/types
│   ├── design-system/       # Mobile UI primitives and tokens
│   └── config/              # Shared configuration
├── services/
│   └── content-engine/      # Later; do not introduce initially
├── infrastructure/
│   ├── supabase/
│   │   ├── migrations/
│   │   └── seed/
│   └── deployment/
├── docs/
├── scripts/
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

Keep application code in its own app boundary. Shared code belongs in a package only when it is genuinely shared.

## Technology boundaries

### Mobile

- React Native, Expo, TypeScript, and Expo Router.
- Use Expo Router for onboarding and subsequent mobile navigation.
- Keep onboarding state local and small before authentication:

```ts
type OnboardingState = {
  interests: string[]
  goals: string[]
  depth: "quick" | "balanced" | "deep" | null
}
```

Authentication state is separate from onboarding state. Once authenticated, turn the collected onboarding data into the user's profile.

### API

- Python and FastAPI.
- The API owns application-specific profile creation and future application logic.
- Organize backend code by domain/module (for example, onboarding or profiles) rather than as a growing collection of generic technical layers. Keep each domain's routes, schemas, and logic close together where practical.

### Supabase

- Supabase Auth handles authentication.
- Supabase Postgres stores application data.
- Supabase Storage handles stored files when the product needs them.
- The mobile app may communicate directly with Supabase for authentication. Do not route that through FastAPI without a concrete need.

## API and contract boundary

Mobile and API communicate through explicit API contracts. Do not couple the mobile app to backend internals or database details.

`packages/contracts/` is the source for shared request/response shapes and API-facing types. Because mobile is TypeScript and the API is Python, keep equivalent contract definitions aligned deliberately; do not assume a single language runtime or force code sharing across languages. Treat a contract change as a coordinated mobile-and-API change.

## Onboarding-first implementation

Build only the minimum path needed to prove the initial experience:

1. Curiosity selection
2. Purpose selection
3. Depth selection
4. Authentication
5. Profile creation from onboarding state
6. First discovery destination

The backend should remain thin for this phase. Add only the profile/data logic necessary to make the flow durable.

## LVP scope and anti-over-engineering rules

- Build one complete user experience before expanding into adjacent product areas.
- Do not introduce microservices, a content engine, advanced recommendation logic, or complex orchestration for the onboarding slice.
- Avoid abstractions without a present use in the current flow.
- Prefer clear, direct code and small local state over generalized frameworks.
- Keep authentication, onboarding answers, and the resulting user profile conceptually distinct.
- Preserve clean boundaries, but do not add process or infrastructure merely to look scalable.

## Coding and architecture principles

- Make ownership explicit: mobile owns user experience and navigation; FastAPI owns application logic; Supabase owns Auth, Postgres, and Storage.
- Keep interfaces narrow and intentional.
- Design modules so a change in mobile, API, or infrastructure does not unnecessarily destabilize the others.
- Favor incremental, reversible changes that support the current LVP.
- Document meaningful contract or boundary decisions close to the code they affect.

## Evolution rule

The modular monorepo is the default architecture. Evolve it only when real pressure appears—such as independently changing or deploying a domain becoming genuinely difficult, or demonstrated load/operational needs. Scale the specific constrained part, rather than pre-emptively converting the system into microservices.
