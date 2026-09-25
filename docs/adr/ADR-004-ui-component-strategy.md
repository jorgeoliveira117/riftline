# ADR-004: UI component strategy and design-system scope

- **Status:** Proposed — accept (or amend) by the end of Phase 1 (first components in production)
- **Date:** 2026-07-17
- **Owner:** Jorge Oliveira

## Context

Riftline's UI has unusually systematic needs: recurring data-honesty states (trust and freshness badges, value deltas), dense stat tables, per-patch diff presentation, and keyboard-first playground controls. The same visual language is planned for a second consumer — Riftforge's HUD and menus (PLAN §7) — which runs partly outside React, as DOM overlays on a Three.js canvas.

The classic failure mode must be named: a "design system" with a single consumer and unbounded ceremony is over-engineering. Two things counter it here: a concrete second consumer, and a capped scope — this is a small, documented component layer with system-grade discipline, not an aspiring general-purpose library.

## Decision

- **`packages/ui`** holds design tokens and accessible React components, developed component-first in Storybook and consumed by `apps/web`.
- **Tokens are CSS custom properties** (color, space, type scales; domain palettes for damage types and trust/freshness states), exported as a stylesheet and mirrored as TS constants. No framework assumption — a plain-DOM overlay can consume them, which is what makes Riftforge a real second consumer.
- **Styling is CSS Modules over the tokens.** Zero runtime styling cost, compatible with the performance budgets (ARCHITECTURE §9).
- **Hard widgets use React Aria hooks** (Slider, Stepper, Combobox, Tooltip — where correct semantics and keyboard behavior are genuinely difficult); simple components are hand-rolled. Accessibility effort goes where it's needed rather than being re-derived from scratch everywhere.
- **Dependency direction is one-way:** `packages/ui` imports nothing from `apps/*` or the data packages. Charts remain app-side; `ui` ships the `ChartFrame` shell (caption, data-table fallback, reduced-motion handling).
- **Quality gates:** every component ships with stories covering its meaningful states; the Storybook a11y addon and interaction tests (test-runner) run in CI; visual regression gates PRs (tool decided in Phase 5 — ARCHITECTURE §13).
- **Published workshop:** the static Storybook deploys as its own site, linked from the README and footer.
- **Inventory is capped at ~15 documented components for v1**, distinctive ones first: `TrustBadge`, `DeltaChip`, `VersionSwitcher`, `StatTable`, `AbilityCard`, `ChartFrame`, and the playground controls. The site is the demo; Storybook is the workshop.
- **Rollout:** a thin seed in Phase 1 (tokens + ~6 primitives, Storybook local-only) so the launch date is never hostage to component polish; the hardening pass is Phase 5.

## Alternatives considered

- **Tailwind as the styling layer** — rejected here: tokens would live in build config and components would be coupled to a Tailwind pipeline, while this package must be consumable by a non-Tailwind consumer (the game overlay). Fine tool, wrong fit for a token-and-state-centric shared package.
- **Runtime CSS-in-JS (styled-components/emotion)** — rejected: runtime styling cost works against the CI-enforced performance budgets, for no benefit CSS Modules + custom properties don't already provide.
- **Adopting a full component library (MUI, shadcn/ui, etc.)** — rejected: the point of this package is owning the component layer; a library would leave nothing to systematize except overrides.
- **Fully hand-rolling every widget** — rejected: re-deriving combobox/slider semantics from scratch is high-risk, low-yield; React Aria hooks provide the behavior while all visual and API decisions stay ours.
- **Building components inside `apps/web` and extracting "later"** — rejected: extraction pressure never wins against feature pressure; component-first from day one costs little in a monorepo.

## Consequences

- One additional deploy (the static Storybook) and additional CI time (story tests, visual regression) — bounded by the inventory cap.
- The v1.0 timeline absorbs a dedicated hardening phase (PLAN §3: Phase 5, with polish moving to Phase 6).
- Riftforge inherits tokens and interaction patterns instead of inventing a second visual language.
- The Storybook doubles as living documentation of the trust/freshness system — the product's central design idea is browsable as components.
