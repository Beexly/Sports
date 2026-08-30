/**
 * Why a game appears on the board with no published pick — ONE definition, two
 * call sites.
 *
 * `/board` renders these rows in two separate lanes: the Pass List
 * (`loadBoardPasses`, ./passes.ts) and Gated Today (`loadBoardState`,
 * ./state.ts). Both lanes can describe the SAME game on the same request.
 *
 * They previously derived the reason independently, and had already drifted:
 * the Pass List checked market depth AND evidence health, while Gated Today
 * checked only market depth. A game with healthy books but poor evidence health
 * therefore read "Evidence health below publish threshold." in one lane and a
 * different reason in the other, simultaneously, on one page. Two stories about
 * one game is the sort of thing a reader is entitled to notice.
 *
 * Sharing the function makes that drift impossible rather than merely fixed.
 *
 * WHAT THESE ROWS ARE, and why the wording is load-bearing. They come from a
 * `picks: { none: ... }` query — a game is here because no published pick
 * EXISTS for it, not because anything evaluated it and declined. The UI frames
 * them as passes ("Pass List", "Gated Today", "Scored, published, and passed"),
 * and a pass reads as a decision, so this string is the only thing standing
 * between "our pipeline never reached this game" and a public claim that we
 * considered it and said no.
 *
 * The first two branches name a real deficiency readable off the game row, so
 * they are honest statements about why nothing could be priced. The third
 * cannot be: with adequate depth and adequate evidence, an absent pick means
 * nothing reached the model — the generator may not have run, may have errored,
 * or may not cover this sport.
 *
 * It previously read "No pick cleared the publish threshold", asserting the
 * opposite: that a judgement was made and the pick fell short. That is the
 * collapse /board/gate teaches against and /integrity claims we prevent — a
 * considered refusal and a silent disappearance are different facts, and only
 * one of them says anything about the game.
 *
 * "Not evaluated" is deliberately /board/gate's own vocabulary, so the same
 * distinction is named in the same words everywhere rather than re-taught in a
 * second dialect.
 *
 * NOT for rows backed by a real `gateDecision`. Those carry `decision.reason`,
 * which IS a genuine judgement, and must pass through verbatim — softening a
 * real refusal into "not evaluated" would discard the product's best evidence
 * and under-claim exactly as badly as the original over-claimed.
 */

/** Market depth below which no honest two-sided price can be formed. */
export const MIN_BOOKMAKER_COVERAGE = 3;

/** Evidence-health floor, matching the publish pipeline's own threshold. */
export const MIN_DATA_QUALITY_SCORE = 70;

export function unevaluatedPassReason(
  bookmakerCoverageMax: number,
  dataQualityScore: number,
): string {
  if (bookmakerCoverageMax < MIN_BOOKMAKER_COVERAGE) {
    return "Market depth below publish threshold.";
  }
  if (dataQualityScore < MIN_DATA_QUALITY_SCORE) {
    return "Evidence health below publish threshold.";
  }
  return "Not evaluated: no pick was generated for this game today.";
}
