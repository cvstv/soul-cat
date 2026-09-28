# Evidence method and limits

This is a purposive feasibility sample: 12 Phoenix registry entries (including two aggregators) and five organizations each in Tucson and Las Vegas. It is not an exhaustive organization directory or a random accuracy sample.

Repository baseline: `1e2db1bbf35c0279c9f5036a491ba7e8a031ee9c`. Read-only inspection covered provider registry/parsers, store, collector, filters and frontend. The saved public inventory GET supplied 100 cached sample records, ten per connected source. Those describe stored quality, not independent source-to-app fidelity. No production scan was triggered.

## Direct evidence

| Organization | Published path | Observed result |
|---|---|---|
| Hermitage | [Official page](https://www.hermitagecatshelter.org/adopt/) → [embed](https://www.shelterluv.com/embed/38723) → [widget data](https://www.shelterluv.com/api/v3/available-animals/38723) | 148 distinct Cat IDs; all include public URLs |
| Homeward Bound | [Official page](https://www.homewardboundcats.org/adopt/) → embed 5575 → [widget data](https://www.shelterluv.com/api/v3/available-animals/5575) | 70 distinct Cat IDs; all include public URLs |
| PACC | [Official page](https://www.pima.gov/browse-shelter-cats) → [24Petconnect](https://24petconnect.com/PimaAdoptableCats) | 30 initial-page cards; total unmeasured |
| Animal Foundation | [Official directory](https://animalfoundation.com/what-we-do/adoption/adopt-a-pet/) → directory script → [cat response](https://animalfoundation.com/wp-json/wp/v2/elevation/adoption/get_directory?adoption_type=cat&actualPage=1) | 12 initial cards; reported total 260, not fully enumerated |

The public Shelterluv widget module supplied its listing endpoint. Ten published detail links per organization returned structured records whose `uniqueId` matched the requested IDs. PACC's public navigation function supplied exact profile paths; ten responses contained the requested animal ID. That PACC text check is weaker than a complete visual field comparison. Animal Foundation links were copied from the directory: seven details contained the requested ID and three returned HTTP 429. Requests to that host stopped after the batch reported rate limiting; future workers must avoid such bursts.

Profile checks occurred around 07:53 UTC September 27 (00:53 Phoenix); exact request observation times are retained in city JSON files. `evidence-manifest.json` contains local capture hashes, byte counts and modification times. File times are not source-update times.

Nevada SPCA had four accessible cached profiles out of ten attempts, with crawl dates days to weeks old. Cached content cannot establish present availability. Direct errors/challenges for other organizations are access limits, not zero cats. An application link or photo host alone does not prove an inventory interface.

## Retention and reproducibility

Only small factual projections, IDs, links and request outcomes are included in the reports. Raw responses remain temporary local research files, not repository deliverables. Temporary files can disappear; URLs, hashes and check descriptions allow bounded re-observation, although animal populations change. Do not publish raw descriptions, photos, credentials or ancillary metadata from a response.

No nationwide accuracy statistic or seven-day reliability result is claimed. Full enumeration, operational access review and sustained validation are implementation gates in the backlog.
