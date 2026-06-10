# Real App Next Actions

Date: 2026-06-09

## Status

Do not deploy yet.

P0 crash blockers were closed or converted into explicit readiness failures. Launch remains blocked by dependency readiness and roster/Player Lab scope proof.

Founder-readable finish-line memo:

- `docs/command-center/p0-staging-manifest.md`
- `docs/command-center/launch/14-one-person-finish-line-plan.md`
- `docs/command-center/launch/15-founder-launch-autopilot.md`
- `docs/command-center/launch/16-launch-day-support-copy-packet.md`
- `docs/command-center/launch/17-launch-day-monitoring-and-rollback-checklist.md`
- `docs/command-center/launch/18-post-launch-rd-finish-line-queue.md`
- `docs/command-center/launch/19-ten-second-public-route-copy-audit.md`
- `docs/command-center/launch/20-player-lab-current-roster-cut-or-verify.md`

## P0 Before Deploy

1. Configure working production-like DB and ingestion dependencies.
2. Rerun `node scripts/prod-probe.mjs` with the real target URL.
3. Require `/api/ready` and `/api/ready?check=ingestion-freshness` to return 200.
4. Confirm this clone/branch is the production source of truth.
5. Resolve Player Lab/current roster claims or remove those claims from public launch scope.
6. Review the dirty tree and stage only the intended P0 files.

## P1 After P0

1. Full visual QA on every public route.
2. Full secret/methodology scan with a larger founder phrase list.
3. Promotions compliance workflow before any live affiliate/promo content.
4. Real DB smoke test with non-secret production-like data.

## Voice OS / Audio Intelligence - post-P0 opportunity lane

Status: discovery complete, prototype-only until P0 readiness is green.

Start here:

- `docs/command-center/discovery/elevenlabs-voice-os/README.md`
- `docs/command-center/discovery/elevenlabs-voice-os/01-repo-verification.md`
- `docs/command-center/discovery/elevenlabs-voice-os/08-safe-prototype-plan.md`
- `docs/command-center/discovery/elevenlabs-voice-os/build-queue/index.md`

Best first safe builds after P0:

1. VOICE-BUILD-003 Transcript-first audio card component spec.
2. VOICE-BUILD-006 Voice script safety linter.
3. VOICE-BUILD-008 Daily Brief voice script template.
4. VOICE-BUILD-012 Audio disclosure component.
5. VOICE-BUILD-017 Method-leakage audio guard.

Rules: no ElevenLabs API calls, no keys, no generated public audio, no promotions voice, no customer audio storage, and no production dependency changes until founder/legal/privacy approval as applicable.

## Not For This Sprint

- Broad R&D docs.
- Generic build queues.
- Stripe/live payments.
- Deployment.
- Production DB mutation.
