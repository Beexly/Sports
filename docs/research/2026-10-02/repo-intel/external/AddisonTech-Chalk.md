# AddisonTech / Chalk

- **Stars:** 1 | **License:** MIT | **Pushed:** 2026-05-20 (early, demo-stage) | **Lang:** TypeScript (Next.js 16, Supabase)

## Vision
A football intelligence platform for coaching staffs with three modules: **Film Room** (opponent tendency reports, run/pass splits by down/formation/personnel/situation), **Board** (recruiting prospect tracking with scheme-fit scores), and **Playbook** (weekly game-plan builder with situational concepts). An all-in-one staff tool, not a fan product.

## The Ask
- Next.js + Supabase (auth + Postgres); `npm install`, fill in Supabase keys, `npm run dev`. Demo-stage — schema ships as one migration.

## Constraints
- MIT — adoptable. But it's a demo: 1 star, thin README, no evidence of the tendency engine actually working against real film. The "AI-powered" claim is unverified.

## GSE lens
Reveals no engine gap — but it reveals a **product-shape** GSE hasn't considered. Garrett's lanes are: public site (projections/rankings only), DFS packets, X content. Chalk's shape — tendency reports by down/formation/personnel/situation — is exactly the kind of *internal* coaching-intelligence surface that GSE's coaching tau table (+6.77pp held-out) was built to power but has no consumer for. The tau table exists with no UI and no prediction-path consumer; Chalk shows what a consumer looks like: "here's what this team does on 3rd-and-long by formation." Blunt: GSE built the stat and stopped; a 1-star demo repo got further on the *presentation* of coaching intelligence. Also a future-revenue note: an NCAA-staff-facing tendency product is a plausible paid lane adjacent to the free public site, if Garrett ever wants one.

## Verdict
**REBUILD** (the tendency-report presentation pattern only) — give the orphaned coaching tau table a consumer surface; do not adopt the demo code.

## The 4 tricks
- CodeWiki: https://codewiki.google/github.com/AddisonTech/Chalk
- GitDiagram: https://gitdiagram.com/AddisonTech/Chalk
- Star history: https://star-history.com/#AddisonTech/Chalk (1 star)
- github.dev: https://github.dev/AddisonTech/Chalk
