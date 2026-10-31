# Architecture

The default is a browser-local workspace with no authentication. It uses one atomic local-storage snapshot per save and hash routes for static hosting. Explicit demo and server modes are also available. `VITE_DATA_MODE=demo` runs the original browser-local sample workspace. Server mode is optional and requires a configured Supabase project and the Node API; there is no automatic fallback to browser data.

## Server mode

- React renders the UI and keeps the latest authorized workspace snapshot in memory. All mutations are asynchronous HTTP API calls, and pages wait for server confirmation before closing forms or navigating. Route changes refresh records; initial loading and retry errors are visible.
- Supabase Auth supplies email/password sessions. The API calls `getUser` for the bearer token, then checks the current active profile in PostgreSQL for its role. The client cannot assign roles. Only the tab-scoped session is persisted in browser session storage; customer and financial records are not persisted locally.
- `server/validation.ts` validates operation envelopes and fields. `server/operations.ts` enforces roles, locks the state row, checks its revision, runs the domain calculations, records a durable request result, and commits the snapshot plus audit history together. A failed write rolls back. Retrying the same UUID and normalized payload returns the original result; conflicting retries and stale revisions are rejected.
- `src/services/ledger.ts` is the shared calculation and ledger engine. Its production instance is created with a cloned server snapshot and actor ID for each transaction. Client-provided totals are recalculated. The production browser calls only the API for mutations; local changes cannot alter the stored ledger.
- The canonical database tables are `application_state` and `application_requests`. They implement a single-business aggregate with serial writes. Original relational domain tables remain in the migration history, but are not written by this implementation. Browser database privileges are revoked. The restricted runtime role has explicit grants and RLS policies for the state/request tables and profile reads, without DELETE or profile-write permission.
- Audit history is part of the committed state, with actor IDs from authenticated server context. Only owners receive it. This is application-level history, not an externally tamper-proof audit archive.

## Limits and operations

This design supports one trusted business workspace per deployment; all profiles share its records. It loads full snapshots and serializes writes, making database concurrency straightforward at small-business scale. Benchmark the intended volume and traffic before using large datasets; a paginated/normalized data service would be appropriate if volume outgrows the snapshot model. Currency is PKR.

The Node server serves static assets and API on the same origin, applies security headers and request/rate/time limits, and checks build configuration at startup. A demo build or mismatched Supabase URL is rejected. The deployment supplies HTTPS, database TLS, health monitoring, account provisioning, backup scheduling and provider-level recovery.

The migration runner is ordered, checksummed and locked. Backup exports use a consistent database snapshot and include retry history. Restore requires matching migrations and replaces state/request history in a transaction. See DEPLOYMENT.md and BACKUP_AND_RESTORE.md for setup and launch requirements.

## Verification

Domain tests cover financial behavior. PostgreSQL integration tests cover authorization, retries, concurrent edits, transaction rollback, least-privilege runtime access and backup/restore. Browser tests cover desktop/mobile demo flows and a server-backed journey through the real API/database with a local identity fixture. Real provider credentials and staging configuration remain deployment validation steps.
