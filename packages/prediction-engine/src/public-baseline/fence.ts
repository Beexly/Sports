/** Market fields stop here. The coach simulator does not import a price. */

const BANNED = [/spread/i, /moneyline/i, /closing/i, /^close$/i, /^price$/i, /odds/i, /^mr_/i, /market/i, /juice/i]

export class CoachFenceError extends Error {
  readonly key: string
  constructor(key: string) {
    super(`coach fence rejected "${key}"`)
    this.name = "CoachFenceError"
    this.key = key
  }
}

export function assertCoachInputs(input: Record<string, unknown>): void {
  for (const key of Object.keys(input)) {
    if (BANNED.some((re) => re.test(key))) throw new CoachFenceError(key)
  }
}
