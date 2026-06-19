export const meta = {
  name: 'aplusplus-frontdoor-grade',
  description: 'Independent A++ critic panel grading the GSE front door + Phase-0 consolidation',
  phases: [
    { title: 'Grade' },
    { title: 'Verify' },
  ],
}

// The locked bar each critic grades against. A++ = best-in-class, ship-to-the-
// world quality with zero blocking issues. Anything with a real blocking issue
// is "below". Each critic is independent and adversarial: assume it's NOT A++
// until the evidence proves otherwise.
const RUBRIC = `
You are an INDEPENDENT, adversarial design/quality critic for Galaxy Sports Edge (GSE),
a sports-intelligence product positioning itself as the best overall website of 2026.
Grade your assigned dimension HONESTLY. Default to a lower grade unless the evidence is
strong. A++ means best-in-class and ZERO blocking issues. Read the real files before judging.

GROUND TRUTH (the recovered founder voice — do NOT invent a new one):
- "know it / review it / weight it / score it"; quiet earned confidence; restraint over density.
- AI is an honest tool, never hidden, never sounding machine-written.
- FORBIDDEN literal line anywhere: "we're not AI".
- Banned AI-template copy tells: unleash, supercharge, seamless, leverage, dive in,
  "in today's fast-paced world", elevate, unlock your, level up, reflexive triads,
  hollow superlatives, em-dash salad.
- Loader-backed metrics only: no win-rate / ROI / percentage shown unless gated + loader-backed.

THE LOCKED 10-SECOND TEST: a first-time visitor on / can, within 10 seconds, state
(1) WHAT GSE is (sports intelligence, not a sportsbook; checkable signal),
(2) WHO it's for (people making sports decisions who want the reasoning),
(3) WHERE to click by intent (Enter today's board / See a sample read / Join the Founding Desk).

Return ONLY the structured verdict. grade is one of: "A++","A+","A","B","below".
`

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['dimension', 'grade', 'isAPlusPlus', 'evidence', 'blocking_issues', 'fixes'],
  properties: {
    dimension: { type: 'string' },
    grade: { type: 'string', enum: ['A++', 'A+', 'A', 'B', 'below'] },
    isAPlusPlus: { type: 'boolean' },
    evidence: { type: 'string', description: 'Concrete, file-cited justification for the grade' },
    blocking_issues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['issue', 'file', 'severity'],
        properties: {
          issue: { type: 'string' },
          file: { type: 'string' },
          severity: { type: 'string', enum: ['blocking', 'major', 'minor'] },
        },
      },
    },
    fixes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['what', 'file'],
        properties: {
          what: { type: 'string' },
          file: { type: 'string' },
          suggestion: { type: 'string' },
        },
      },
    },
  },
}

const DIMENSIONS = [
  {
    key: 'ten_second_clarity',
    prompt: `Grade the 10-SECOND CLARITY of the front door. Read apps/web/app/page.tsx
(the hero through the first viewport) and docs/visual-qa/2026-06-18/home-hero-desktop.png +
home-hero-mobile.png if present. Can a first-timer answer WHAT/WHO/WHERE-to-click in 10s,
above the fold, without scrolling? Is the positioning line present and unambiguous? Are the
three intent CTAs present and unmistakable? Penalize jargon, buried value, or competing CTAs.`,
  },
  {
    key: 'copy_no_ai_smell',
    prompt: `Grade COPY for AI-smell across the public front door. Read apps/web/app/page.tsx,
apps/web/app/accountability/page.tsx, apps/web/components/ui/nav.tsx. Hunt for any banned
template tell, hollow superlative, reflexive triad, em-dash salad, or the forbidden "we're not AI".
Quote any offending line with its file. A++ = reads operator-written, zero tells.`,
  },
  {
    key: 'visual_no_ai_template',
    prompt: `Grade the VISUAL SYSTEM for distinctiveness vs templated defaults. Read
apps/web/lib/brand.ts, apps/web/app/globals.css, apps/web/tailwind.config.ts, and the hero
markup in apps/web/app/page.tsx. Judge: is there a coherent, intentional, non-generic visual
language (type scale, color tokens, motion, layout) — or does it read as a bootstrapped template?
Cite specific tokens/classes. Note any inconsistency that breaks the system.`,
  },
  {
    key: 'founder_voice',
    prompt: `Grade FOUNDER-VOICE CONSISTENCY. Read apps/web/app/page.tsx,
apps/web/app/accountability/page.tsx, apps/web/lib/brand.ts. Is the recovered voice
(know it/review it/weight it/score it; AI-as-honest-tool; quiet earned confidence; restraint)
maintained consistently? Flag any drift into hype or machine-voice. Confirm "we're not AI"
appears nowhere.`,
  },
  {
    key: 'consolidation_contract',
    prompt: `Grade CONSOLIDATION CORRECTNESS against the contract. Read
reports/consolidation/SURFACE_CONSOLIDATION_MAP.md, then apps/web/next.config.mjs (redirects),
apps/web/middleware.ts (PROTECTED_ROUTES), apps/web/components/ui/nav.tsx,
apps/web/components/ui/mobile-nav.tsx, apps/web/app/sitemap.ts, apps/web/app/accountability/page.tsx.
Verify: /picks→/board, /stats/players→/players, /gsn→/the-beat, /brief→/founding-desk are present;
/today is behind auth and removed from nav+sitemap; reliability+proof are represented within
/accountability; merged routes are not submitted in the sitemap; changes are reversible. Flag any
contract item missing or any broken internal link.`,
  },
  {
    key: 'accuracy_proof_honesty',
    prompt: `Grade ACCURACY-PROOF HONESTY. Read apps/web/app/accountability/page.tsx,
apps/web/app/reliability/page.tsx (first ~120 lines), apps/web/app/proof/page.tsx (first ~120 lines).
Confirm every performance claim is gated + loader-backed (no fabricated win-rate/ROI/percentage,
honest empty/gated states present). Flag any number shown that is not provably loader-backed.`,
  },
]

phase('Grade')
const verdicts = await pipeline(
  DIMENSIONS,
  (d) =>
    agent(`${RUBRIC}\n\nDIMENSION: ${d.key}\n\n${d.prompt}`, {
      label: `grade:${d.key}`,
      phase: 'Grade',
      schema: VERDICT_SCHEMA,
    }),
  // Verify stage: for any dimension graded below A++, a second independent critic
  // confirms the blocking issues are real (not nitpicks) before we act on them.
  (verdict, d) => {
    if (!verdict) return null
    if (verdict.isAPlusPlus && verdict.grade === 'A++') return { ...verdict, verified: true }
    return agent(
      `${RUBRIC}\n\nA first critic graded dimension "${d.key}" as ${verdict.grade} with these ` +
        `blocking issues:\n${JSON.stringify(verdict.blocking_issues, null, 2)}\n\n` +
        `Independently VERIFY: are these real, ship-blocking problems, or nitpicks? Read the same ` +
        `files. Return your own verdict for the SAME dimension — confirm "below"/"A"/"A+" only if the ` +
        `issues are real; upgrade to "A++" if the first critic over-penalized.`,
      { label: `verify:${d.key}`, phase: 'Verify', schema: VERDICT_SCHEMA },
    ).then((v) => (v ? { ...v, verified: true, firstPass: verdict.grade } : { ...verdict, verified: false }))
  },
)

const clean = verdicts.filter(Boolean)
const belowAPP = clean.filter((v) => !(v.isAPlusPlus && v.grade === 'A++'))
return {
  summary: clean.map((v) => ({ dimension: v.dimension, grade: v.grade })),
  allAPlusPlus: belowAPP.length === 0,
  belowAPlusPlus: belowAPP,
  verdicts: clean,
}
