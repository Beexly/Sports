/**
 * Founder order for the quote provider. Default is Galaxy.
 * Paid Odds API is opt-in. Does not construct clients; the adapter does.
 * certifiableForLiveGate is not touched here.
 */
export type OddsSelectMode = "galaxy" | "odds-api" | "offline" | "rundown-unwired";

export function selectOddsMode(env: Record<string, string | undefined>): OddsSelectMode {
  const mode = (env["ODDS_PROVIDER"] ?? "").trim().toLowerCase();
  if (mode === "offline") return "offline";
  if (mode === "rundown") return "rundown-unwired";
  if (mode === "odds-api" || mode === "the-odds-api") {
    const key = env["THE_ODDS_API_KEY"]?.trim() ?? "";
    return key ? "odds-api" : "offline";
  }
  return "galaxy";
}
