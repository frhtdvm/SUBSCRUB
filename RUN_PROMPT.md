# Emergent Run Prompt

Read these files first:
- docs/PRODUCT_SPEC.md
- docs/STATUS.md

Build the full production-ready SubScrub mobile app exactly according to docs/PRODUCT_SPEC.md.

## Core Instructions
- This is not an MVP.
- Do not reduce scope.
- Do not stop after a foundation or Phase 1 shell.
- Use the fixed stack from PRODUCT_SPEC.md.
- Preserve mobile-first architecture.
- Keep the app production-oriented in structure and code quality.

## Execution Rules
- Work in staged steps internally to avoid context loss.
- But keep building until the full production product is implemented.
- Do not postpone in-scope production features into a fake backlog.
- Do not replace required features with placeholders unless absolutely blocked.
- If blocked by missing third-party credentials, keep the real architecture and implement Demo Mode fallback without breaking the product structure.

## Hard Constraints
- no analytics
- no tracking
- no recurring billing
- no custom backend for user financial or email data
- no sensitive logs
- no scope drift
- no stack changes

## Integrations Rule
For Plaid, Gmail, Outlook, and RevenueCat:
- keep clean interfaces
- keep real integration structure
- use fallback behavior only when credentials are unavailable
- do not remove the production integration path

## Output Quality
Prefer:
- complete flows
- production-ready navigation
- working repositories and data models
- deterministic engine code
- testable modules
- clear env handling
- safe defaults
- minimal but real UI polish aligned with the product theme

Avoid:
- mock-only architecture
- temporary hacks
- TODO-only critical paths
- fake purchase gating
- fake cancellation flow
- demo-only app structure

## Completion Rules
When finished:
1. update docs/STATUS.md
2. list changed files
3. list any remaining blockers only
4. stop
