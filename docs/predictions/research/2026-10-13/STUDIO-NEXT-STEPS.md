# STUDIO CONTINUATION — ALL NEXT STEPS
# Locked stack: TanStack Start · MockProvider · workspace_id/org_id · House $990 stays separate
# Execute slices in order. Schema for B–G is declared in Slice A so you never migrate twice.

---

## 0. FILE MAP (target tree)

```
src/lib/clip-schema.ts          # ALL types + table shapes
src/lib/clip-store.ts           # local persistence
src/lib/clip-credits.ts         # reserve / charge / refund / grant
src/lib/clip-ledger.ts          # append-only ledger (NEW)
src/lib/clip-pricing.ts         # capability cost matrix (NEW)
src/lib/clip-providers.ts       # Mock | Fal | Veo | stubs
src/lib/clip-router.ts          # pure model router (NEW)
src/lib/clip-jobs.ts            # state machine + fan-out
src/lib/clip-optimizer.ts       # scene_spec + quality OS (NEW)
src/lib/clip-director.ts        # beats parser (NEW)
src/lib/clip-templates.ts       # slots + smart mix
src/lib/clip-brand.ts           # scene vs social kit (NEW)
src/lib/clip-3d.ts              # 3D capability layer (NEW)
src/lib/clip-series.ts          # series/scenario/episode (NEW)
src/lib/clip-presets.ts         # viral/effect recipes (NEW)
src/lib/clip-ad-remake.ts       # URL → storyboard stub (NEW)
src/lib/clip-mcp.ts             # server fn surface (NEW)
src/lib/clip-gql.ts             # GraphQL types (later server)
src/lib/clip-quality.ts         # shared linter (NEW)
.env.example
src/routes/studio/*
```

House routes stay untouched. Shared imports only: workspace, org, credits types.

---

## 1. SHARED DOMAIN (put in clip-schema.ts FIRST)

```ts
export type UUID = string
export type Plan = 'free' | 'starter' | 'pro' | 'ultra' | 'enterprise'
export type CreditType = 'ai' | 'download'
export type LedgerReason =
  | 'generation' | 'download' | 'purchase' | 'refund'
  | 'rollover' | 'bonus' | 'plan_grant' | 'regen'
export type JobStatus =
  | 'queued' | 'preprocessing' | 'generating'
  | 'post_processing' | 'completed' | 'failed'
export type Aspect = '1:1' | '4:5' | '9:16' | '16:9'
export type AudioType = 'none' | 'sfx' | 'music'
export type Capability =
  | 'diffusion_2d' | 'keyframe_i2v' | 'effect_preset'
  | 'avatar_3dgs' | 'performance_capture' | 'world_model'
export type ConsistencyTier = 'ref_i2v' | 'embedding' | 'gaussian'
export type SeriesFormat =
  | 'faceless' | 'character_explainer' | 'top5' | 'narrative' | 'ugc'
export type CameraMove =
  | 'static' | 'dolly' | 'pan' | 'orbit' | 'crane'
  | 'earth_zoom' | 'bullet_time' | 'handheld'
export type ModelId =
  | 'mock' | 'fal-kling' | 'fal-seedance' | 'fal-minimax'
  | 'veo' | 'sora' | 'luma' | 'runway-gen4' | 'higgsfield-preset'
  | 'avatar-3dgs'

export interface SceneSpec {
  subject: string
  environment: string
  facingCamera: boolean
  popout: boolean
  barriers: string[]
  lighting: string
  camera: CameraMove
  textOnScreen: string | null
  refs: string[]
}

export interface QualityIssue {
  type:
    | 'missing_subject' | 'action_verb' | 'barrier_detected'
    | 'white_background' | 'multiple_subjects' | 'vague_environment'
    | 'no_popout_vector' | 'text_too_long' | 'missing_camera'
    | 'unsafe_ip' | 'disclosure_needed'
  severity: 'error' | 'warning' | 'info'
  message: string
  fixExample: string
}

export interface QualityReport {
  score: number // 0-100
  issues: QualityIssue[]
  blocking: boolean // true if any error
}

export interface DirectorBeat {
  time: 'end' | 'end+0.5' | 'end+1' | string
  action: string
  target?: string
  object?: string
  sound?: string
  camera?: CameraMove
  fx?: string
}

export interface CameraSpec {
  move: CameraMove
  start?: string
  end?: string
}

export interface LayerBundle {
  subject?: string
  background?: string
  text?: string
  fx?: string
  camera?: string
  audio?: string
}

export interface Artifacts {
  poster: string
  mp4?: string
  thumbs: string[]
  gif?: string
  glb?: string
  layers?: LayerBundle
}

export interface CreditLedgerRow {
  id: UUID
  workspaceId: UUID
  orgId: UUID
  userId: UUID
  creditType: CreditType
  amount: number // +grant / -debit
  reason: LedgerReason
  referenceId: UUID | null
  variationIndex: number | null
  balanceAfter: number
  capabilitySnapshot: Record<string, unknown>
  createdAt: string
}

export interface CreditBalances {
  workspaceId: UUID
  ai: number
  download: number
  aiRollover: number
  downloadRollover: number
  billingCycleStart: string
  nextReset: string
}

export interface VideoJob {
  id: UUID
  parentId: UUID | null
  workspaceId: UUID
  orgId: UUID
  userId: UUID
  rawPrompt: string
  optimizedPrompt: string
  sceneSpec: SceneSpec
  negativePrompt: string
  refs: string[]
  modelId: ModelId
  modelParams: Record<string, unknown>
  seed: number
  routeReasons: string[]
  capability: Capability
  camera: CameraSpec | null
  directorMode: boolean
  directorPrompt: string
  directorBeats: DirectorBeat[]
  audioType: AudioType
  audioPrompt: string
  aspect: Aspect
  durationSec: 5 | 10
  resolution: '720p' | '1080p'
  multiGenCount: 1 | 2 | 4
  creditsReserved: number
  creditsCharged: number
  qualityReport: QualityReport
  twoStage: boolean
  layered: boolean
  exportGlb: boolean
  effectPresetId: UUID | null
  seriesEpisodeId: UUID | null
  status: JobStatus
  progress: number
  error: string | null
  selectedVariationIndex: number | null
  regeneratedFrom: UUID | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

export interface Video {
  id: UUID
  jobId: UUID
  parentJobId: UUID | null
  workspaceId: UUID
  variationIndex: number
  artifacts: Artifacts
  duration: number
  resolution: string
  hasWatermark: boolean
  isRegeneration: boolean
  isPublic: boolean
  showcaseTitle?: string
  createdAt: string
}

export interface Character {
  id: UUID
  workspaceId: UUID
  seriesId: UUID | null
  name: string
  type: 'human' | 'animal' | 'fruit' | 'influencer' | 'object' | 'custom'
  referenceImages: string[]
  voiceId: string | null
  personality: string
  consistencyTier: ConsistencyTier
  gaussianSplatUrl: string | null
  visualEmbedding: number[] | null
}

export interface Series {
  id: UUID
  workspaceId: UUID
  orgId: UUID
  name: string
  niche: string
  format: SeriesFormat
  stylePreset: string
  schedule: { frequency: number; times: string[]; timezone: string; days: number[] }
  platforms: Array<'tiktok' | 'youtube' | 'instagram' | 'facebook'>
  ctaConfig: { type: string; text: string; url?: string }
  brandIntegration: { smartMix: boolean; productSlot?: string }
  status: 'active' | 'paused' | 'archived'
  nextGenerationAt: string | null
}

export interface Episode {
  id: UUID
  seriesId: UUID
  scenarioId: UUID | null
  episodeNumber: number
  topic: string
  script: { scenes: Array<{ index: number; prompt: string; duration: number; characterIds: UUID[] }> }
  status: 'draft' | 'generating' | 'review' | 'approved' | 'scheduled' | 'posted' | 'failed'
  childJobIds: UUID[]
  creditsUsed: number
}

export interface Preset {
  id: UUID
  name: string
  kind: 'viral' | 'effect' | 'camera'
  recipe: {
    model: ModelId
    promptDelta: string
    camera?: CameraMove
    postFx?: string[]
    capability?: Capability
  }
}

export interface BrandKit {
  logoSceneUrl: string | null      // manual, in-scene
  logoSocialUrl: string | null     // auto, post chrome
  colors: string[]
  fonts: Record<string, string>
  voiceId: string | null
  website: string | null
  products: Array<{ name: string; imageUrl: string; url?: string }>
  embedding: number[] | null
}
```

---

## SLICE A — MONEY OS

### A1. clip-pricing.ts

```ts
export function variantMultiplier(n: 1 | 2 | 4) {
  if (n === 4) return 2
  return 1 // 1 or 2 variations = 1×
}

export function baseCredits(opts: {
  durationSec: 5 | 10
  resolution: '720p' | '1080p'
}) {
  // LOCKED TESTED RULE: 5s 720p pick-2 = 1
  if (opts.durationSec === 5 && opts.resolution === '720p') return 1
  if (opts.durationSec === 5 && opts.resolution === '1080p') return 2
  if (opts.durationSec === 10 && opts.resolution === '1080p') return 4
  return 2
}

export function quoteCredits(input: {
  durationSec: 5 | 10
  resolution: '720p' | '1080p'
  multiGenCount: 1 | 2 | 4
  audioType: AudioType
  directorMode: boolean
  capability: Capability
  exportGlb: boolean
}) {
  let n = baseCredits(input) * variantMultiplier(input.multiGenCount)
  if (input.audioType !== 'none') n *= 2
  if (input.directorMode) n += 1
  if (input.capability === 'avatar_3dgs') n *= 8
  if (input.capability === 'performance_capture') n *= 6
  if (input.exportGlb) n *= 2
  return n
}
```

Free regen: `reason='regen'`, amount 0, still write ledger row for audit.
Edit that changes scene_spec = new generation = full quote.
Template download: 1 download credit unless plan is pro/ultra (amount 0 + reason download + snapshot `{waived:true}`).

### A2. clip-ledger.ts

```ts
export async function appendLedger(tx, row: Omit<CreditLedgerRow, 'id' | 'createdAt' | 'balanceAfter'> & { balanceAfter?: number })
export async function getLedger(workspaceId: UUID, limit = 50)
export async function findExisting(reason, referenceId, creditType, variationIndex?): CreditLedgerRow | null
```

Rules:
- Never update/delete ledger rows.
- Same transaction as balance mutate.
- Idempotent: if row exists for (reason, referenceId, creditType, variationIndex), return existing, do not debit again.
- balanceAfter is computed from current balance AFTER the mutation.

### A3. clip-credits.ts (rewrite against ledger)

```ts
reserveAi({ workspaceId, jobId, amount, snapshot })
chargeAi({ workspaceId, jobId, amount, snapshot })  // reserved → charged; if already charged, no-op
refundAi({ workspaceId, jobId, amount, snapshot })  // only if charged or reserved and ALL child jobs failed
grantPlan({ workspaceId, plan }) // House/Studio plan pick
consumeDownload({ workspaceId, templateId, plan })
```

Plan grants (local Stripe stub stays):
- free: ai 30, download 10
- starter: ai 50, download 10
- pro: ai 300, download waived
- ultra: ai 500, download waived

House $990 buyer later calls `grantPlan({ plan:'ultra', reason:'plan_grant', referenceId: houseOrderId })`.

### A4. Home UI
Show: ai / download / rollover / nextReset / last 20 ledger rows (reason, amount, when, job link).

### A5. Tests (must keep existing behavior)
1. 5s 720p pick-2 → reserve 1 → success charge 1. Ledger: −1 generation.
2. 4 variants 5s 720p → 2 credits.
3. All variants fail → refund +1, net 0.
4. Replay charge with same jobId → still −1 total.
5. Free regen → ledger regen amount 0, balance unchanged.
6. Pro template download → amount 0 waived.
7. Starter template download → −1 download.

Do not implement Stripe money movement.

---

## SLICE B — INTELLIGENCE OS

### B1. clip-quality.ts (client-safe, no secrets)

Run on every keystroke (debounce 300ms) AND before preview/animate/episode-review/future-post.

Error (blocks): missing_subject, barrier_detected, multiple_subjects
Warning: action_verb, white_background, no_popout_vector, vague_environment, missing_camera
Info: text_too_long, disclosure_needed

Score: 100 − 20*errors − 10*warnings − 2*infos, clamp 0–100.
`blocking = issues.some(i => i.severity==='error')`

### B2. clip-optimizer.ts

`optimize(raw, refs, aspect) -> { sceneSpec, optimizedPrompt, qualityReport }`

Deterministic stub (no LLM required):
- Force pattern: `A ${subject} in ${environment}`
- Strip action verbs into `pendingActions[]` (Director can consume)
- Inject facing camera + popout if missing
- aspect-specific framing note (9:16 full body, 1:1 product close)

Optional later: server function calls small LLM; same return type.

### B3. Preview step
Persist qualityReport + sceneSpec on a preview record (can be a job at status preprocessing with creditsReserved=0).
Animate button disabled if blocking.
Checklist overlay binds to issues[], not dummy copy.

### B4. Remix payload
When publishing/remixing a video, persist:
`{ rawPrompt, optimizedPrompt, sceneSpec, directorBeats, modelId, aspect, capability, presetId, characterIds }`
Remix route prefills Make with that object.

---

## SLICE C — CONTROL OS

### C1. clip-director.ts

Parse ending text + chips → DirectorBeat[].

Chips (store as beats, not just labels):
- Wave → `{ time:'end', action:'wave', target:'camera' }`
- Dance → `{ time:'end', action:'dance' }`
- Handover → `{ time:'end', action:'handover', object:'product', target:'viewer' }`
- Blow kiss
- Product to camera
- Rain → `{ fx:'rain' }`
- Earth zoom → `{ camera:'earth_zoom' }`
- Bullet time → `{ camera:'bullet_time' }`

Custom textarea merges after chips. LLM parser later; v1 is keyword + chip map.

### C2. two_stage
`two_stage = directorMode && !provider.supportsNativeExtend(modelId)`
Mock: `supportsNativeExtend=false` → two_stage true. Stamp last-beat label on poster metadata so gallery shows “ending: wave + handover”.

### C3. clip-presets.ts — seed 8 recipes

| id | name | kind | promptDelta / camera / fx |
|---|---|---|---|
| p1 | Pop Out Hero | camera | facing camera, tilt toward viewer / static |
| p2 | Earth Zoom | camera | satellite punch-in / earth_zoom |
| p3 | Bullet Time | camera | orbit freeze / bullet_time |
| p4 | Rain Ending | viral | wet asphalt reflections / fx rain |
| p5 | Product Hand | viral | handoff to lens / handover |
| p6 | Squish | effect | cartoon squash / effect_preset |
| p7 | Melt | effect | viscous melt / effect_preset |
| p8 | Ink Riot | viral | ink burst transition |

Presets do not call extra GPU. Mock appends promptDelta onto optimizedPrompt.

### C4. Animate UI
Director dropdown + chips + custom ending + sound toggle + live quoteCredits() + 2/4 selector.
Persist camera + beats + presetId on job before reserve.

---

## SLICE D — IDENTITY OS

### D1. clip-brand.ts
`applyBrand(sceneSpec, kit, surface: 'scene' | 'social')`
- scene: do NOT auto-stamp logo; expose manual slot
- social: auto layout logoSocial + colors + default caption chrome (even if render is poster overlay text)

### D2. Characters CRUD under /studio/characters (or series nested)
Fields from schema. Default consistencyTier='ref_i2v'.
gaussianSplatUrl nullable. visualEmbedding nullable array.

When a Make job includes characterIds, copy referenceImages into job.refs and set capability keyframe_i2v unless user picked avatar_3dgs.

### D3. Templates Smart Mix
Each template slot may include:
`{ id, type, smartMix?: 'logo_social' | 'product' | 'never' }`
customizeTemplate: if brandIntegration.smartMix, inject product image into product slots only when script/scene has no barrier errors.

Keep 12 templates. Add smartMix field; do not author 2000 assets.

---

## SLICE E — NETWORK OS (second business, still mock)

### E1. clip-series.ts
CRUD series. `generateEpisode(seriesId, topic?)`:
1. Build script from format contract (below).
2. Create Episode status=generating.
3. For each scene, create child VideoJob with parentId, seriesEpisodeId, scene prompt, shared character refs.
4. Reuse clip-jobs + credits (sum quotes, one reserve on parent).
5. On all children complete → episode review.
6. “Post” button sets status=posted and writes platforms_posted stub `{ mock: true }`. No OAuth.

### E2. Five format contracts (not 30)

**faceless** — 5 scenes × 6s: hook, setup, proof, twist, cta  
**character_explainer** — 5 scenes, requires ≥1 character  
**top5** — intro + 5 items + cta (7 beats)  
**narrative** — hook, inciting, rise, climax, resolve  
**ugc** — hook, problem, demo, result+cta; product slot required if Smart Mix on

Each contract: `{ beats: string[], defaultDuration, requireCharacter, requireProduct }`.

### E3. Route
`/studio/series` list/create  
`/studio/series/$id` episodes + generate + review  
Do not auto-cron yet. Expose `nextGenerationAt` field only.

### E4. Checkpoint
Parent episode stores `{ step, childJobIds }`. If process dies after scene 2, resume scene 3. Mirror tube-assistant state.json inside episode.script.meta.checkpoint.

---

## SLICE F — 3D OS (no training)

### F1. clip-3d.ts

```ts
export const THREE_D = {
  parallax25d: { status: 'stub', use: 'template stills' },
  keyframeI2v: { status: 'routable', providers: ['luma','kling','veo'] },
  gaussianAvatar: {
    status: 'stub',
    captureMinutes: 2,
    stages: ['identity_capture','motion_prior','voice_clone','lip_sync','render_refine'],
    export: ['glb','mp4'],
  },
  actOne: { status: 'investigate', provider: 'runway-gen4' },
  genieMesh: { status: 'investigate', use: 'product hero' },
  worldModel: { status: 'watch', provider: 'runway-gwm' },
}

export function selectCapability(intent: {
  wantGlb?: boolean
  wantAvatar?: boolean
  wantActOne?: boolean
  wantParallax?: boolean
  camera?: CameraMove
}): Capability
```

### F2. Studio “3D / Camera” drawer
Toggles: orbit notes, multi-angle, export GLB, avatar capture later, Act-One later.
Writes capability + camera + exportGlb onto job. quoteCredits updates live.
Mock posters gain a badge: `capability=diffusion_2d camera=orbit glb=false`.

### F3. Provider methods (types only until keys exist)

```ts
interface VideoProvider {
  id: ModelId
  supportsNativeExtend: boolean
  supportsKeyframes: boolean
  supportsAudio: boolean
  supportsAvatar: boolean
  t2v(req): Promise<ProviderResult>
  i2v(req): Promise<ProviderResult>
  keyframe?(start, end, req): Promise<ProviderResult>
  extend?(lastFrame, beats, req): Promise<ProviderResult>
  applyEffect?(effectId, req): Promise<ProviderResult>
  avatarRender?(script, beats, req): Promise<ProviderResult>
  motionBrush?(req): Promise<ProviderResult>
}
```

Runway Gen-4 id exists on router. No live key required.

---

## SLICE G — DISTRIBUTION SEAMS

### G1. clip-mcp.ts / TanStack server functions
`createPreview` `createAnimateJob` `regenerateVideo` `remixVideo` `createEpisode` `quoteCredits` `listLedger`
These are the MCP tools later. Implement as server functions now.

### G2. clip-ad-remake.ts
Input: URL string.
Output stub storyboard:
`{ sourceUrl, guessedFormat, scenes: SceneSpec[], notes: 'vendor analysis later' }`
UI: paste URL on Make or Series → prefills beats. No scraping of private video bytes beyond public oEmbed if easy; otherwise accept user-pasted transcript.

### G3. Pro model picker
If plan pro/ultra, Make shows ModelId select defaulting to router suggestion. Starter hides picker, shows “Auto”.
Always store routeReasons.

### G4. .env.example
```
FAL_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
LUMA_API_KEY=
RUNWAY_API_KEY=
ELEVENLABS_API_KEY=
STRIPE_SECRET_KEY=
# empty = mock
```

---

## ROUTER (clip-router.ts) — ship with Slice C

```
if capability avatar_3dgs → avatar-3dgs (mock if no key)
else if refs && character → fal-seedance || fal-kling || mock
else if audio !== none → veo || sora || mock
else if director || camera exotic → luma || runway-gen4 || two_stage mock
else if product-like sceneSpec → veo || mock
else if plan free/starter → fal-kling || mock
else → veo || fal-kling || mock
```
Return `{ modelId, params, reasons[], twoStage }`.

---

## P2 CONTRACTS (do not build until G is running)

### H. Timeline editor
Consume LayerBundle. Scene → tracks → blocks {timeOffset, duration}. CE.SDK or Remotion later. Schema already has layers?.

### I. Avatar vendor wrap
Do not train 3DGS. Wrap a vendor. Bill via capability multiplier. Identity verification flag on Character. 5-stage comments already in clip-3d.ts.

### J. Layered re-render
`reRenderLayer(projectId, layerName, newAsset)` < fake 10s in mock.

### K. Auto-post OAuth
TikTok/YouTube/IG. Quality OS + AI disclosure checkbox. Watermark policy.

### L. Agency
org pooled credits, sub-workspaces, custom domain later. schema already has orgId.

### M. Small router reward
From selectedVariationIndex vs siblings. Not DiT DPO.

### N. House Skills
Saved workflows (Make recipe, Ad Remake, Series weekly). Sold beside $990 file. Still separate checkout.

### O. Never in this repo
Train IV-VAE / Asymmetric DiT / 64×H100 / $0.01/video claims / Next.js rewrite.

---

## ACCEPTANCE PER SLICE

A: Home ledger + tested 1-credit pick-2 + refund + idempotency  
B: blocking checklist, sceneSpec on job, remix prefills spec  
C: chips persist beats, quote changes with director/audio, 8 presets  
D: brand split, character refs flow into job.refs  
E: one faceless episode creates N child jobs and review state  
F: drawer persists capability without breaking mock posters  
G: server fns exist; ad remake stub; Pro picker  

---

## PASTE ORDER INTO GROK BUILD

1. “Read clip-* and implement Slice A + the FULL schema types from STUDIO-NEXT-STEPS.md section 1. Do not implement B–G logic yet, only types.”
2. “Execute Slice B only.”
3. “Execute Slice C + router.”
4. “Execute Slice D.”
5. “Execute Slice E.”
6. “Execute Slice F.”
7. “Execute Slice G.”
8. Stop. Demo. Then pick H–N.
