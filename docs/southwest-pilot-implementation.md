# Southwest pilot implementation

This change is local repository work until reviewed and deployed. It does not activate a nationwide search.

## What it adds

- One Shelterluv collector configured for Hermitage (Tucson, public organization 38723) and Homeward Bound (Las Vegas, public organization 5575). It reads the public widget array, requires cat species, unique organization-prefixed IDs and exact Shelterluv profile links, and saves only selected public fields. The saved public responses from the September 27 study parsed as 148 and 70 cats.
- A rescue-area city value for the new listings. A Tucson/Las Vegas city filter can include cats whose individual placement is unknown; cards say the cat's location is unconfirmed. This is **not** a mileage search or a verified cat coordinate.
- Scope memberships around the existing cats table. A complete scope can mark a cat absent only when no other scope still lists it. Existing listed cats are backfilled once into their legacy scope. Failed source reads keep previous listings.
- Durable `scan_jobs` with one active scan, a five-minute shared cooldown, worker leases and token-based completion. The public API enqueues work; a signed Netlify background function executes it. The scheduled function dispatches that same job path. The UI polls while work is queued/running.

## Local and Netlify setup

Local `npm run api`/`npm run dev` uses a local SQLite file only when Turso environment variables are absent. Keep `.env` ignored. Do not point local exploratory scans at a production database. `npm test` and `npm run build` require no database credentials or live shelter requests.

On Netlify, keep existing `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` server-side. `SCAN_WORKER_SECRET` is optional but recommended as a separate random secret; when absent, the worker uses the server-side Turso auth token for job signing. Never put either token in the frontend or Git. Netlify's published background-function documentation supports `config.background: true` on credit-based Free plans; check actual account usage before increasing frequency.

The background worker is available at `/.netlify/functions/scan-worker`. It requires an HMAC signature from the API/scheduler. Netlify acknowledges invocation with HTTP 202 before processing finishes, so the app reports durable job status via inventory polling. A failed dispatch marks an unclaimed job failed; an abandoned queued job expires after two minutes. The worker's job lease is sixteen minutes, beyond Netlify's fifteen-minute background execution cap.

## Verification performed

- `npm test`: full suite, including overlapping scope reconciliation, repeated migrations, worker claim/fencing/cooldown, exact listing identity, malformed records and city fallback.
- `npm run build`: TypeScript and Vite production build.
- Bundled both new/scheduled Netlify function entrypoints with the project's esbuild dependency.
- Parsed the saved public Shelterluv samples for both configured organizations without modifying the production database.

## Next implementation gates

The pilot still needs a staged Netlify deployment and observed job completion before the new sources should be called live. The current scan is one durable **global** job; source-level jobs and rate limits remain the next scaling step. City/ZIP radius, canonical breed/pattern filters, PACC and Animal Foundation adapters, accounts/saved searches, and the seven-day reliability trial remain in the research [backlog](research/southwest-source-feasibility/pilot-backlog.md). Do not claim comprehensive Southwest inventory until those adapters and coverage checks are validated.
