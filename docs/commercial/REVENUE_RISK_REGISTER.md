# Revenue Risk Register

Updated: 2026-07-04

| Risk | Severity | Mitigation | Code/doc surface |
| --- | --- | --- | --- |
| Fake audience claim | high | block until real analytics exist | media pages, docs |
| Unsupported ROI or win-rate claim | high | claim scanner and manual evidence gate | `claim-safety.ts`, `banned-copy.ts` |
| Undisclosed sponsor mention | high | disclosure review | `disclosure-policy.ts` |
| Regulated offer with unknown state | high | fail closed | `responsible-gaming-policy.ts` |
| Partner approved but offer unapproved | high | separate partner and offer approvals | `offer-eligibility.ts` |
| Offer approved but partner expired | high | expiry checks | `offer-eligibility.ts` |
| Sponsor influence over model/editorial | high | sponsor cannot control list | media docs and package definitions |
| Duplicate revenue logic | medium | reuse media-revenue where possible | `sponsor-packages.ts`, `partner-score.ts` |
| Premature API launch | high | shadow seam first | closeout audit |

## Rule

Commercial pressure cannot override source rights, claim safety, disclosure, responsible-gaming controls, model freeze, or no-bet decisions.
