# QA report — 1 November 2026

## Local-storage configuration update

The app now defaults to a browser-local workspace without sign-in, Supabase configuration or API requests. New installs start empty; existing legacy browser records are preserved. Each financial operation is saved as one snapshot, with Web Locks serializing tab writes. Unit checks cover legacy record preservation and storage-quota failure without partial persistence. Local-mode desktop/mobile workflows cover customer/catalog creation, invoicing, payments and reload persistence. Local routes use hashes and relative assets for static hosting. Run `npm run test:e2e:local` for this workflow.

The Supabase, database and hosting requirements described below apply only to explicitly enabled server mode, not the default local-storage app.


## Scope and environment

Reviewed the React frontend, financial calculations, browser storage, database policies, package dependencies, and GitHub validation setup. Browser journeys ran locally in installed Chrome on Windows, at desktop and iPhone 13 viewport sizes. Demo browser tests use the compiled build through Vite preview; server-mode tests use the actual Node server and PostgreSQL with a local test identity service. Mobile emulation is not a physical iPhone/Safari test.

## Defects corrected

- Normal unit quantities were blocked by native form validation: `min=0.01` combined with `step=1` made quantity 1 invalid. Unit quantities now start at 1; weight quantities retain decimal limits.
- Excessive discounts crashed order creation and invoice editing during rendering. Both editors retain the page and explain invalid adjustments; order confirmation is disabled while totals are invalid.
- Payment submissions regenerated retry keys. The payment dialog now keeps one key for the current submission attempt.
- Payment storage now rejects missing, cancelled, and mismatched-customer invoices before writing. Conflicting reuse of a payment key is rejected.
- Non-finite quantities, rates, and adjustments are rejected by calculations.
- Dialogs lacked keyboard trapping, Escape handling, focus restoration, and scroll locking. A shared dialog component provides these behaviors.
- Inputs lacked associated labels; order item editors and invoice filtering lacked accessible names. Labels and accessible names were added.
- Low-contrast subtitles, table headers, secondary button text, and informational badges were corrected.
- Horizontally scrollable record tables now accept keyboard focus.
- Added skip navigation, visible focus, reduced-motion support, and a recoverable rendering error screen.
- Initial application JavaScript was about 809 kB. Pages, authentication vendor code and PDF tools now load in separate bundles. Bundle sizes depend on the configured operating mode; the checked builds do not report oversized chunks.
- Upgraded jsPDF, AutoTable, React Router, and Vitest after the dependency audit. Runtime dependency audit reported zero vulnerabilities. Development tooling still has moderate audit findings; no claim of a fully clean development dependency tree is made.

## Verified results

- ESLint and TypeScript: passed.
- Domain/local-storage tests: 32 passed across three suites.
- PostgreSQL integration tests: 10 passed, including rollback, stale/concurrent writes, idempotency, restricted runtime role and backup/restore.
- Compiled demo browser tests: 12 passed, covering desktop and mobile Chromium.
- Server-mode browser checks: 2 passed across targeted runs. The journey passed sign-in failure, sign-in, customer/catalog creation, invoicing, reload persistence, payment and sign-out against the actual API/database. External Supabase Auth is replaced by a local test identity service. A second API test verifies current STAFF/VIEWER permissions, disabled-profile rejection and invalid-token rejection through the actual middleware.
- Axe scans in those browser tests: no reported violations on the checked states.
- Production build: passed without oversized-chunk warnings.
- Runtime dependency audit: zero reported vulnerabilities.

## Repeatable checks

Run `npm run check` for ESLint, TypeScript, domain tests, and the production build. Run `npm run test:e2e` for browser validation. Tests cover all seven main pages, desktop/mobile navigation, accessibility scans, excessive-discount recovery, catalog-to-invoice confirmation, PDF download, reload persistence, payment recording, dialog dismissal/focus restoration, and viewer editing controls.

The browser checks include axe WCAG 2 A/AA and WCAG 2.1 AA tags on the seven primary pages and a populated order. These automated scans do not certify full accessibility or screen reader usability. Payment dialog keyboard behavior is checked; exhaustive dialog-content scans and real assistive technology review remain outside this pass.

Screenshots reviewed: `qa-artifacts/dashboard-desktop.png` and `qa-artifacts/dashboard-mobile.png`. Inspect browser failures using the Playwright HTML report and retained screenshots/traces.

## GitHub setup

`.github/workflows/ci.yml` runs quality checks, runtime dependency audit, demo Chromium tests, real PostgreSQL integration tests and the server-backed browser journey, and uploads both reports. Dependabot and a PR template are included. Branch protection must be configured in GitHub to require the quality job; no repository settings were changed remotely. No production deployment is enabled.

## Server implementation and remaining deployment validation

Server mode now uses Supabase email/password sessions and a Node API with current active-profile checks on every request. Roles are server-enforced. Financial writes are recalculated and committed atomically to a PostgreSQL workspace snapshot with durable request history and revision conflict protection. Browser business records stay in memory; tab-scoped session storage holds authentication only. Demo mode must be explicitly enabled, and the Node server rejects demo builds or a mismatched Supabase URL. A restricted runtime database role has been tested against real PostgreSQL, including denied deletion/profile updates. Migrations, backup/restore, health checks, headers, limits, container packaging and deployment instructions are included.

Locally verified on PostgreSQL 17. All ordered migrations were applied successfully, and the backup/restore test retained state and request retry history. Docker packaging is present but was not built: the Docker daemon is unavailable. GitHub workflows were prepared locally; they were not executed on GitHub and branch protection was not configured remotely.

**Optional server-mode launch requires deployment configuration and staging acceptance.** No live Supabase credentials or hosting target are available in this workspace. Actual Supabase account provisioning, password recovery, Auth configuration, HTTPS/CSP at the public hostname, hosted database TLS, production-volume checks, backup scheduling and provider-level recovery remain deployment checks. The browser identity fixture verifies integration behavior but does not certify a real provider tenant.

The persistence model supports one business workspace and serial writes, and loads full snapshots. Benchmark expected volume before launch. Existing browser-local or legacy relational records are not automatically imported; legacy database records trigger an import guard. A reviewed migration/reconciliation process is required if historical business records must be adopted.
