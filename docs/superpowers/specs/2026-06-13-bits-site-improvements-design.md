# BITS digital studio — site improvements design

**Date:** 2026-06-13
**Status:** Approved (overall structure), pending detailed-section approval

## Context

The site is a single self-contained `index.html` (~36KB, embedded CSS + JS, zero dependencies beyond web fonts). It markets BITS, an AI product studio in Tokyo, with a dark "bit-grid" design system: a particle-canvas hero that assembles "BITS", three work cards (Immersia, Sentinel, "What's next"), a capabilities grid, a thin manifesto, and a `mailto:`-only contact CTA.

It is well-crafted on the front end but functionally incomplete: every "View case study" / "Request access" link points to `#contact`, there is no working contact path beyond a bare `mailto:`, no proof the products are real, and no `og:`/Twitter share metadata.

## Goals

Turn the beautiful shell into something that functions, while preserving the zero-dependency single-file architecture and on-brand aesthetic.

1. Fix the functional gaps (dead links, contact path, missing share metadata).
2. Add real, honest content — products are **real but early/private**.
3. Demonstrate technical expertise via an **on-brand SVG showpiece** (no three.js, no WebGL).
4. Improve the UI polish throughout.

## Decisions (locked)

| Question | Decision |
|---|---|
| Product reality | **Real but early/private** — honest case studies, gated access, softened status badges |
| Technical showpiece | **SVG-only, on-brand** — extend the existing path-drawing language; no three.js/WebGL; zero new dependencies |
| Structure | **Single page, richer** — stays one self-contained `index.html` |
| Contact path | **Form via service** — on-brand form POSTing to a no-backend service (Formspree / Web3Forms). Endpoint is a single clearly-marked JS constant. Client-side validation + success/error states. Email shown as fallback. |
| Case-study links | **Expandable on-page panels** — "View case study" expands a rich in-page section (problem, approach, SVG architecture/process diagram, honest status). "Request access" routes to the form. |
| New sections | How we build (process), Approach + Studio (**merged**), FAQ / engagement |

## Non-goals (YAGNI)

- No build step, framework, bundler, or package manager.
- No three.js / WebGL.
- No multiple HTML pages (single-page only).
- No backend — the form relies on a third-party no-backend endpoint.
- No real analytics integration unless trivially added later.

## Page architecture & scroll narrative

Story arc: **what we make → proof it's real → how we build → who we are → how to work with us.**

1. **Nav** — add anchors for new sections ("How we build", "Approach"); keep honest to real sections.
2. **Hero** — keep particle showpiece; light copy polish; **fix the fictional Tokyo coordinates** (`35.7288° N, 139.2941° E` currently lands in the mountains west of the city — use central-Tokyo coordinates).
3. **Marquee** — keep as-is.
4. **Work** — 3 product cards with **expandable case-study panels** (Immersia, Sentinel). **Soften status badges**: "Live" → "Private beta", "In beta" → "In development" (or similar honest phrasing). "What's next" keeps "In the lab".
5. **How we build** *(NEW)* — the on-brand **animated, scroll-driven SVG pipeline** (Research → Prototype → Ship). Primary technical-expertise showpiece. Reuses the existing `stroke-dashoffset` draw-on technique already proven in the Sentinel sparkline.
6. **Capabilities** — keep; lightly expanded.
7. **Approach / Studio** *(MERGED)* — one confident section combining the studio's point of view ("AI that feels less artificial", explainability, simplicity) with who they are / how they work. Replaces the thin standalone manifesto.
8. **FAQ / Engagement** *(NEW)* — how engagements work, what they take on, what to expect (timelines/model). Qualifies inbound leads before the form.
9. **Contact** *(REBUILT)* — real on-brand form (endpoint constant), validation, success/error states; visible email fallback.
10. **Footer** — links updated to match new sections.
11. **`<head>`** — add Open Graph + Twitter Card meta tags so the site shares as a rich card, not a bare link.

## Editorial note

"Approach / principles" and "Expanded Studio/About" are **merged** into one section. Split apart they would be thin and repetitive back-to-back; merged they form one strong studio statement. All chosen content is preserved — just under one header rather than two competing ones.

## Detailed sections (to be expanded & approved before coding)

- **Section 2:** Expandable case-study panel mechanics + the "How we build" SVG showpiece (interaction model, accessibility, reduced-motion behavior).
- **Section 3:** Contact form (fields, validation rules, states, endpoint wiring).
- **Section 4:** Copy for new sections (Approach/Studio, FAQ, case-study bodies).

## Constraints carried from existing code

- Preserve accessibility patterns already present: `sr-only` h1, `aria-hidden` on decorative SVG, `:focus-visible` styles, `prefers-reduced-motion` handling. New interactive/animated elements must honor reduced-motion and be keyboard-accessible.
- Expandable panels must be operable by keyboard and expose state to assistive tech (`aria-expanded`, controlled region).
- Keep DPR-capped, off-screen-paused animation discipline established by the hero canvas.
- Single file; embedded `<style>` and `<script>`; no external assets beyond existing fonts and inline SVG.

## Success criteria

- No link points to a dead/placeholder anchor; every CTA does something real.
- Contact form validates and shows success/error states; wiring an endpoint is a one-line change.
- Site shares as a rich card (OG/Twitter tags present).
- Status badges are honest about real-but-private products.
- New SVG showpiece animates on scroll, degrades gracefully under reduced-motion, adds no dependencies.
- File remains a single self-contained `index.html`.
