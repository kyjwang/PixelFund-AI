# Performance Playbook

## Goals
- Fast first paint and responsive interaction on desktop/mobile.
- Stable realtime behavior without request storms.
- Interview-ready evidence of performance engineering tradeoffs.

## Implemented Optimizations
- Replaced render-blocking Google CSS font import with `next/font` + `display: swap`.
- Added request throttling for websocket-triggered data refresh bursts.
- Added abortable ticker search requests to prevent stale network responses.
- Added reduced-motion support for animation-heavy surfaces.

## Suggested Measurement Workflow
1. Run local production build:
   - `npm --workspace @pixelfund/web run build`
   - `npm --workspace @pixelfund/web run start`
2. Run Lighthouse for mobile and desktop on `http://localhost:3000`.
3. Track these metrics:
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Total Blocking Time (TBT)
   - Cumulative Layout Shift (CLS)
4. Save before/after screenshots and scores for portfolio evidence.

## Guardrails
- Keep socket reconnect and refresh behavior debounced/throttled.
- Avoid adding heavy client-side dependencies without profiling impact.
- Prefer schema validation boundaries without duplicating expensive work in render loops.

## Next Performance Steps
- Add route-level code splitting for heavy optional UI sections.
- Add optional virtualization if recommendation history grows large.
- Capture web-vitals to backend logs for real-world performance tracking.
