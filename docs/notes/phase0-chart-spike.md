# Phase 0 chart spike — ECharts vs `@elastic/charts`

- **Date:** 2026-09-25 · **Timebox:** 2 h (PLAN §4) · **Decides:** ARCHITECTURE §13 "Chart library"
- **Recommendation:** **ECharts** (the default). The maintainer confirms.

## Setup

- Both libraries render the same real T1 series: Briar `hpperlevel` across the 30 most recent ddragon versions (15.14.1 → 16.19.1), with markers at the two versions where it changed (16.3.1: 95→100; 16.9.1: 100→95). Patch dates arrive in Phase 2, so the x-axis is categorical by version.
- Versions: `echarts@6.1.0` tree-shaken via `echarts/core` (line chart, grid, tooltip, markLine, aria, SVG renderer), and `@elastic/charts@73.2.1` with React 18.
- Bundles were built with esbuild (minified, production) and gzipped with `-9`.
- Pages were checked in headless Chromium with Playwright and axe-core 4.13 (WCAG 2.0/2.1/2.2 A/AA plus best-practice).
- The harness was throwaway and is not committed; screenshots are not committed either (no binaries in git).

## Results

| | ECharts | @elastic/charts |
|---|---|---|
| JS, gzipped | **182 kB** | **414 kB** on top of React (459 kB including React 18) |
| Largest contributors | echarts 337 kB + zrender 179 kB (raw) | @elastic/charts 780 kB, **moment-timezone 715 kB**, luxon 73 kB, moment 62 kB (raw) |
| CSS | none | 5 kB gzipped theme |
| Peer dependencies | none | **React ^18 only**, `moment`, `moment-timezone`. Current Next.js runs on React 19. |
| Framework coupling | none: plain DOM, so `packages/ui`/Riftforge can use it outside React | React only |
| Renderer | SVG (chosen) or canvas | canvas |
| axe violations (isolated page) | 0 | 0 |
| Accessible name / summary | `role="img"` + `aria-label` from `aria.description`; the SVG text (axes, labels) is exposed | `figure` with description + "Chart type: line chart" summary |
| Keyboard | nothing focusable | annotation markers are focusable (first Tab lands inside the chart) |
| Data-table fallback | none built in | none built in |
| Reduced motion | manual: `animation: !matchMedia('(prefers-reduced-motion: reduce)').matches` (verified static under emulation) | static under emulation |
| Step series (ADR-002: values are step functions) | native `step: "end"` | linear by default in this config (step curve not tested) |

## Reading

- **Budget:** chart routes are lazy islands with their own budget (ARCHITECTURE §9). ECharts' 182 kB fits that model; Elastic at 414 kB plus React would dominate it, and nearly half of that is timezone data we don't need.
- **Compatibility:** Elastic's React ^18 peer range conflicts with a current Next.js App Router, and forcing it means running unsupported. That alone is disqualifying for now.
- **Accessibility:** neither library gives us the data-table fallback or text summary that ARCHITECTURE §10 requires. That's by design the job of `packages/ui`'s `ChartFrame` (ADR-004), whichever library we pick. Elastic's keyboard-focusable annotations are nicer, but they don't close that gap.
- **Reuse:** ECharts' framework independence fits ADR-004's non-React second consumer (the Riftforge HUD).

## Follow-ups (Phase 3)

- **Bundle size:** measure ECharts' canvas renderer and a line-only build; the 182 kB figure includes the aria and markLine components.
- **Server rendering:** ECharts supports it (`ssr: true` with the SVG renderer). It's worth a look for a no-JS first paint, but it wasn't tested here.
- **Y-axis:** `yAxis.scale: true` exaggerates small deltas (95↔100 fills the plot). Decide the axis policy together with the DeltaChip/trust visuals.
