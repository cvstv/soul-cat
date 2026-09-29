# Southwest source feasibility study

Research completed September 27, 2026. This is a bounded feasibility study and implementation proposal, not a deployed expansion or a completed reliability trial.

**Recommendation: expand by organization and publishing platform, starting with Tucson and Las Vegas.** Find adoption organizations in an area, identify their public listing system, configure an existing adapter where possible, and write a new adapter only when necessary. Users search the shared inventory by city/ZIP and radius. Their searches should not launch individual scrapers.

The strongest new evidence is a working shared listing interface: Hermitage in Tucson returned 148 cat records and Homeward Bound in Las Vegas returned 70, using the same Shelterluv format. Ten published profile URLs from each returned matching structured animal records. PACC supplied 30 cards on an initial page and ten accessible individual profiles; its total inventory was not measured. The Animal Foundation's cat-filtered directory reported 260 results; only its first 12 cards were read, with seven of ten detail requests succeeding before rate limiting. These are observations, not guarantees of current availability or complete regional coverage.

## What is finished

- Assessed all 12 Phoenix registry entries and five organizations each in Tucson and Las Vegas, including explicit access limitations.
- Examined the existing repository and saved inventory snapshot; produced a machine-readable source matrix and selected factual samples.
- Tested public listing/profile retrieval for four expansion candidates and documented blocked or cached-only evidence for the others.
- Specified the minimum architecture, implementation order, acceptance criteria, and subsequent seven-day reliability trial.

## What this does not establish

This study does not measure nationwide coverage, every cat in any city, adoption accuracy against shelter staff, or long-term uptime. Phoenix's current collectors are a working baseline, not a proven accuracy benchmark. Cached web results cannot establish today's availability. No source was activated, no production scan was triggered, and no account, credential, agreement, or deployment was created.

## Read in this order

1. [Findings](findings.md): evidence and the expansion decision.
2. [Source matrix](source-matrix.csv), also [JSON](source-matrix.json): all 22 assessed entries.
3. City detail: [Phoenix](phoenix.md), [Tucson](tucson.md), [Las Vegas](las-vegas.md).
4. [Architecture](architecture.md): collection, geography, accounts, normalization, and agent role.
5. [Pilot backlog and validation](pilot-backlog.md): actionable implementation and release gates.
6. [Provider requirements](provider-requirements.md): documented dependencies, without generalizing one provider's restrictions to others.
7. [Completion audit](completion-audit.md): what was verified and what remains conditional.

The next milestone is implementation of the scoped storage/job foundation and one Shelterluv adapter serving the two independently verified organizations. No further nationwide research phase is needed before that pilot.
