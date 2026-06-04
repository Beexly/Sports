/**
 * The Glass Box Cipher — weekly hidden-puzzle engine (shared model).
 *
 * WHY IT'S AI-PROOF & ENGAGING:
 *  - The answer is not a guessable phrase. It is ASSEMBLED from several "shards"
 *    — short opaque tokens hidden on different pages of the LIVE site, rotated
 *    weekly. You cannot paste the puzzle into an AI and get the answer, because
 *    the shards exist only on this week's site, not in any training data.
 *  - The *process* (find the shards, assemble in order, submit) is explained on
 *    the hub, so it's discoverable — hard, not impossible.
 *  - Shard VALUES are server-only. The hub passes the client just labels and
 *    "where to look", never the tokens; the tokens are rendered into the DOM
 *    only on their hiding pages (see components/cipher/cipher-shard.tsx).
 *
 * WHEN IT'S LIVE — the "no-game window":
 *  - Open Monday 11:59am → Thursday 6:59pm America/New_York, sealed otherwise.
 *    Built to pull engagement into the dead stretch when no games are running.
 *
 * REWARD is founder-gated (pre-provisioned codes / manual claim) — see the
 * verify route. Nothing is ever comped autonomously.
 */

export type ShardPage = "intelligence" | "methodology" | "observatory";

export type CipherShard = {
  readonly id: string; // "01"
  readonly label: string; // public name shown on the hub
  readonly page: ShardPage; // where it hides
  readonly where: string; // public "where to look" pointer
  readonly color: string; // brand hex for the hub marker
  readonly value: string; // SERVER-ONLY token; never sent to the hub client
};

export type CipherChapter = {
  readonly week: number;
  readonly codename: string;
  readonly brief: string;
  readonly transmission: readonly string[];
  readonly shards: readonly CipherShard[];
  /** SHA-256 hex of normalizeAnswer(shard01 + shard02 + …). */
  readonly answerHash: string;
  readonly answerLength: number;
  readonly reward: string;
};

/** Strip to [a-z0-9] so "VELA 7C9 DUSK", "vela-7c9-dusk" → "vela7c9dusk". */
export function normalizeAnswer(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const CYAN = "#00E5FF";
const MAGENTA = "#FF2DD6";
const UV = "#7A5CFF";

/**
 * The storyline. Append a chapter per week; the season can build (later answers
 * can lean on earlier ones). Rotation is automatic (see getCipherStatus).
 */
export const CIPHER_CHAPTERS: readonly CipherChapter[] = [
  {
    week: 1,
    codename: "First Light",
    brief:
      "The engine recorded three fragments the instant the field came alive — scattered across the glass box, one to a room. Recover all three, assemble them in order, and you hold the key. The box rewards those who look past the surface.",
    transmission: [
      "▶ TRANSMISSION 001 — origin trace recovered.",
      "Three shards broke loose at first light. Each settled in a different room.",
      "Inspect what most people only read. The engine even talks — open the console.",
      "Assemble shard 01 · 02 · 03 in order, lowercase, no spaces. Bring it back before the window seals.",
    ],
    shards: [
      { id: "01", label: "Vela", page: "intelligence", where: "Inside the engine — where the signal converges.", color: CYAN, value: "VELA" },
      { id: "02", label: "Carrier", page: "methodology", where: "Among the published method — read past the words.", color: MAGENTA, value: "7C9" },
      { id: "03", label: "Dusk", page: "observatory", where: "Out in the observatory — the last light of the day.", color: UV, value: "DUSK" },
    ],
    // sha256("vela7c9dusk")
    answerHash: "3b8d4f7cf32452faf60dab4346c256d47a0eb2ffbbde67e2b2055c73f7b27ea2",
    answerLength: 11,
    reward: "One week of Elite, on us.",
  },
  {
    week: 2,
    codename: "The Close",
    brief:
      "Sealed until the field opens it. Chapter Two begins where the first ended — at the number the market settles on.",
    transmission: ["▶ TRANSMISSION 002 — sealed."],
    shards: [],
    answerHash: "e26191ddfef51967c2b2fcc12c6505c0ba610bc07750c0949ecb65274ccc93d8",
    answerLength: 11,
    reward: "One week of Elite, on us.",
  },
] as const;

// ── The weekly window, in America/New_York ───────────────────────────────
const TZ = "America/New_York";
// Window: Monday 11:59am → Thursday 6:59pm ET (boundaries computed in getCipherStatus).
// Anchor Monday for chapter rotation (2026-06-01 is a Monday, UTC date-only).
const EPOCH_MONDAY_UTC = Date.UTC(2026, 5, 1);
const DAY = 86_400_000;

type EtParts = { year: number; month: number; day: number; hour: number; minute: number; second: number; wd: number };

const WD: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function etParts(ts: number): EtParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hour12: false, weekday: "short",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(ts)) if (part.type !== "literal") p[part.type] = part.value;
  let hour = parseInt(p.hour!, 10);
  if (hour === 24) hour = 0; // some ICU builds emit 24 at midnight
  return {
    year: parseInt(p.year!, 10), month: parseInt(p.month!, 10), day: parseInt(p.day!, 10),
    hour, minute: parseInt(p.minute!, 10), second: parseInt(p.second!, 10), wd: WD[p.weekday!] ?? 1,
  };
}

function etOffsetMinutes(ts: number): number {
  const p = etParts(ts);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUTC - ts) / 60000);
}

/** Convert an ET wall-clock to the matching UTC timestamp (DST-correct). */
function etWallToTs(y: number, m: number, d: number, hh: number, mm: number): number {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const off1 = etOffsetMinutes(guess);
  let ts = guess - off1 * 60000;
  const off2 = etOffsetMinutes(ts);
  if (off2 !== off1) ts = guess - off2 * 60000;
  return ts;
}

function shiftDate(y: number, m: number, d: number, deltaDays: number): { y: number; m: number; d: number } {
  const t = new Date(Date.UTC(y, m - 1, d) + deltaDays * DAY);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export type CipherState = "live" | "sealed";

export type CipherStatus = {
  readonly chapter: CipherChapter;
  readonly state: CipherState;
  /** ms left in the live window, or ms until the next window opens. */
  readonly msRemaining: number;
  /** ISO of the relevant boundary (close if live, next open if sealed). */
  readonly boundaryISO: string;
};

export function getCipherStatus(now: number = Date.now()): CipherStatus {
  const p = etParts(now);
  const mon = shiftDate(p.year, p.month, p.day, -(p.wd - 1)); // Monday of this ET week
  const openTs = etWallToTs(mon.y, mon.m, mon.d, 11, 59);
  const thu = shiftDate(mon.y, mon.m, mon.d, 3);
  const closeTs = etWallToTs(thu.y, thu.m, thu.d, 18, 59);

  // Rotate chapters by week index off the anchor Monday.
  const monMidUTC = Date.UTC(mon.y, mon.m - 1, mon.d);
  const weekIdx = Math.floor((monMidUTC - EPOCH_MONDAY_UTC) / (7 * DAY));
  const idx = ((weekIdx % CIPHER_CHAPTERS.length) + CIPHER_CHAPTERS.length) % CIPHER_CHAPTERS.length;
  const chapter = CIPHER_CHAPTERS[idx]!;

  if (now >= openTs && now <= closeTs) {
    return { chapter, state: "live", msRemaining: closeTs - now, boundaryISO: new Date(closeTs).toISOString() };
  }

  // Sealed → next open is this Monday (if we're before it) or next Monday.
  let nextOpenTs = openTs;
  if (now > closeTs) {
    const nm = shiftDate(mon.y, mon.m, mon.d, 7);
    nextOpenTs = etWallToTs(nm.y, nm.m, nm.d, 11, 59);
  }
  // The chapter that will run next window:
  const nextMon = now > closeTs ? shiftDate(mon.y, mon.m, mon.d, 7) : mon;
  const nextWeekIdx = Math.floor((Date.UTC(nextMon.y, nextMon.m - 1, nextMon.d) - EPOCH_MONDAY_UTC) / (7 * DAY));
  const nextIdx = ((nextWeekIdx % CIPHER_CHAPTERS.length) + CIPHER_CHAPTERS.length) % CIPHER_CHAPTERS.length;

  return {
    chapter: CIPHER_CHAPTERS[nextIdx]!,
    state: "sealed",
    msRemaining: nextOpenTs - now,
    boundaryISO: new Date(nextOpenTs).toISOString(),
  };
}

export function getChapterByWeek(week: number): CipherChapter | undefined {
  return CIPHER_CHAPTERS.find((c) => c.week === week);
}

/** A client-safe projection of a chapter — shard VALUES are stripped. */
export type CipherChapterView = {
  readonly week: number;
  readonly codename: string;
  readonly brief: string;
  readonly transmission: readonly string[];
  readonly clues: ReadonlyArray<{ id: string; label: string; where: string; color: string }>;
  readonly shardCount: number;
  readonly answerLength: number;
  readonly reward: string;
};

export function toChapterView(chapter: CipherChapter): CipherChapterView {
  return {
    week: chapter.week,
    codename: chapter.codename,
    brief: chapter.brief,
    transmission: chapter.transmission,
    clues: chapter.shards.map((s) => ({ id: s.id, label: s.label, where: s.where, color: s.color })),
    shardCount: chapter.shards.length,
    answerLength: chapter.answerLength,
    reward: chapter.reward,
  };
}
