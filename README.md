# Soul Cat

An open-source cat adoption inventory. React + TypeScript, SQLite locally, Turso on Netlify. One collector powers **Scan now** and the app's own scheduled refreshes. No ChatGPT account or automation is required.

## Run locally

Requires Node 22.13+ and npm.

```sh
npm ci
npm run api
# In a second terminal:
npm run dev
```

Open the Vite URL. Click **Scan now**. The API writes `.data/soul-cat.db`, which survives restarts and is excluded from Git. No hosted database account is required. Local development does not automatically run the production schedule; use `npm run refresh` or your own scheduler.

## Deploy your own copy

1. Fork this repository and import the fork into Netlify. Build command: `npm run build`; publish directory: `dist`.
2. Create a database in Turso and a database-scoped read/write token.
3. Add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to Netlify's server environment variables, then deploy. Do not prefix secrets with `VITE_`. Restrict secrets to production/trusted deploy contexts where your plan supports it. Never run untrusted pull-request code with production credentials.
4. Open the site and click **Scan now**. Tables are created automatically. Both the button and scheduled function call `server/collector.ts`.

The production schedule is 8 AM, 1 PM and 5 PM America/Phoenix, represented in UTC in `netlify/functions/scheduled-refresh.ts`. Netlify only runs scheduled functions on published production deployments. If migrating from an unrelated ChatGPT reminder, turn that reminder off in ChatGPT yourself; this repository neither reads nor controls it.

## Coverage and limitations

The initial source registry targets Phoenix-area rescues. It is not a nationwide search service and does not claim access to every shelter. The coverage panel lists connected and pending sources explicitly. Add a provider in `server/providers/index.ts` to support another region or rescue; return the common `Listing` fields and add parser tests.

Only explicit shelter text confirms a coat. There is no automated visual coat classifier. Unknown fields remain unknown. Foster locations are not inferred from rescue headquarters. Shelter photos are linked externally and remain the property of their respective owners; the code license does not license their content. A source may cache its listings: our timestamp means when we read it, not a guarantee that the cat is still available.

Failed sources retain previous inventory. Listings absent from a successful full feed become `not_listed`, never automatically `adopted`. Exact source/animal IDs deduplicate repeat scans. Listings across different shelters are not merged by name because that can combine unrelated cats.

## Storage and security

Public reads expose only normalized adoption listings and scan summaries. There are no user accounts or private adoption applications. SQL writes are parameterized; upstream HTML is parsed as text and never executed. Collectors use fixed source URLs, timeouts and response-size limits. The browser never receives database credentials. The response security policy blocks scripts outside this app.

All visitors share a database-backed five-minute refresh cooldown. Refresh requires a same-origin POST, though origin checks alone are not authentication or complete abuse prevention. `PUBLIC_REFRESH_ENABLED=false` disables visitor scans while retaining scheduled updates. Free hosting tiers have usage limits; this app cannot guarantee unlimited free traffic.

The source fetches run in parallel and persistence uses transactions. Interrupted scans are labeled after two minutes; another scan is allowed after the five-minute cooldown. History keeps the latest 100 runs (the API returns 50). Removed listings are retained to preserve first/last seen history. Back up the database using Turso's SQLite export or copy the local database while the local server is stopped. Schedule token renewal before its expiration.

## Development

```sh
npm test
npm run build
npm run audit:production
```

`src/` contains UI and shared types. `server/providers/` contains adapters. `server/store.ts` handles database transactions. `server/api.ts` exposes inventory and refresh routes; Netlify wrappers are in `netlify/functions/`.

MIT licensed. Contributions adding documented public feeds and tests are welcome. Do not bypass source access controls or commit credentials, captured personal data, or third-party photo collections.
