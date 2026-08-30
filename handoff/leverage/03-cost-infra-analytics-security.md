# Cost-Saving Infra & Ops — $0/low-cost leverage audit

Domain: hosting/VPS, managed DB, Redis/queue, serverless/CDN, deploy, self-hosting (Docker),
analytics, monitoring/uptime/logs/observability, security/vuln/secret-scanning, backups, CI.

Source of truth: `handoff/codex/galaxy-2026-limit-push/NORMALIZED_RESOURCE_LEDGER.csv`
(only `approved_direct` + `owner_review` rows used; `quarantine`/`rejected_noise` skipped) and
`handoff/incoming/garrett-resource-dump-2026-06-15.md`. Goes deeper than
`docs/BOOTSTRAP_LEVERAGE.md` (verifies limits live; does not duplicate).

**Relevant items found in-domain:** ~45 (infrastructure 39 rows, security 73 rows, analytics 22
rows, plus DB/CI/data-ops keyword hits — most security/data-ops rows are noise/reference; ~28 are
genuinely actionable for this stack).
**Verified live this pass:** 8 (Oracle Cloud, Supabase, Cloudflare Web Analytics, Snyk,
GoatCounter, MS Clarity, Codeberg; Umami/Rybbit attempted — JS-only/redirect, assessed from
description). Rest assessed from ledger description + known free tiers.

> Honest gap: the dump has **no** Neon / Railway / Fly / Render / Upstash / Sentry / gitleaks /
> Trivy / restic-style entries. Those remain standard free tiers (†) outside the dump. The dump's
> infra value is concentrated in **one free VPS (Oracle), one managed DB/auth (Supabase), the
> self-host Docker toolchain, a strong free analytics suite, and free TLS/security tooling.**

---

## Top 10 $0 wins (do these first)

1. **Oracle Cloud Always Free VPS** — host BullMQ workers + self-hosted Redis + henrygd on a
   free ARM box. Kills the single largest infra cost center (no paid VPS, no Redis bill). VERIFIED.
2. **Cloudflare Web Analytics** — $0 site analytics, cookieless, JS-snippet works on Vercel (no
   need to proxy DNS). Replaces any paid analytics. VERIFIED.
3. **Supabase free tier** — managed Postgres + auth, $0. Fits Prisma/NextAuth. Replaces a paid
   managed Postgres for dev/early prod. VERIFIED (500MB DB, 2 projects, pauses after 1wk idle).
4. **Snyk free** — dependency + code vuln scanning in CI. $0 security baseline. VERIFIED
   (200 SCA / 100 SAST / 100 container / 300 IaC tests per month).
5. **MS Clarity** — free-forever session replay + heatmaps, no traffic limit. Conversion/UX
   intel for the paywall funnel at $0. VERIFIED.
6. **Self-host Docker toolchain** (Dockge/Portainer, Watchtower, Diun, Dozzle, Docker-AutoHeal) —
   $0 container ops/monitoring/log-viewing on the Oracle box. Replaces paid PaaS dashboards.
7. **Grafana + Prometheus (self-host)** — $0 observability/metrics dashboards vs paid APM
   (Datadog/New Relic). Park on the Oracle VPS.
8. **Let's Encrypt / acme.sh / Certbot** — free auto-renewing TLS. $0 certs for any self-hosted
   surface. Caddy (internal-ref) auto-TLS makes this one step.
9. **Codeberg / Gitea** — free git hosting + CI (Woodpecker/Forgejo Actions). $0 fallback if
   leaving paid GitHub; Gitea self-hosts on the Oracle box. VERIFIED (Codeberg nonprofit, free CI).
10. **Fail2Ban + AbuseIPDB + osquery** — $0 edge hardening + security monitoring for the VPS
    (brute-force protection, bad-IP blocklists, host telemetry). Replaces paid WAF/SIEM at this scale.

---

## Ranked table

| Resource | What it is | Alignment | Cost center it cuts + future mapping | Verification + free-tier limit |
|---|---|---|---|---|
| **Oracle Cloud** | Always Free ARM VPS | ADOPT NOW | **Hosting + Redis/queue.** Host BullMQ workers, self-host Redis, henrygd, Umami/Grafana. Future: primary always-on compute. | VERIFIED (official docs): up to 4 ARM OCPU / 24 GB RAM (1500 OCPU-hrs + 9000 GB-hrs/mo), 200 GB block, 20 GB object, 2 Autonomous DBs — all Always Free, not trial. **FLAG: dump says "Requires Real Information"; signup needs valid credit card + real ID; reclaim risk if idle.** |
| **Supabase** | Managed Postgres + Auth | ADOPT NOW (dev/early) | **DB.** Managed Postgres for Prisma + NextAuth without a DB bill. | VERIFIED: 500 MB DB, 2 active projects, 50k MAU auth, 5 GB egress, 1 GB storage, **no auto-backups, project pauses after 7 days idle.** Self-host Postgres on Oracle for prod to dodge the pause. |
| **Cloudflare Web Analytics** | Cookieless site analytics | ADOPT NOW | **Analytics.** $0 edge analytics; no paid analytics SaaS. | VERIFIED: free; JS beacon works on any host (Vercel) — DNS proxy NOT required; no cookies/fingerprinting; no stated pageview cap. |
| **Snyk** | SCA + SAST vuln scanning | ADOPT NOW | **Security/CI.** Dependency + code scanning in GitHub Actions. | VERIFIED: 200 open-source + 100 code + 100 container + 300 IaC tests/month, unlimited devs. |
| **MS Clarity** | Session replay + heatmaps | ADOPT NOW | **Analytics/UX.** Funnel + paywall conversion intel. | VERIFIED: free forever, no traffic limits, replays + heatmaps. |
| **Grafana** | Self-host dashboards | ADOPT NOW | **Monitoring/observability.** $0 vs paid APM. Pair w/ Prometheus on Oracle. | Assessed (dump: "Self-Hosted Dev Data Dashboard"); Grafana OSS is free/self-host (Grafana Cloud free tier † also exists). |
| **Prometheus** | Metrics/scraping | ADOPT NOW | **Monitoring.** Worker/queue/app metrics → Grafana. | Assessed (dump: "Site Metrics / Setup"); OSS, free. |
| **Dozzle** | Container log viewer | ADOPT NOW | **Logs.** $0 real-time Docker logs on the VPS; no log SaaS. | Assessed (dump: "Log Viewer"); OSS, free. |
| **Watchtower** | Auto-update containers | ADOPT NOW | **Ops.** Auto-pull/redeploy worker images. | Assessed (dump: "Container Automation"); OSS, free. |
| **Diun** | Image-update notifier | EVALUATE | **Ops.** Alerts on new base images (security hygiene). | Assessed; OSS, free. Lighter alt to Watchtower if auto-update too aggressive. |
| **Docker AutoHeal** | Restart unhealthy containers | ADOPT NOW | **Uptime.** Self-healing workers without a paid orchestrator. | Assessed (dump: "Container Monitor"); OSS, free. |
| **Dockge / Portainer** | Compose/container manager | ADOPT NOW | **Ops/deploy.** GUI for compose stacks on the Oracle box. | Assessed; OSS, free (Portainer CE free; Dockge MIT). |
| **GoAccess** | Web-log analyzer | EVALUATE | **Logs/analytics.** Real-time nginx/Caddy log dashboard, $0. | Assessed (dump: "Web Log Analyzer"); OSS, free. |
| **Umami** | Cookieless analytics (self-host) | EVALUATE | **Analytics.** Self-host funnels on Postgres (reuse DB). | Assessed (page JS-only). OSS self-host free; needs Postgres/MySQL; hosted free tier † limited. |
| **GoatCounter** | Privacy analytics | EVALUATE | **Analytics.** Lightweight alt / hosted free. | VERIFIED: hosted free for reasonable use (no millions/day), OSS self-host, cookieless, no GDPR notice needed. |
| **Rybbit** | GA-alternative analytics | EVALUATE | **Analytics.** Self-host privacy analytics. | Redirect to rybbit.com (assessed); OSS self-host, hosted free tier † exists. |
| **Codeberg** | Free git hosting + CI | EVALUATE | **CI/git hosting.** $0 fallback off paid GitHub; Woodpecker CI. | VERIFIED: nonprofit, free, Forgejo + Woodpecker CI, Pages. (Check private-repo/CI-minute limits in their docs.) |
| **Gitea** | Self-host git + Actions | EVALUATE | **CI/git hosting.** Self-host on Oracle for unlimited private repos + CI. | Assessed; OSS, free. |
| **GitLab** | Git hosting + CI | EVALUATE | **CI.** Free tier † (400 CI min/mo) or self-host CE. | Assessed; free tier known. |
| **sourcehut / git.sr.ht** | Minimal git + CI | FUTURE | **CI/git hosting.** Paid-hosted but OSS self-host; niche. | Assessed; hosted is paid, self-host free. |
| **Let's Encrypt** | Free TLS certs | ADOPT NOW | **Security/hosting.** $0 HTTPS for self-hosted surfaces. | Assessed; free, ubiquitous. Vercel handles TLS already — this is for the Oracle box. |
| **acme.sh / Certbot** | Auto cert renewal | ADOPT NOW | **Security.** Automate LE renewals. | Assessed (dump: "Automatically Configure / Renew Certificates"); OSS, free. |
| **ZeroSSL** | Free TLS certs | FUTURE | **Security.** LE alternative / ACME. | Assessed; free tier (3 certs / 90-day) + ACME. |
| **Caddy** (internal-ref) | Auto-TLS web server | ADOPT NOW | **Hosting/security.** Reverse proxy w/ automatic HTTPS for workers on Oracle. | Assessed; OSS, free. Simplest TLS+proxy for self-host. |
| **Fail2Ban** | Brute-force protection | ADOPT NOW | **Security.** Protect SSH/services on the VPS. | Assessed (dump: "Protect Servers from Brute Force"); OSS, free. |
| **AbuseIPDB** | Bad-IP detection/blocklist | EVALUATE | **Security.** Block abusive IPs at edge. | Assessed; free API tier † (1k checks/day). |
| **osquery** | Host security telemetry | EVALUATE | **Security/monitoring.** SQL over host state for the VPS. | Assessed (dump: "Security Monitors"); OSS, free. |
| **Wazuh** | SIEM / host monitoring | FUTURE | **Security/observability.** Heavier SIEM if scale grows. | Assessed; OSS, free (resource-heavy — likely too big for one Oracle box early). |
| **OWASP ZAP** | Web app security testing | EVALUATE | **Security/CI.** DAST scan of the deployed app. | Assessed (dump: "Web App Security Testing"); OSS, free. |
| **OpenCVE / CVE Details** | CVE tracking/alerts | EVALUATE | **Security.** Watch CVEs for stack deps. | Assessed; OpenCVE OSS self-host + free hosted tier. |
| **SSLLabs** | SSL config grading | EVALUATE | **Security.** One-off TLS posture check. | Assessed; free web tool. |
| **mitmproxy / HTTPToolkit** | HTTPS intercept/debug | EVALUATE (dev) | **Dev/ops.** Debug The Odds API / ESPN adapters; mock responses. | Assessed; OSS/free tiers. Dev-time, not infra spend. |
| **DuckDB** | Embedded analytics DB | EVALUATE | **DB/analytics.** $0 local OLAP for ledger/CLV crunching; no warehouse bill. | Assessed; OSS, free. Strong for offline stats jobs without a paid warehouse. |
| **Ingestr** | DB-to-DB transfer (CLI) | FUTURE | **Data-ops.** Move data between Postgres/DuckDB free. | Assessed (dump: "Transfer Data between Databases"); OSS, free. |
| **DBeaver / ChartDB** | DB GUI / schema viz | EVALUATE (dev) | **Dev tooling.** Free Postgres admin + schema diagrams. | Assessed; DBeaver CE free; ChartDB OSS. |
| **REM** | File encryptor + Rclone GUI | EVALUATE | **Backups.** $0 encrypted backups to object storage via rclone (e.g. Oracle 20 GB object / Backblaze B2 † 10 GB). | Assessed (dump: "File Encryptor / Rclone GUI"). Closest the dump gets to a backup tool. |
| **Baserow / NocoDB** | Airtable-style DB UI | FUTURE | **Data-ops.** $0 internal ops/CRM views; self-host on Oracle. | Assessed; OSS self-host free (hosted free tiers † limited). |
| **VPS Comparison Chart / servers.fyi / VPS Price Tracker** | VPS price research | EVALUATE (research) | **Hosting research.** Pick cheapest paid VPS *if/when* Oracle is outgrown. | Assessed; free reference sites. |
| **Selfhosted-Apps-Docker / Awesome Docker / Composerize / deploy-your-own-saas** | Self-host guides/compose tooling | ADOPT NOW (reference) | **Deploy/ops.** Cookbook for standing up the self-host stack; Composerize turns `docker run` → compose. | Assessed; free GitHub references. |
| **Bitcoin VPS / VPS Rentals** | Anonymous/alt VPS listings | SKIP | — | Assessed. Anonymity-oriented; no $0 angle vs Oracle; skip. |
| **CloudBase** | "Cloud Game Database" | SKIP | — | Mislabeled; gaming data, not infra. |

---

## Cost-center → recommendation summary

- **Hosting / compute:** Oracle Always Free VPS (ARM) is the keystone — everything self-hosted parks here. Vercel free tier † for the Next.js front. Don't pay for a VPS until Oracle is outgrown (use the comparison sites then).
- **Database:** Supabase free for dev/early; self-host Postgres on Oracle for prod (avoids Supabase's 7-day idle pause + missing backups). DuckDB for offline stats/CLV crunching.
- **Redis / queue:** Self-host Redis on the Oracle box (kills any Upstash/Redis bill); Upstash free tier † as fallback.
- **Analytics:** Cloudflare Web Analytics (now, zero-config) + MS Clarity (replay/heatmaps) + self-host Umami/GoatCounter for funnels. All $0.
- **Monitoring / logs / observability:** Grafana + Prometheus + Dozzle + GoAccess, all self-hosted on Oracle. $0 vs paid APM. (Uptime/error-tracking gap: dump has none — add UptimeRobot † + Sentry free tier † as feature work.)
- **Security / CI:** Snyk + ZAP + OpenCVE for vuln scanning; Fail2Ban + AbuseIPDB + osquery for VPS hardening; Let's Encrypt/acme.sh/Caddy for TLS. gitleaks † still needed for secret-scanning (not in dump).
- **CI / git hosting:** Stay on GitHub Actions free tier † for now; Codeberg/Gitea/GitLab are the $0 escape hatch if GitHub costs appear.
- **Backups:** Thin spot. REM (rclone GUI) + Oracle 20 GB object storage or Backblaze B2 † is the $0 path; needs to be built (not a turnkey dump win).

## Honest flags

- **Oracle Cloud "Requires Real Information"** (dump's own note, confirmed): real CC + ID at signup; idle Always-Free ARM instances have been reclaimed historically — keep them busy / pin home region. Not sketchy, but not friction-free.
- **Supabase free pauses after 7 days idle and has no auto-backups** — fine for dev, risky as sole prod store. Migrate prod to self-hosted Postgres on Oracle.
- **Wazuh** is powerful but heavy — likely too resource-hungry to co-locate with workers/Redis on one free ARM box early on.
- Most `security` ledger rows (Hydra, Nmap, pentest cheatsheets, crypto/file-encryption tools, Discord-crypto) are **out of domain / dev-research only** — excluded from the actionable set.
