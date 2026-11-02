/** What the 2026-10-24 sweep actually established. Identity gates are not engines. */

export type SourceStatus = "PUBLIC-CODE" | "PUBLIC-ARCHIVE" | "OPEN-HTML" | "WIRED" | "IDENTITY-GATED" | "DEAD" | "NOT-NFL"

export type SourceRow = { id: string; status: SourceStatus; note: string }

export const SOURCE_REGISTRY: readonly SourceRow[] = [
  { id: "fivethirtyeight-nfl-elo", status: "PUBLIC-CODE", note: "forecast.py team Elo. No QB term in that file." },
  { id: "nflfastR-epa-wp", status: "PUBLIC-CODE", note: "Measurement kernel. Do not reimplement." },
  { id: "nfl4th", status: "PUBLIC-CODE", note: "Go / FG / punt composition." },
  { id: "advancednflstats", status: "PUBLIC-ARCHIVE", note: "Burke EPA / WP / 4th-down provenance." },
  { id: "nfelo", status: "PUBLIC-CODE", note: "No visible license. Diff the prior blend. Do not vendor. Market regression stays outside the coach engine." },
  { id: "nflverse", status: "WIRED", note: "Play-by-play spine." },
  { id: "pff", status: "IDENTITY-GATED", note: "Phoenix + Clerk. Grades not confirmed. Do not bypass isSubscribed." },
  { id: "sportsline-optimizer", status: "IDENTITY-GATED", note: "Health endpoint answers OK. Routes are premium. Not a model." },
  { id: "props-cash", status: "IDENTITY-GATED", note: "Express API exists. Engine not public." },
  { id: "unabated", status: "IDENTITY-GATED", note: "Tools sit behind login." },
  { id: "oddsjam", status: "IDENTITY-GATED", note: "Paid API. Free books already cover the screen." },
  { id: "ftn-premium", status: "IDENTITY-GATED", note: "In-season charting join stays on the public cube path." },
  { id: "sumer", status: "IDENTITY-GATED", note: "WAR tools are an account, not a scan." },
  { id: "impect", status: "NOT-NFL", note: "Soccer." },
  { id: "scoutium", status: "NOT-NFL", note: "Soccer." },
  { id: "sp-plus", status: "NOT-NFL", note: "College. 538 NFL is Elo, not SP+." },
  { id: "statmuse", status: "OPEN-HTML", note: "Ask pages render answers. JSON API host exists. Routes are not a model yet." },
  { id: "kaggle-big-data-bowl", status: "PUBLIC-CODE", note: "Tracking layer is a Kaggle dataset. Token stays with the owner. Not a headless login." },
  { id: "espn-scoreboard", status: "WIRED", note: "Public NFL scoreboard. Home comes from homeAway, not array order. A scheduled 0 is unplayed." },
  { id: "basketball-reference", status: "OPEN-HTML", note: "Sports-Reference site is open. PFR itself is behind Cloudflare." },
  { id: "baseball-reference", status: "OPEN-HTML", note: "Sports-Reference site is open." },
  { id: "hockey-reference", status: "OPEN-HTML", note: "Sports-Reference site is open." },
  { id: "pfr", status: "IDENTITY-GATED", note: "Cloudflare wall. archive.org is the public ladder. Do not replay a session." },
  { id: "pydfs-lineup-optimizer", status: "PUBLIC-CODE", note: "MIT. MILP, stacking, exposure, showdown. This is the lineup layer. Projections stay ours." },
  { id: "draftfast", status: "PUBLIC-CODE", note: "Pin, ban, and exact-count constraints." },
  { id: "southpaw", status: "PUBLIC-CODE", note: "FanDuel lineup submit. Automation, not a projection." },
  { id: "numberfire", status: "OPEN-HTML", note: "Free projection pages. FanDuel Research. Feed, not an optimizer." },
  { id: "pickfinder", status: "IDENTITY-GATED", note: "api-v2.pickfinder.app is referenced in HTML. Routes are not a confirmed public feed." },
  { id: "fantasypros", status: "IDENTITY-GATED", note: "isPremium. Consensus pages are not the optimizer." },
  { id: "the-odds-api", status: "IDENTITY-GATED", note: "Free tier is an account the owner creates. No headless signup." },
  { id: "365scores", status: "WIRED", note: "Public JSON. American football is sports=6. NFL competition is 352. Bare /current with no sport is an empty shell." },
  { id: "flashscore", status: "IDENTITY-GATED", note: "Feed host is up. x-fsign rotates. Not harvested." },
]
