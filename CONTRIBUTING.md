# Contributing to Soul Cat

Use Node 22.13+ and run `npm ci`. Start the local API with `npm run api` and the frontend with `npm run dev`. Without Turso environment variables, the app uses a local SQLite file.

Before opening a pull request, run `npm test` and `npm run build`. CI repeats both using a local database and no production credentials.

Source adapters should use a documented public feed or an official public adoption page. Add a small synthetic parser fixture, validate empty/error responses, keep unknown fields unknown, and whitelist only public listing fields. Never execute upstream scripts, bypass access controls, or commit complete source exports. Keep source URLs fixed on the server.

For interface changes, check keyboard navigation, mobile layout, empty results, unavailable sources and unavailable local storage. Use source-backed language: “last seen” means observed in a listing, not independently confirmed adoptable.

Open-source contributions license the code under MIT; third-party listing text and photographs retain their owners’ rights.
