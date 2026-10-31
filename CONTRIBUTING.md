# Contributing

Use Node 22.16 or later. Run `npm ci`, then `npm run check`. The default app uses local storage without login. Run `npm run dev`, or `npm run build` followed by `npm start`.

Install Chromium with `npx playwright install chromium`. Run `npm run test:e2e:local` for the default local-storage desktop/mobile workflows and `npm run test:e2e` for demo UI/accessibility coverage. On Windows, set `PW_CHANNEL=chrome` to use an installed Chrome. These tests use mobile emulation, not physical devices or Safari. Stop existing servers on the test ports before running them. Reports retain traces/screenshots on failure.

For optional server-mode checks, use an isolated PostgreSQL database. Run `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f test/integration/bootstrap.sql` only against that test database, then `npm run db:migrate` and apply `server/runtime-role.sql`. Set `TEST_DATABASE_URL` and run `npm run test:integration` and `npm run test:e2e:server`. These tests replace test data and must never target production. The server browser tests use a local test identity service with the real API/database and restricted runtime role.

GitHub Actions runs on pushes to every branch, pull requests and manual dispatch. Commit `.github/workflows/ci.yml` together with all related source, test and package changes before pushing. An untracked local workflow cannot run on GitHub. Once it is on the default branch, choose Actions > Quality checks > Run workflow for manual execution.

Require both quality and database jobs in branch protection. Dependabot proposes updates. No automatic deployment is configured. Real Supabase and staging requirements apply only to explicitly enabled server mode.

PRs should describe user-visible behavior, provide relevant desktop/mobile evidence and identify migration/recovery impacts. Do not modify applied migrations; add new migrations so checksum verification remains meaningful. Keep credentials and customer backups out of Git and artifacts.
