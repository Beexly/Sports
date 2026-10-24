import { NextResponse } from "next/server"
import { publicPrior, shouldWithhold, SHOWDOWN_CAP } from "@sports/prediction-engine/src/public-baseline/index.js"

export const dynamic = "force-dynamic"

/** Public prior only. The coach simulator does not import this route. */
export function GET() {
  const prior = publicPrior({ site: "CIN" })
  return NextResponse.json({
    prior,
    quietShiftWithheld: shouldWithhold(0),
    showdownCap: SHOWDOWN_CAP,
    coachEngine: "does not consume this prior",
  })
}
