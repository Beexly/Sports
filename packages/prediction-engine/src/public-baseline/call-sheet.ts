/**
 * The call sheet. The ledger kept the film. This decides.
 *
 * A later designation beats an earlier status graphic.
 * A deleted video does not beat a designation.
 * You install the modal tendency. The weighted number is the expectation, not a hiding place.
 * You do not fade a team for a body count. You sit the man who is out.
 * If your tendency is what they are built to punish, you change it.
 * None of this mints a ticket. Pricing happens later, in calibration-map.ts,
 * and only when the isotonic calibration and contradiction gate both pass.
 */
import type { CoachPost } from "./x-corpus.js"
import { publishFromCorpus, type CoachPublished } from "./corpus-ledger.js"

/**
 * A priced ticket. The call sheet itself never fills this in; it is minted by
 * signCallSheetTickets() in calibration-map.ts after the calibrated edge clears
 * the threshold and the contradiction gate allows the direction.
 */
export type SignedTicket = {
  readonly callId: string
  readonly marketLabel: string
  readonly americanOdds: number
  readonly noVigImpliedProb: number
  readonly rawModelProb: number
  readonly calibratedProb: number
  readonly edgePct: number
  readonly kellyQuarterUnits: number
}

export type Call = {
  id: string
  install: string
  expectation: string | null
  alert: string
  willNot: string
  /** Null until a signed ticket clears the gate. Never a placeholder price. */
  ticket?: SignedTicket | null
}

function text(posts: readonly CoachPost[], id: string): string {
  const found = posts.find((post) => post.postId === id)
  if (!found) throw new Error(`call sheet missing post ${id}`)
  return found.text
}

function has(posts: readonly CoachPost[], id: string, needle: string): boolean {
  return text(posts, id).includes(needle)
}

export function callSheet(posts: readonly CoachPost[], published: CoachPublished): Call[] {
  if (!has(posts, "2113699922398646589", "exactly the way you would want to against the Ravens")) {
    throw new Error("call sheet refused: the Bengals tendency was not in the film")
  }
  if (!has(posts, "2113703878055120903", "82% of his yards from the slot")) {
    throw new Error("call sheet refused: the Flowers slot split was not in the film")
  }
  if (!has(posts, "2113476885103407198", "6-0 because they had the depth")) {
    throw new Error("call sheet refused: the 49ers record was not in the film")
  }
  const laterOut = has(posts, "2113738867526475833", "Zach Charbonnet (out, knee)")
  const earlierIn = has(posts, "2113708686233190644", "Charbs (SEA)")
  const video = has(posts, "2113766919216185736", "video was deleted")
  if (!laterOut || !earlierIn || !video) throw new Error("call sheet refused: the Charbonnet sequence is incomplete")

  const film = text(posts, "2113699922398646589")
  const blitzed = Number(/when blitzed \(([-\d.]+)\)/.exec(film)?.[1])
  const unblitzed = Number(/without a blitz \(([-\d.]+)\)/.exec(film)?.[1])
  const blitzRate = Number(/lowest rate \(([\d.]+)%\)/.exec(film)?.[1]) / 100
  if (![blitzed, unblitzed, blitzRate].every(Number.isFinite)) {
    throw new Error("call sheet could not read the Ravens split")
  }

  return [
    {
      id: "401873012-dropback",
      install: `Cincinnati does not blitz. Practice the unblitzed dropback, ${unblitzed} EPA. Pressure still comes at ${published.balCin.pressureRate}.`,
      expectation: `If they stay at their ${blitzRate} blitz rate, the weighted dropback is ${published.balCin.dropbackEpa}.`,
      alert: `If they blitz, the cell flips to ${blitzed}. That is the call that helps the Ravens.`,
      willNot: "Will not install the weighted number. The blend hides the tendency.",
    },
    {
      id: "401873012-where-the-ball-goes",
      install: "Ravens ball lives in the slot to Zay Flowers. 82% of his yards are there, and he is more than 10X as efficient. Cincinnati is a slot funnel and bottom-5 against slot receivers.",
      expectation: "Ja'Marr Chase is the Bengals' answer: 14.5 targets, 174.8 yards, 34.5 FPG against Baltimore since 2024. The coverage rule is him.",
      alert: "Outside receivers are the wrong test. Cincinnati allows the fewest outside yards and the best outside passer rating.",
      willNot: "Will not call a generic Ravens-stars plan, and will not test them outside.",
    },
    {
      id: "401873012-lamar",
      install: "Two scripts. He has been practicing and the lean is that he plays. The Friday designation is questionable, ankle, and it beats the earlier graphic that listed him in.",
      expectation: null,
      alert: "The rush script is docked. The film flags Lamar rushing on a high ankle and does not give a backup dropback number.",
      willNot: "Will not mark him in, and will not zero the offense.",
    },
    {
      id: "SF-personnel",
      install: "Sit Evans. Samuel is out. The room is Kirk, Cooks, Watkins, Cowing. Cooks' route share went from 23% to 83% when Evans left. Kittle's target share in that game was 44%.",
      expectation: "They are 6-0 with 17 players out and 5 of 6 starting receivers missing. The depth has been the team.",
      alert: "38% of the targets are vacated. Watkins and Cowing have to earn them. The film does not assign the split.",
      willNot: "Will not fade San Francisco for the body count.",
    },
    {
      id: "SF-coverage-vs-london",
      install: "Do not live in zone against Drake London. San Francisco plays zone above 80%. His YPRR doubles against it: 2.86 versus 1.57 against man.",
      expectation: null,
      alert: "If the 49ers change the tendency and play man, his number is the ordinary one.",
      willNot: "Will not trust the zone tendency just because it is theirs.",
    },
    {
      id: "SEA-KC",
      install: "Charbonnet is out. The Friday designation beats the earlier graphic that had him in, and a deleted video does not overrule it. Kansas City is one of the two best run defenses. The run is not the path.",
      expectation: null,
      alert: "Seattle plays mostly zone. Mahomes wants the short area against that, and Kelce is the man who feasts. The check is to get out of zone.",
      willNot: "Will not install a two-back package with Charbonnet this week. That look is next week against the Bears, if both are up.",
    },
    {
      id: "NYJ-zone-run",
      install: "On zone runs the back is Braelon Allen, 4.77 YPC, not Breece Hall at 2.93.",
      expectation: null,
      alert: "The gap is on zone runs only. It is not a license to hand Allen the whole game.",
      willNot: "Will not split the carries evenly because both are on the roster.",
    },
    {
      id: "TEN-boston",
      install: "If Tennessee is in zone, Boston's number is 2.39 YPRR. If they are two-high, it is 3.33. They do both at a high rate.",
      expectation: null,
      alert: "Against man he is 0.36. Against single-high he is 0.53. Those are different calls.",
      willNot: "Will not average the four shells into one number. Zone and two-high are not a partition.",
    },
  ]
}
