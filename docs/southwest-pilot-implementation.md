# Southwest pilot implementation

This change is local repository work until reviewed and deployed. It does not activate a nationwide search.

## What it adds

- One Shelterluv collector configured for Hermitage (Tucson, public organization 38723) and Homeward Bound (Las Vegas, public organization 5575). It reads the public widget array, requires cat species, unique organization-prefixed IDs and exact Shelterluv profile links, and saves only selected public fields. The saved public responses from the September 27 study parsed as 148 and 70 cats.
- A rescue-area city value for the new listings. A Tucson/Las Vegas city filter can include cats whose individual placement is unknown; cards say the cat's location is unconfirmed. This is **not** a mileage search or a verified cat coordinate.
- Scope memberships around the existing cats table. A complete scope can mark a cat absent only when no other scope still lists it. Existing listed cats are backfilled once into their legacy scope. Failed source reads keep previous listings.
- Durable `scan_jobs` with one active scan, a five-minute cooldown, worker leases and token-based completion. The scheduled function enqueues work and invokes a signed Netlify background function. The public API only reads inventory; opening or reloading the page never scans source sites. The UI polls while a known job is queued or running.

## Local and Netlify setup

Local `npm run api`/`npm run dev` uses a local SQLite file only when Turso environment variables are absent. Keep `.env` ignored. Do not point local exploratory scans at a production database. `npm test` and `npm run build` require no database credentials or live shelter requests.

On Netlify, keep existing `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` server-side. `SCAN_WORKER_SECRET` is optional but recommended as a separate random secret; when absent, the worker uses the server-side Turso auth token for job signing. Never put either token in the frontend or Git. Netlify's published background-function documentation supports `config.background: true` on credit-based Free plans; check actual account usage before increasing frequency.

Before deploying, add `SOULCAT_SCAN_ENABLED=true` in the Netlify site environment variables for the **Production deploy context only**. Leave it unset for Deploy Previews and branch deploys. Include Functions runtime access if Netlify offers scope selection. Netlify exposes `SITE_ID` to functions at runtime, but `CONTEXT` and `NETLIFY` are build-time values; the app uses `SITE_ID` to identify hosted functions and requires this explicit setting before any hosted scan. Previews cannot start scans against a potentially shared production database; viewing inventory there also requires Netlify access and database credentials in that deploy context. Local development without Netlify runtime variables can use its own SQLite file.

The background worker is available at `/.netlify/functions/scan-worker`. It requires an HMAC signature from the API/scheduler. Netlify acknowledges invocation with HTTP 202 before processing finishes, so the app reports durable job status via inventory polling. A failed dispatch marks an unclaimed job failed; an abandoned queued job expires after two minutes. A running worker renews a 45-second lease every 15 seconds. If it crashes, Netlify's background retry can reclaim that lease; stale running jobs are marked failed after a three-minute grace period. Background scans use the job lease as their lock and check its token inside each source write, so a retry is not blocked by an abandoned legacy scan lock. Direct local scans retain the separate scan lock.

## Verification performed

- `npm test`: full suite, including overlapping scope reconciliation, repeated migrations, worker claim/fencing/cooldown, exact listing identity, malformed records and city fallback.
- `npm run build`: TypeScript and Vite production build.
- Bundled both new/scheduled Netlify function entrypoints with the project's esbuild dependency.
- Parsed the saved public Shelterluv samples for both configured organizations without modifying the production database. A direct collector read on September 28 at about 03:17 UTC returned 148 Hermitage cats and 66 Homeward Bound cats, with matching unique IDs and exact profile URLs in each response. The count change from the study's 70 Homeward Bound cats shows why results must carry check times.
- GitHub CI and Netlify's Deploy Preview build passed for draft PR #1. The current Netlify project is private; an unauthenticated read of the preview inventory API returned HTTP 401, so the preview has not demonstrated live inventory or scan completion.

The live check also found that one of Shelterluv's advertised DNS targets presented a certificate for another host, while another target passed TLS verification. The collector now retries transient network failures up to twice with TLS verification still enabled. This can improve intermittent reads; it cannot repair the provider's certificate, so a failed check retains prior listings and shows source failure.

## Next implementation gates

The pilot still needs a staged Netlify deployment and observed job completion before the new sources should be called live. The current scan is one durable **global** job; source-level jobs and rate limits remain the next scaling step. City/ZIP radius, canonical breed/pattern filters, PACC and Animal Foundation adapters, accounts/saved searches, and the seven-day reliability trial remain in the research [backlog](research/southwest-source-feasibility/pilot-backlog.md). Do not claim comprehensive Southwest inventory until those adapters and coverage checks are validated.
