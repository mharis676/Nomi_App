# Security

Server mode authenticates access tokens by calling the configured Supabase Auth service's `getUser`. It then reads the current active profile and role from PostgreSQL. A client-supplied role is never accepted. Users cannot create profiles or change their roles through the API. Password resets and account provisioning are administrative/provider workflows.

OWNER can perform all application operations; STAFF can create/update customers and catalog items, confirm orders, revise invoices, and record payments; VIEWER has operational read access. Cancellation, refunds and business settings require OWNER. Only OWNER receives audit records. All users belong to the one business workspace; deployments requiring tenant separation need a separate isolation design.

Financial APIs validate fields and amounts on the server, recalculate line totals, lock the workspace row, compare its revision, and atomically persist records, ledger changes and actor-attributed audit entries. Durable request UUIDs and payload fingerprints protect retries. Concurrent stale writes return 409; the browser fetches current records and asks the user to review before resubmitting. Database storage errors roll back the full transaction. Opening balances cannot be rewritten through customer edits; refunds cannot exceed available credit.

Browser roles have no direct access to financial or state tables. Use the restricted server database role from `server/runtime-role.sql`; database administrator credentials are required for migrations and recovery only. Never publish `DATABASE_URL`, database passwords or service-role keys. The application uses the public Supabase key and does not require a service-role key.

The server applies security headers/CSP, input-size limits, rate limits, same-origin checks for browser mutations, no-store API responses, static asset caching and database timeouts. HTTPS and correct proxy configuration are deployment requirements. Browser business data is held in memory; authentication session storage is scoped to the current tab. Sign-out clears the local session and cached records. Browser-local demo mode must be explicitly enabled and cannot be served by the production server.

Backups contain sensitive records and require encryption/access controls. Administrators can modify the underlying database and restore old snapshots; the application audit is not a cryptographically tamper-proof external audit system. Use external audit retention if the business requires it.

Local tests cover PostgreSQL transaction and role boundaries plus a browser journey with a test identity service. Actual Supabase settings, email delivery, account recovery, public HTTPS behavior and managed backups must be verified in staging before launch.
