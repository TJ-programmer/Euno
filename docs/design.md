# E — Design Principles

## Purpose and authority

This document is the practical visual and interaction source of truth for E. It guides product designers, engineers, and coding agents when making product decisions. Where implementation pressure conflicts with these principles, preserve the reader's attention and clarity over decorative novelty.

The core principle is:

> **Quiet interface. Strong content. Intelligent motion.**

E should attract attention just enough to reveal an idea, then get out of the way. The interface is a thoughtful host, not the main event.

Exact typefaces, font scales, colour values, component dimensions, and motion timings remain **to be finalized after visual prototyping and accessibility testing**. Do not treat placeholders in this document as permission to choose arbitrary values independently.

---

## Design philosophy

E sits at the intersection of an editorial magazine, a modern knowledge product, and a subtle social interface. It should feel intelligent, human, and composed—never sterile or academic.

The product is not a productivity dashboard, a children's learning app, corporate SaaS, a short-video clone, a gamified education app, or an over-styled futuristic AI surface. Learning should feel like discovering something worth dwelling on, not completing a task list.

Design for restraint:

- Give ideas room to breathe.
- Make hierarchy obvious before adding decoration.
- Let content, not containers, create interest.
- Use visual surprise sparingly, where it earns curiosity.
- Make every interaction feel deliberate and physically plausible.

## Psychological objectives

E should support this emotional progression:

```text
CALM → CURIOSITY → ATTENTION → UNDERSTANDING → SATISFACTION
```

| Stage | Design intent | UI response |
| --- | --- | --- |
| Calm | Reduce cognitive noise and establish trust. | Generous whitespace, quiet surfaces, predictable navigation. |
| Curiosity | Invite the next idea without manipulating attention. | Strong editorial framing, a single clear next action, restrained accents. |
| Attention | Help people stay with an idea. | Minimal chrome, readable typography, stable layouts, no competing calls to action. |
| Understanding | Make complexity feel navigable. | Clear grouping, progressive disclosure, meaningful diagrams and labels. |
| Satisfaction | Let progress and reflection feel real. | Small confirmations, saved context, gentle recognition—never noisy rewards. |

Different product areas shift emphasis while remaining part of one system:

| Area | Primary feeling | Visual character |
| --- | --- | --- |
| Onboarding | Trust and curiosity | Warm, welcoming, low-pressure |
| Home | Calm and relevance | Editorial, composed |
| Flow | Curiosity and surprise | Minimal, immersive |
| Deep Dive | Attention and understanding | Focused, structured |
| You / Profile | Reflection and identity | Quiet, personal |

## Visual personality

E should be:

- Editorial rather than dashboard-like.
- Warmly intelligent rather than clinical.
- Contemporary rather than trend-chasing.
- Confidently restrained rather than empty.
- Personal without being performative.

Content leads. Controls, navigation, and metadata recede until needed. A page should have one visual idea and one obvious point of entry; secondary actions must be available without competing for attention.

## Typography

### Principles

- Typography carries much of E's personality. Treat it as a primary interface material, not decorative styling.
- Use a highly legible sans-serif for UI, metadata, controls, and longer body reading. It should be neutral enough to let ideas carry the voice.
- Introduce a complementary editorial display or reading face only if prototyping proves it improves atmosphere without reducing comprehension or Tamil support.
- Prefer a small, disciplined hierarchy over many weights, sizes, or all-caps labels.
- Use comfortable line length, line height, and contrast for sustained reading. Never compress text to make a card look neater.
- Use real semantic text styles (display, title, body, label, metadata) rather than one-off font rules.

### Latin and Tamil

E must feel equally intentional in Latin and Tamil, including mixed-language content. Validate every chosen family and fallback for Tamil glyph quality, shaping, punctuation, numerals, baseline alignment, line-height, and weight matching.

- Do not assume a Latin-first typeface will provide acceptable Tamil fallback.
- Test real bilingual headlines, paragraphs, names, tags, dates, and numerals before committing.
- Tamil generally needs sufficient line-height and should never be visually squeezed to match Latin metrics.
- Avoid letter-spacing Tamil text except where a tested typeface specifically supports it; default tracking is usually the correct choice.
- When scripts mix in one line, preserve reading order and avoid visual jumps caused by inconsistent fallback metrics.
- Localize truncation, line clamping, and text expansion behavior; never rely on an English-only character count.

**Typeface families, fallbacks, scale, and weights: to be finalized after bilingual visual prototyping.**

## Color philosophy

Colour creates emotional temperature and hierarchy; it is not the product's primary source of excitement. The default palette should be calm, tactile, and mostly neutral, with enough warmth to avoid a cold institutional feel.

- Build from quiet background, surface, primary-text, secondary-text, and divider roles.
- Use contrast and typography before colour to establish hierarchy.
- Reserve saturated colour for meaningful emphasis, status, category recognition, or a moment of discovery.
- Keep long reading experiences low-stimulation.
- Ensure light and dark themes feel like the same product, not inverted palettes assembled mechanically.

### Accent usage

An accent is a signal, not wallpaper. It may highlight the current idea, an important action, a selected state, a new insight, or limited category identity. Use only one dominant accent within a focused view whenever possible.

- Never use accent colour simultaneously for decoration, links, errors, selection, and primary action without distinct treatment.
- Do not rely on colour alone for state or meaning.
- Avoid gradients unless a specific product concept demonstrably needs one; they are not a default brand device.

**Exact palette, semantic mappings, dark-theme values, and category colours: to be finalized after visual prototyping and contrast review.**

## Layout and spacing

Whitespace is an active part of comprehension. Use spacing to group related meaning, separate changes of thought, and create an unhurried reading rhythm.

- Use a consistent spacing scale and grid; avoid ad-hoc gaps.
- Prefer a single strong vertical flow on mobile. Do not force dense multi-column layouts onto narrow screens.
- Establish predictable page gutters and readable maximum text widths on larger screens.
- Align text, media, and controls to a small number of deliberate anchors.
- Separate metadata from the main idea without making it disappear.
- Protect touch targets and text from cramped card edges.

**Grid, breakpoints, gutters, and spacing increments: to be finalized after prototyping across target devices.**

## Cards and surfaces

Cards are editorial groupings, not a default wrapper for every element. Use them when they clarify a distinct idea, preview, action, or collection.

- Keep cards simple: clear title, concise supporting context, and a purposeful image or action only when needed.
- Avoid stacking cards inside cards or placing every row in a floating container.
- Let the page background and spacing do some grouping work.
- Selected, pressed, saved, and disabled states must be visibly distinct and accessible.
- Cards should feel quiet and tactile, not glossy or over-elevated.

## Area-specific visual behavior

### Home

Home is an editorial front page, not a dashboard. It makes the most relevant next idea easy to enter and makes breadth discoverable without flooding the user with choices.

- Lead with one primary story, question, or continuation.
- Use sections to create a calm reading rhythm, not an endless wall of equal cards.
- Keep persistent metrics, streaks, and notifications subordinate to content.
- Personalization should feel like relevance, never surveillance or pressure.

### Flow

Flow is the most immersive discovery experience. It should enable curiosity with minimal interface interruption.

- One idea at a time; suppress unnecessary navigation and metadata.
- Make the next transition feel natural and intentional.
- Preserve orientation: users must always be able to understand where they are and leave without friction.
- Avoid rapid-fire, autoplay, or reward-loop patterns associated with attention extraction.

### Deep Dive

Deep Dive is for sustained attention and understanding.

- Prioritize reading comfort, content structure, and progressive disclosure.
- Use sections, visual explanations, references, and related ideas to make complexity navigable.
- Keep actions nearby but quiet: save, share, explore a term, or continue should not interrupt the reading line.
- Do not surround each paragraph with UI; the content should feel like a coherent whole.

### You / Profile

You is a space for reflection, identity, and continuity—not a public performance dashboard.

- Show interests, saved material, learning paths, and meaningful progress with a calm personal tone.
- Treat progress as evidence of a relationship with ideas, not a score to optimize.
- Avoid leaderboards, forced achievements, or conspicuous social comparison by default.
- Privacy controls and explanations should be clear, close to the relevant information, and never hidden behind ambiguous language.

## Motion, animation, and haptics

### Motion principles

Motion should explain change, provide feedback, and create a quiet sense of continuity. It must never be used to manufacture urgency.

- Animate only when it clarifies spatial relationship, state change, system response, or a moment of discovery.
- Prefer subtle opacity, position, scale, and shared-element transitions over ornamental effects.
- Keep motion short, smooth, interruptible, and responsive to user input.
- Avoid looping decoration, bouncy gamification, aggressive parallax, surprise movement, and animations that block reading.
- Respect reduced-motion preferences with a complete, dignified alternative—not a broken or abrupt experience.

**Exact durations, easing curves, and transition specifications: to be finalized after interactive prototyping.**

### Gestures

Gestures should feel native, optional, and discoverable without a tutorial.

- Pair every important gesture with a visible control or clear affordance.
- Use gestures to reduce friction in Flow and media exploration, not to hide essential navigation.
- Do not overload the same gesture with different meanings by context unless the context is unmistakable.
- Provide immediate visual feedback during a gesture and allow graceful cancellation.

### Haptics

Haptics are confirmation, not celebration.

- Use light, restrained feedback for meaningful completion, selection, saving, or boundary states.
- Do not add haptics to routine scrolling, every tap, or nonessential animation.
- Respect device settings and platform conventions; haptics must never be the only feedback channel.

## Icons

Icons should be familiar, simple, and secondary to clear labels where ambiguity is possible.

- Use one consistent icon family and optical weight.
- Prefer platform-recognizable metaphors for common actions.
- Pair unfamiliar or high-consequence icons with text.
- Never use icons as decoration merely to fill empty space.
- Preserve accessible names and adequate touch targets.

**Icon family and final stroke/fill language: to be finalized after visual prototyping.**

## Imagery and illustration

Imagery exists to deepen understanding or spark curiosity. It should not become visual filler.

- Use images, diagrams, and illustrations when they add context, evidence, emotion, or explanation.
- Favor editorial crops, authentic subject matter, and clear explanatory visuals over generic stock imagery.
- Treat illustration as a supporting voice: restrained, intelligent, and concept-led.
- Avoid childish mascots, decorative blobs, excessive 3D objects, and generic AI-futurist imagery.
- Provide useful alt text; decorative images should be explicitly marked decorative.

## Borders, radii, and shadows

Surface treatment should communicate structure gently.

- Prefer subtle dividers and tonal separation over heavy outlines.
- Use a restrained, consistent radius scale; cards should feel approachable but not toy-like.
- Shadows, when used, should be soft and functional—primarily to communicate elevation or temporary layers.
- Avoid dramatic drop shadows, glassmorphism, thick borders, and excessive pills.

**Exact radius, border, elevation, and shadow tokens: to be finalized after visual prototyping.**

## Accessibility and inclusion

Accessibility is a baseline quality requirement, not a final polish pass.

- Meet applicable contrast requirements for text, controls, focus, and non-text indicators.
- Support dynamic type / text scaling without clipping, overlap, or loss of hierarchy.
- Ensure complete keyboard and screen-reader access wherever relevant to the platform.
- Provide visible focus states, semantic headings, logical reading order, and descriptive labels.
- Do not convey status, progress, selection, or error by colour, motion, or haptics alone.
- Ensure touch targets meet platform accessibility guidance.
- Test dark mode, reduced motion, low vision, bilingual Tamil/Latin content, and long-text states as first-class cases.

## Logo and evolution philosophy

The E mark should be simple enough to become familiar through repeated use, not dependent on trend effects to seem memorable. The product identity should gain meaning as users associate it with moments of discovery.

- Begin with a quiet, versatile mark that works at small sizes, in monochrome, and alongside wordmark text.
- Let the product's editorial typography, content quality, and behavior do more identity work than a loud logo.
- Evolve deliberately through validated use, not frequent rebrands or decorative seasonal variations.
- Protect legibility and recognizability before expressive treatment.

**Final logo, wordmark, lockups, and usage rules: to be finalized after identity exploration and prototyping.**

## Anti-patterns to avoid

- Dashboard density, metric overload, and default card grids.
- Gamification that turns learning into streak maintenance, point collection, or social comparison.
- Autoplay, infinite-scroll urgency, notification pressure, and other attention-extraction patterns.
- Decorative gradients, glass effects, animated backgrounds, and visual noise used as a substitute for hierarchy.
- Excessive rounded pills, floating surfaces, heavy shadows, or borders around every element.
- Multiple competing primary actions on one screen.
- Tiny low-contrast metadata and text compressed to preserve a visual layout.
- English-first typography or localization that treats Tamil as a fallback afterthought.
- Motion that delays interaction, obscures state, or continues while the user is trying to read.
- Icons without clear meaning, imagery without purpose, and AI aesthetics without explanatory value.

## Design-system and token guidance

Build the system from semantic decisions rather than raw values scattered through code. Tokens should make a component's intent legible and allow the visual system to evolve coherently.

### Token layers

1. **Reference tokens** — raw primitives such as base colours, type sizes, spacing increments, radii, durations, and elevation values.
2. **Semantic tokens** — purpose-based roles such as `surface-primary`, `text-secondary`, `action-primary`, `border-subtle`, `focus-ring`, and `feedback-success`.
3. **Component tokens** — constrained component roles such as card padding, article title style, bottom-sheet elevation, and primary-button state colours.

### Rules

- Components consume semantic and component tokens, not arbitrary reference values.
- Token names describe intent, not appearance; use `text-primary`, not `gray-900`.
- Define states consistently: default, pressed, selected, disabled, focus, loading, error, and success where applicable.
- Theme changes should remap semantic tokens; components should not require individual dark-mode overrides except for genuine exceptions.
- Include typography, spacing, motion, border, radius, elevation, and accessibility tokens—not only colour.
- Keep the component library small and composable. Add a new component only when a repeated pattern has a stable purpose.
- Document behaviour, content rules, accessibility, and responsive states alongside visual specifications.
- Prototype and test token decisions in real Home, Flow, Deep Dive, and You screens before declaring them final.

## Decision test

Before approving a design or implementation, ask:

1. Does it make the next idea clearer or more inviting?
2. Does it preserve calm and sustained attention?
3. Is the content more prominent than the interface around it?
4. Does it work equally well for Tamil, Latin, mixed content, accessibility settings, and smaller screens?
5. Is the visual or motion choice purposeful enough to keep?

If the answer is no, simplify.
