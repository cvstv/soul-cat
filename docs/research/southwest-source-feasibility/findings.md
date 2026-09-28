# Findings and decision

## The idea is feasible; expand the directory of sources

The practical expansion unit is an organization with a defined public cat inventory. A city is a search area, not a separate copy of the collection system. A shelter can serve several cities, and a cat may appear on both its shelter site and an aggregator. Discover the organization once, collect it once, and let many searches use the result.

Two independently discovered organizations demonstrate platform reuse. [Hermitage](https://www.hermitagecatshelter.org/adopt/) publishes Shelterluv organization 38723; [Homeward Bound](https://www.homewardboundcats.org/adopt/) publishes organization 5575. Their public widget calls `/api/v3/available-animals/{organization}`. The research requests returned 148 and 70 unique cat records, respectively, each with a published individual URL. Ten details per organization returned structured animal records. This is evidence of a reusable public-widget adapter, not a promise that every Shelterluv customer enables it or that its interface is permanently supported.

[PACC's official cat page](https://www.pima.gov/browse-shelter-cats) links to a scoped 24Petconnect listing. The sampled profiles have source IDs and exact links; the source states a 15-minute refresh cadence. Our saved first page has 30 cards, not a proven total. [The Animal Foundation](https://animalfoundation.com/what-we-do/adoption/adopt-a-pet/) has a custom WordPress directory: its cat filter reported 260 entries, but detail reads hit HTTP 429 after seven successes. This makes request limits and incremental enrichment concrete requirements.

## The Phoenix baseline needs improvement before it is an accuracy target

The saved production inventory contains 2,117 retained records: 1,758 marked listed and 359 not listed. These are source listings, not deduplicated cats. Nine sources reported a successful latest check, one connected aggregator reported failure while retaining 1,268 previous listings, and two entries were not connected. Those status values came from the app; the study did not independently reproduce all ten collectors.

Across the 1,758 listed records, 646 lack numeric age, 308 have city `Unknown`, and 1,653 lack adoption fee. Those fields are missing in the stored data; this does not prove the shelter omitted them. All 104 current Saving One Life links in the snapshot are text fragments into a shared page, which are weaker than individual profile URLs. The sample is not evidence of animal-level recall or breed correctness.

## Why the breed dropdown became confusing

The frontend derives options from stored breed strings. The backend preserves inconsistent provider labels, and `src/search.ts` uses substring matching. Some raw values combine color, pattern, hair length and breed: examples include `GRAY TAB/WHITE DOMESTIC MH` and `Tuxedo Domestic Short Hair`. Treating those as separate breeds creates the current confusing categories.

Preserve raw fields and add normalized, versioned fields. Separate breed labels, hair length, colors, patterns and evidence type. Map known phrases deterministically; put unmapped values in an explicit unknown/review state. Do not infer breed from a photograph. Preserve categorical age when a numeric age is unavailable; an unknown number must not erase a source's kitten classification. Normalized filters must be identical in saved searches and server queries.

## Geography needs honest precision

Shelterluv samples include `Adoptions Lobby` and `Stand Alone, Black`; Nevada SPCA's cached Katniss profile says `Office Foster`. These describe placement, not latitude and longitude. An organization's address is not automatically the cat's location. Animal Foundation profiles separately expose where an animal was found and a shelter address: the found address must not drive adoption distance.

Use verified public placement/campus coordinates when available. Label city/ZIP-based distances approximate. Keep animals with unknown placement in an optional “nearby organizations, location unconfirmed” section. Never expose private foster addresses. A user should see source coverage and freshness for their chosen area, rather than an unsupported claim to show every cat within it.

## Collection quality has separate dimensions

| Dimension | Evidence now | What the pilot must measure |
|---|---|---|
| Organization coverage | 22 configured or researched entries, including two broad aggregators | Discovered, usable and activated organizations per area; list omissions |
| Inventory completeness | Two full widget response arrays; one first page; one reported total | Pagination, unique IDs, filter scope, changing inventories, truncation |
| Field fidelity | Selected public profile samples and cached Phoenix records | ID, species, name, breed/pattern/age/location provenance against source |
| Link fidelity | 20 structured Shelterluv details, ten PACC details, seven TAF details | Matching animal identity, redirects and disappearance over time |
| Freshness | Retrieval times and source/app timestamps | Collection lag, stale intervals, source-update versus observation time |
| Reliability | Access failures and one observed 429 sequence | Seven days of scheduled jobs, retries, failures and safe reconciliation |
| Cost | Response sizes and counts available in evidence manifest | Requests, runtime, bytes, database reads/writes per source/day |

## Role of agents

Agents should discover organizations, detect their platform, propose configurations or parser repairs, and attach evidence/tests for review. They do not need to scan every cat on every run. Deterministic collectors are cheaper, easier to test, and produce reproducible results. Queue discovery once per area when users request unsupported coverage; multiple users in the same area should share that work. Human review activates a new source, as approved for this project.

## Expansion decision

Proceed with the regional pilot. Prioritize the shared Shelterluv interface, then PACC enumeration, then Animal Foundation with conservative pacing and correct eligibility semantics. Keep unsupported organizations visible in a coverage backlog without presenting them as connected. Evaluate RescueGroups when a project key is available; its documented radius queries could expand coverage, but no measured coverage from that API is claimed here. Provider-specific access findings are in [provider requirements](provider-requirements.md).
