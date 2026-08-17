# Cost Controls & Spend Defense Plan

**Hard monthly cap goal (current survival mode):** ≤ $25 total external SaaS beyond free tiers.

## Category Caps (target)

| Category              | Preferred          | Max monthly | Notes |
|-----------------------|--------------------|-------------|-------|
| Deploy / Hosting      | Vercel free/hobby  | $0–20       | Hobby is free; Pro only if needed |
| Database              | Neon free tier     | $0          | Scale later |
| Analytics             | PostHog free       | $0          | 1M events |
| Coverage              | Codecov open-source| $0          | |
| Secrets scanning      | GitHub native + GG | $0          | GitGuardian free for public |
| Dependency updates    | Dependabot         | $0          | |
| CI minutes            | GitHub Actions     | included    | Public repo free |
| AI tools              | ≤2 total           | as needed   | Cap cognitive load |
| Everything else       | —                  | $0          | Revoke |

## Downgrade / Cancel Triggers

- Any tool that has not been used in 14 days → revoke.
- Any tool that produces >5 alerts/week with no action taken → disable notifications or remove.
- Total external spend approaches $30 → immediately cut non-essential (WakaTime, Mergify if not saving real time, extra AI connectors).
- Vercel bandwidth or function overages → move non-critical workers to free alternatives or throttle.

## Immediate Kill-Switch List (cut first if money tighter)

1. WakaTime
2. Mergify (if not actively auto-merging)
3. Any second/third AI connector beyond Copilot + one other
4. Pipedream (if no active high-ROI flows)
5. Postman / Hoppscotch if curl + VS Code enough
6. All SonarQube variants
7. Socket, Snyk, Codacy, CircleCI, Azure anything, Imgbot, Linear (unless actively used)
8. Codecov paid features (stay on free/soft)

## 14-Day App Review Checklist

Every other Monday:
- [ ] List authorized GitHub Apps + OAuth apps
- [ ] For each: last used? real value this week? free?
- [ ] Revoke anything that fails the >$100/month ROI or severe-risk test
- [ ] Confirm Dependabot PRs are being merged or closed deliberately
- [ ] Check Vercel + Neon usage dashboards

## Decision Rubric for New Tools

Accept only if **all** true:
1. Saves or earns > $100/month equivalent **or** eliminates a severe risk (secret leak, broken main, major incident).
2. Replaces an existing tool or is the first in its category (no net growth without justification).
3. Free tier is usable for ≥3 months, or clear cancel condition exists.
4. Setup time < 30 min and maintenance burden Low.
5. Clear owner (you) and rollback path documented.
