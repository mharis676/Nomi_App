# Deployment

**Default local mode:** run `npm run build` and publish `dist/` to a static host, or use `npm start` locally. No login, database or Supabase setup is needed. Routes use URL hashes for static-host compatibility. The instructions below apply only to optional `VITE_DATA_MODE=server`.

## Architecture and constraints

Deploy the Node server and compiled frontend together, behind HTTPS. Use a Supabase project for Auth and the PostgreSQL database in that same project. This application supports one trusted business workspace per deployment. Every active profile can read that workspace's operational records; roles restrict writes and audit access. It is not a multi-tenant SaaS isolation model.

The canonical financial store is `application_state`, a PostgreSQL JSONB snapshot, with `application_requests` holding durable request results. The application server locks the workspace row, validates and calculates changes using the domain engine, writes the new snapshot and request result, and commits once. All writes are serialized. This favors correctness for a small business; snapshots are loaded as a whole. Benchmark expected data volume before onboarding large historical datasets. The older relational tables are retained for migration compatibility and are not a second active ledger.

## Configure and initialize

1. Create a Supabase project. Disable public account signup in its Auth settings; create/invite staff through the administrator dashboard. Set the production site URL and permitted password-reset redirects. Enable provider protections appropriate to the business.
2. Configure `.env` using `.env.example`. The `VITE_*` URL and public key are build-time public configuration. `SUPABASE_URL` must exactly match the built frontend's URL. `DATABASE_URL` is server-only and must target the same project. Keep database passwords and administrative keys out of the frontend and GitHub artifacts. Use verified TLS for hosted PostgreSQL connections.
3. With administrator `DATABASE_URL`, run `npm run db:migrate`. The runner applies ordered migrations in transactions, records checksums, and uses an advisory lock. Back up an existing installation first. A database with pre-existing legacy financial records requires a reviewed import; the runner refuses automatic adoption. Manually applied old schemas also need their migration history reconciled before using this runner.
4. After creating a Supabase Auth account, insert a profile using that account's actual UUID in the SQL editor:

```sql
INSERT INTO public.profiles(id, full_name, role)
VALUES ('actual-auth-user-uuid', 'Business owner', 'OWNER');
```

Use STAFF for daily operations and VIEWER for read access. Role assignment is administrative. To disable an account immediately, set `profiles.is_active=false`; every API request checks this flag. Profiles are not created automatically from user-controlled metadata.

5. Run `server/runtime-role.sql` as an administrator to create the restricted `carry_runtime` role. Set its password through the administrator's secure password workflow (for psql, `\password carry_runtime`). Use this account in the deployed server's `DATABASE_URL`. Its access is limited to profile reads, state reads/updates and request-history reads/inserts. Migration, backup, restore and account administration use separate administrator credentials.
6. Set `APP_ORIGIN` to the exact public HTTPS origin. Configure `TRUST_PROXY_HOPS` only for a known proxy topology; do not enable broad proxy trust. Default port is 3000. Terminate HTTPS at the hosting platform or trusted reverse proxy.
7. Run `npm ci`, `npm run check`, and database/browser checks in staging. Run `npm run build` with server-mode frontend configuration, then `npm run start:server`. The server rejects a demo build or mismatched Supabase URL. An uninitialized/unreachable database makes `/healthz` return 503.

For local development with Vite, use the exact Vite browser origin for `APP_ORIGIN` (for example `http://127.0.0.1:5173`) and run the API on port 3000. The production deployment serves both on the same origin and requires no CORS wildcard.

## Container

Build using the public values only:

```sh
docker build --build-arg VITE_SUPABASE_URL=https://your-project.supabase.co --build-arg VITE_SUPABASE_ANON_KEY=public-key -t carry-charges .
docker run --env-file .env -p 3000:3000 carry-charges
```

The image runs as an unprivileged user. Database migrations are an explicit administrator step before starting the service; they do not run with elevated credentials inside the application process. The container image has not been built locally because Docker's daemon is unavailable in this workspace.

## Launch and recovery

Verify real Supabase login/logout, role removal and disabling, a complete invoice/payment/revision/cancellation workflow, two simultaneous staff sessions, PDF downloads, and a database backup/restore in staging. Confirm browser HTTPS/CSP behavior at the actual public hostname. Run a representative data-volume check for the snapshot model. Configure hosting health checks, error monitoring and an encrypted scheduled backup destination; test restore before launch. Set GitHub branch protection to require both quality and database checks.

Deploy a retained image/build with matching migrations. Financial migrations require a forward fix or a coordinated restore with all writers stopped; reverting frontend files alone does not roll back financial data. Do not migrate existing demo browser records automatically. Reconcile and import historical records explicitly with owner review.
