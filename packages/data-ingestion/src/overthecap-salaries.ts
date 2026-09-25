export const OVERTHECAP_SALARIES_SOURCE_ID = "overthecap-salaries";
export const OVERTHECAP_SALARIES_BASE = "https://overthecap.com";

export interface OverTheCapSalaryRow {
  readonly player: string;
  readonly position: string;
  readonly capHit: number;
  readonly capHitMillions: number;
  readonly team: string | null;
}

export class OverTheCapSalaryError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "OverTheCapSalaryError";
  }
}

type Env = Readonly<Record<string, string | undefined>>;

export function isOverTheCapSalariesEnabled(env: Env = {}): boolean {
  return env["OVERTHECAP_SALARIES_ENABLED"] === "1";
}

function finiteOrNull(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/[$,]/g, "")) : Number.NaN;
  return Number.isFinite(n) ? n : null;
}

/** Parse a provider row without assuming undocumented field names. */
export function parseOverTheCapSalaryRow(row: Record<string, unknown>): OverTheCapSalaryRow | null {
  const player = String(row.player ?? row.name ?? row.player_name ?? "").trim();
  const position = String(row.position ?? row.pos ?? "").trim();
  const capHit = finiteOrNull(row.cap_hit ?? row.capHit ?? row.cap_hit_millions ?? row.capHitMillions);
  if (!player || !position || capHit === null || capHit <= 0) return null;
  const capHitMillions = capHit < 1000 ? capHit : capHit / 1_000_000;
  const teamValue = row.team ?? row.current_team;
  return { player, position, capHit, capHitMillions, team: teamValue == null ? null : String(teamValue) };
}

export class OverTheCapSalariesClient {
  constructor(
    private readonly env: Env = {},
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async getSalaries(path = "/contracts"): Promise<readonly OverTheCapSalaryRow[] | null> {
    if (!isOverTheCapSalariesEnabled(this.env)) return null;
    const url = new URL(path, OVERTHECAP_SALARIES_BASE);
    const response = await this.fetchImpl(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!response.ok) throw new OverTheCapSalaryError(`OverTheCap salary HTTP ${response.status}`, response.status);
    const body: unknown = await response.json();
    if (!Array.isArray(body)) throw new OverTheCapSalaryError("OverTheCap salary response was not an array");
    return body
      .filter((row): row is Record<string, unknown> => row !== null && typeof row === "object")
      .map(parseOverTheCapSalaryRow)
      .filter((row): row is OverTheCapSalaryRow => row !== null);
  }
}
