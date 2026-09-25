# Riftline

A League of Legends **balance observatory and build lab**: every champion's stats and abilities across patches, charted — plus a playground that computes your build's damage and projects it through patch history.

> **Status:** pre-alpha — Phase 0 (de-risking spike). Roadmap in [PLAN.md](./PLAN.md).

## What it will do

- **Champion explorer** — stats and abilities for all champions, per patch, backed by Riot's Data Dragon.
- **Balance history** — time series of base stats (all champions) and ability values (curated set) across patches, with patch-date markers.
- **Build playground** — items + skill ranks + level → computed damage per ability and per combo; shareable by URL; projected across patch history.

## Engineering pillars

- **Data honesty:** three trust tiers, zero fabricated numbers — unresolved upstream data renders as an explicit gap, never a fake value ([ADR-001](./docs/adr/ADR-001-data-sourcing-and-trust-tiers.md), [ADR-002](./docs/adr/ADR-002-ability-formula-model.md)).
- **Snapshot pipeline:** Riot data is ingested, validated, and committed as versioned JSON; a daily job opens a reviewed PR when a new patch ships ([ADR-003](./docs/adr/ADR-003-snapshots-and-rendering.md)).
- **Budgets in CI:** Lighthouse performance/accessibility and bundle-size budgets fail the build on regression.
- **Componentized UI:** design tokens + accessible components in `packages/ui`, documented in a published Storybook with interaction tests and visual regression ([ADR-004](./docs/adr/ADR-004-ui-component-strategy.md)).
- **Telemetry in public:** [`/stats`] shows the site's own real-user Core Web Vitals.

## Stack

Next.js (App Router) · TypeScript · zod · pnpm workspaces (`apps/web`, `packages/schema` · `engine` · `pipeline` · `ui`) · Storybook · Vitest + Playwright · GitHub Actions · Vercel.

## Docs

[PLAN.md](./PLAN.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [docs/adr](./docs/adr) · [CLAUDE.md](./CLAUDE.md)

## Legal

Riftline was created under Riot Games' "[Legal Jibber Jabber](https://www.riotgames.com/en/legal)" policy using assets owned by Riot Games. Riot Games does not endorse or sponsor this project. Non-commercial fan project.

## Author

Jorge Oliveira — [GitHub](https://github.com/jorgeoliveira117) · [LinkedIn](https://www.linkedin.com/in/jorge-am-oliveira)
