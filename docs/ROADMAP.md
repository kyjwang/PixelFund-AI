# 4-6 Week Senior Fullstack Hiring Roadmap

## Week 1: Runtime + Contract Baseline
- Deterministic runtime checks for Docker and non-Docker (`health:check`).
- CI gates enforce docs links, typecheck, unit, integration, and PR smoke E2E.
- REST/websocket contracts locked to shared schemas and validated in tests.
- Done means: green CI baseline and reproducible setup from clean machine.

## Week 2: Trading Correctness + Analytics
- Portfolio analytics parity in API/UI: realized, unrealized, total P&L.
- Trade ticket preview parity with backend expectations.
- Edge-case tests: repeated buys/sells, liquidation/re-entry, insufficient funds/shares.
- Done means: trading behavior is auditably correct with deterministic tests.

## Week 3: AI/Agent Explainability
- Specialist fallback behavior explicit when data is incomplete.
- Deterministic portfolio manager degradation path when specialists fail.
- UI deep-dive with confidence, reasons, and per-run timeline.
- Done means: recommendation output is explainable and defensible in interviews.

## Week 4: Product Polish + Accessibility
- Pixel-office micro-feedback and interaction clarity enhancements.
- Trading desk workflow polish: search, watchlist, history, mobile trade ticket.
- Accessibility baseline: labels, keyboard flow, contrast sanity checks.
- Done means: polished cross-device UX with no major interaction gaps.

## Week 5: Observability + Failure Readiness
- Structured request logs with requestId and latency.
- Queue/provider failure diagnostics and runbook playbooks.
- Validate stale quote and reconnect behavior under degraded conditions.
- Done means: production-minded reliability story with operational visibility.

## Week 6: Deployment + Showcase Packaging
- Stable deployed environment and production env matrix validation.
- Final CI matrix: PR fast path + main/nightly full desktop/mobile.
- Hiring artifacts: architecture narrative, demo script, limitations + next steps.
- Done means: public, interview-ready project and repeatable demo flow.
