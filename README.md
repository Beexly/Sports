# Galaxy Sports Edge

This repository currently holds the Galaxy Sports Edge monetization v3 operating system and supporting execution artifacts.

Canonical entrypoint:

- [docs/monetization-v3/README.md](docs/monetization-v3/README.md)
- [docs/monetization-v3/17-current-state-handoff.md](docs/monetization-v3/17-current-state-handoff.md)

Important constraint:

- Product engineering is gated by [docs/monetization-v3/13-execution-gates.md](docs/monetization-v3/13-execution-gates.md). Do not create Stripe products, Discord automation, public checkout, Almanac pre-orders, or Live OBS implementation until the relevant gate is cleared.

Validation:

```powershell
powershell -ExecutionPolicy Bypass -File .\docs\monetization-v3\tools\validate-monetization-v3.ps1
```

Current validated footprint:

- 169 Markdown files checked
- 21 CSV files checked
- 15 targeted drift files checked

Use `-StrictBrandScan` for the noisy full-doc vocabulary review.
