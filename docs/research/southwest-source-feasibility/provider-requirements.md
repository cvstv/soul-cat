# Broad-feed and infrastructure evidence

Reviewed 2026-09-27. These are documentation findings, not measured API coverage. A variable-name-only check of the application's local `.env` found no configured RescueGroups key; secrets were not printed. No accounts, keys, contacts, or access agreements were created.

## RescueGroups

[Public v5 documentation](https://api.rescuegroups.org/v5/public/docs) documents API-key access, animal and organization queries, postal-code/coordinate radius searches, stable record IDs, pagination metadata (maximum 250 animals per page), original breed/color/pattern fields, animal URLs, locations and update dates. These capabilities fit the proposed collector, but returned organizations, URL quality and freshness remain untested without a Soul Cat key. Published API details take precedence over broad marketing claims about unlimited requests. Handle HTTP 429 and cache reference lists. A location field's semantics must be checked on actual records before using it for distance.

[API terms](https://rescuegroups.org/api-terms-of-service/) permit temporary caching for the described service; organizations can opt out. Refresh is recommended daily and required at least weekly. Implement removal on request within one business day, independently of scans, and termination purging including backups/derived data. Public pet-detail pages require the supplied tracker image; a privacy policy is required. Each separate service normally needs its own key. These obligations affect saved snapshots and open-source forks: distribute code and synthetic examples, not provider data or a shared credential. Indefinite history retention is not established by these terms. Clarify a bounded retention period before enabling cached content.

[Service description](https://rescuegroups.org/services/adoptable-pet-data-api/) supports evaluating this source, but does not prove that any specific Tucson or Las Vegas shelter shares listings with Soul Cat.

## Adopt a Pet

[Consumer terms](https://www.adoptapet.com/terms-of-service) prohibit automated crawling/extraction. The existing Phoenix HTML adapter's technical success is not evidence of permission to expand it. Recommend resolving an approved feed/access arrangement or disabling that collector in a separate authorized operational change. The AHS adapter shares this dependency. This study does not modify production. Do not generalize this provider-specific finding to every public shelter feed.

## Petfinder

[Public GraphQL terms](https://www.petfinder.com/public-graphql-api-terms-of-service/) require attribution and restrict commercial use and competitor display without prior written approval. Current repo records access failures. No credentials, complete API schema, or combined-display approval were established. Keep its coverage unproven; an official shelter page linking to Petfinder is a discovery clue, not a working server integration.

## Questions prepared, not sent

1. RescueGroups: Can Soul Cat cache public cat records for geographic search and saved favorites, for what retention period, and how should removals/organization opt-outs be detected? Are all API `url` values individual animal pages? Which location relationship drives radius results, including foster/transport listings? Is there a reliable deletion/changed-record feed or consistent snapshot mechanism? Confirm the proposed combined-source display and per-detail tracker placement.
2. Adopt a Pet: Is there a supported feed agreement for this open-source, combined-source adoption finder? What geographic scope, attribution, caching, removal, and throughput rules apply?
3. Petfinder: Request current server-access documentation and written clarification of combined display, with the actual project described rather than a hypothetical shelter-only use.
4. Individual platform/shelter: Confirm public adoptable fields, identifier namespace, inventory enumeration, source update semantics, reuse rights and permitted request frequency. Avoid private intake, owner, medical, foster-address or application records.

## Runtime implications

[Netlify scheduled functions](https://docs.netlify.com/build/functions/scheduled-functions/) have a 30-second execution limit and use UTC schedules; they suit dispatching due work. [Background functions](https://docs.netlify.com/build/functions/background-functions/) document asynchronous execution up to 15 minutes and retries. Do not confuse dispatch acknowledgment with completion. Persist job state and make retry processing idempotent. The existing global synchronous sweep is unsuitable as a growing nationwide job.

[Turso pricing](https://turso.tech/pricing) was consulted for the current plan model; actual account usage was not inspected. Do not promise a free nationwide service. Measure rows written, bytes and function duration, then compare against the account's real allowances before expansion.

## Geographic lookup candidate

[GeoNames postal data](https://download.geonames.org/export/zip/) and its [readme](https://download.geonames.org/export/zip/readme.txt) provide postal codes, place names and coordinates, with attribution licensing and accuracy information. A versioned local US lookup is a low-dependency pilot option. Validate the chosen dataset's AZ/NV records before import. Coordinates are search centers/approximate locality points, not verified cat addresses; never turn a ZIP centroid into an exact animal location. Keep lookup behind an interface so a different geocoder can replace it.
