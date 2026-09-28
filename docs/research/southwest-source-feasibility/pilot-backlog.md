# Pilot implementation and acceptance

These tasks follow the study. They are not completed implementation work.

## Ordered work

| Order | Deliverable | Acceptance evidence |
|---|---|---|
| 1 | Scoped identities, memberships, atomic generations and job leases | Two overlapping scopes cannot delete each other's listings; failed/partial/empty/malformed cases are distinguished; expired worker cannot publish; old favorite keys resolve |
| 2 | Background dispatcher/worker and source health | Duplicate dispatch produces one effective job; crash/retry is idempotent; UI reads durable status; host pacing and 429 backoff verified |
| 3 | Shared Shelterluv adapter for Hermitage + Homeward Bound | Config-only organization difference; species/IDs/links and terminal response checked; ten matching details each; no inferred GPS; detail failure retains provenance |
| 4 | Canonical breed/color/pattern/age fields and paginated search | Raw MCACC mixed labels map correctly or remain unknown; categorical kittens survive null numeric age; exact canonical filters work server-side; search does not trigger collection |
| 5 | City/ZIP + radius and coverage display | Boundary, duplicate city name, centroid, foster-unknown, campus, transport and found-address tests; unsupported area reports limited coverage |
| 6 | PACC pagination and availability adapter | Exhausted scope proven against provider counts/terminal condition; sample links match; holds distinguished from ready-to-adopt |
| 7 | Animal Foundation custom adapter | Conservative pacing avoids repeated 429; pagination proven; cat/adoption filters confirmed; stray/hold distinctions retained; seven detail successes do not masquerade as full scan |
| 8 | Discovery backlog and repair proposals | Agent output meets source onboarding template; review required; no production credential in execution sandbox |
| 9 | Accounts, favorites and saved searches | Ownership and session tests; import existing favorites by consent; consistent canonical search schema; data deletion/retention handled |

Do not wait for every blocked organization to implement steps 1–5. Track HSSA, HOPE, Southern Arizona Cat Rescue, Henderson, Nevada SPCA and Hearts Alive separately. A failed endpoint is not proof an organization cannot ever be connected.

## Source onboarding checklist

Record organization and official page; confirm the public listing platform; distinguish API/feed/widget/custom HTML; inspect up to ten cats; verify exact source identity and URL; demonstrate enumeration completion; distinguish placement from HQ/found address; document field gaps, status semantics, retrieval time and access requirements. Add fixtures for schema drift, duplicates, missing details, zero records and pagination failure. Set conservative frequency, failure policy and retention. Reviewer approves config/version before activation.

## Seven-day post-implementation trial

This trial has **not been run**. Begin after the first new collectors and durable jobs exist.

Run three staggered scheduled checks daily per pilot scope for seven consecutive days, subject to provider limits. Keep a manifest of every attempt, scope, adapter version, reported and unique counts, requests/bytes/duration, validation outcome, and publication generation. Record failures too. Manually compare up to ten changing/representative records per organization on days 1, 4 and 7, including kittens, adults, unknown fields and offsite/foster records where present. Do not use only the alphabetically first page for validation.

Proposed release gates (targets, not measured results):

- Every published scan has proven scope completeness; no publication on truncated enumeration.
- Zero identity substitutions or wrong-animal detail links in the checked sample. Any mismatch blocks that adapter until explained and retested.
- No false adopted status; no global removal caused by a radius change or source failure.
- At least 20 of 21 planned observations per scope succeed, with no unexplained stale interval longer than 24 hours. Source throttling requires a revised schedule and another observation window, not retries that ignore limits.
- All source/observation timestamps and location precision labels displayed correctly; unknowns are not silently filled.
- Search results meet a provisional p95 server latency target of one second under a documented small pilot load; measure actual database and function usage before deciding expansion capacity.
- No secret in frontend/build/repo; public endpoints cannot enqueue arbitrary hosts or unbounded jobs. Future accounts require cross-user access tests.

Report sample denominators and uncertainty. Passing ten examples does not establish a numerical nationwide accuracy rate. Coverage is activated organizations divided by the documented discovery set, not all organizations that may exist.

## Workload model and stop conditions

For each source: daily requests = checks × enumeration pages + detail requests + bounded retries. Daily writes depend on changed records plus membership/status bookkeeping; measure instead of rewriting full unchanged JSON. Record response bytes, peak runtime, rows read/written and stored bytes. Compare with the actual Netlify/Turso account allowances.

Illustration only: three refreshes of a one-response widget cost three list requests per day before details. A directory reporting 260 records at 12 per page implies 22 enumeration pages if stable, or 66 list requests/day at that frequency; fetching every detail each time would add 780 requests/day. This is why we must verify pacing and change detection rather than copy a naive full-detail scan. Counts can change between pages; validate consistency and retry later under budget.

Pause a source for repeated rate limits/challenges, unbounded pagination, identity corruption, or unexplained major count collapse. Retain prior data as visibly stale where permitted. Review explicit removal requests separately and promptly. Expansion to another city requires at least one validated collector and truthful coverage labeling, not a particular number of supported states.
