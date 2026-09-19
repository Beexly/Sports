#!/usr/bin/env node
/**
 * NCAAF K3 — ESPN public scoreboard re-grade (C-150 protocol).
 * Node fetch works from this machine; Python urllib gets 403.
 * Does not invent outcomes. Unresolved ids stay unresolved.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STATS = __dirname; // docs/ops/stats-lane
const COHORT = path.join(STATS, "incoming", "ncaaf-0book-cohort.json");
const OUT = path.join(STATS, "out", "ncaaf-k3-regrade.json");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://www.espn.com/",
};

function parseEspnId(raw) {
  const s = String(raw || "");
  const m = s.match(/^espn:(?:ncaaf|college-football|ncaa):(\d+)$/i) || s.match(/^espn:ncaaf:(\d+)$/i);
  if (m) return { kind: "espn_event", eventId: m[1] };
  if (/^espn:/.test(s)) return { kind: "espn_other", raw: s, eventId: (s.match(/(\d+)$/) || [])[1] || null };
  if (/^[a-f0-9]{32}$/i.test(s)) return { kind: "hex32", raw: s };
  return { kind: "other", raw: s };
}

function normalizeTeam(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function teamMatch(selection, displayName) {
  const sel = normalizeTeam(selection);
  const disp = normalizeTeam(displayName);
  if (!sel || !disp) return false;
  // selection like "Duke Blue Devils ML (model signal)"
  const selCore = sel.replace(/\bml\b.*$/, "").replace(/\bmodel signal\b.*$/, "").trim();
  if (selCore && (disp.includes(selCore) || selCore.includes(disp))) return true;
  // last token of selection vs location/name
  const loc = normalizeTeam(displayName.split(" ")[0] || "");
  if (loc && selCore.includes(loc)) return true;
  return false;
}

async function fetchEvent(eventId) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary?event=${eventId}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return { ok: false, status: res.status };
  const data = await res.json();
  const comp = (data.header?.competitions || [])[0] || {};
  const comps = comp.competitors || [];
  const completed = comp.status?.type?.completed === true;
  const teams = comps.map((c) => ({
    displayName: c.team?.displayName || c.team?.location || "",
    abbreviation: c.team?.abbreviation || "",
    score: c.score != null ? Number(c.score) : null,
    winner: c.winner === true,
    homeAway: c.homeAway,
  }));
  return { ok: true, completed, teams, eventId };
}

function gradeFromEspn(row, espn) {
  const selection = row.selection;
  const picked = espn.teams.find((t) => teamMatch(selection, t.displayName) || teamMatch(selection, t.abbreviation));
  if (!picked) return { graded: null, reason: "PICKED_TEAM_NOT_MATCHED", teams: espn.teams.map((t) => t.displayName) };
  if (!espn.completed) return { graded: null, reason: "GAME_NOT_COMPLETED", teams: espn.teams.map((t) => t.displayName) };
  if (picked.winner) return { graded: "WIN", reason: "espn_winner_flag", picked: picked.displayName, scores: espn.teams };
  const other = espn.teams.find((t) => t !== picked && t.score != null && picked.score != null);
  if (picked.score != null && other && other.score != null) {
    if (picked.score > other.score) return { graded: "WIN", reason: "espn_score", picked: picked.displayName };
    if (picked.score < other.score) return { graded: "LOSS", reason: "espn_score", picked: picked.displayName };
    return { graded: null, reason: "TIE", picked: picked.displayName };
  }
  return { graded: "LOSS", reason: "espn_winner_flag_false", picked: picked.displayName, scores: espn.teams };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!fs.existsSync(COHORT)) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify({ ok: false, status: "DATA_BLOCKED", need: COHORT }, null, 2));
    console.log(JSON.stringify({ ok: false, status: "DATA_BLOCKED" }));
    process.exit(2);
  }
  const cohort = JSON.parse(fs.readFileSync(COHORT, "utf8"));
  const rows = [];
  let agree = 0;
  let disagree = 0;
  let unresolved = 0;
  let gradedWin = 0;
  let gradedLoss = 0;
  const idKinds = {};

  for (const row of cohort) {
    const idInfo = parseEspnId(row.espnEventId);
    idKinds[idInfo.kind] = (idKinds[idInfo.kind] || 0) + 1;
    const stored = row.result;
    if (idInfo.kind !== "espn_event" && !(idInfo.kind === "espn_other" && idInfo.eventId)) {
      rows.push({
        pickId: row.pickId,
        stored,
        selection: row.selection,
        espnEventId: row.espnEventId,
        idKind: idInfo.kind,
        status: "UNRESOLVED_ID",
        graded: null,
      });
      unresolved++;
      continue;
    }
    const fetchRes = await fetchEvent(idInfo.eventId);
    await sleep(120);
    if (!fetchRes.ok) {
      rows.push({
        pickId: row.pickId,
        stored,
        selection: row.selection,
        espnEventId: row.espnEventId,
        idKind: idInfo.kind,
        status: "FETCH_FAIL",
        httpStatus: fetchRes.status,
        graded: null,
      });
      unresolved++;
      continue;
    }
    const g = gradeFromEspn(row, fetchRes);
    if (!g.graded) {
      rows.push({
        pickId: row.pickId,
        stored,
        selection: row.selection,
        espnEventId: row.espnEventId,
        idKind: idInfo.kind,
        status: "UNGRADED",
        reason: g.reason,
        teams: g.teams,
        graded: null,
      });
      unresolved++;
      continue;
    }
    if (g.graded === "WIN") gradedWin++;
    if (g.graded === "LOSS") gradedLoss++;
    const match = g.graded === stored;
    if (match) agree++;
    else disagree++;
    rows.push({
      pickId: row.pickId,
      stored,
      graded: g.graded,
      match,
      selection: row.selection,
      espnEventId: row.espnEventId,
      idKind: idInfo.kind,
      reason: g.reason,
      pickedTeam: g.picked,
      scores: g.scores,
    });
  }

  const checkable = agree + disagree;
  const verifiedHit = checkable ? gradedWin / checkable : null;
  const storedWins = cohort.filter((r) => r.result === "WIN").length;
  const storedHit = cohort.length ? storedWins / cohort.length : null;

  const report = {
    ok: true,
    protocol: "C-150 ESPN public summary re-grade",
    cohort_n: cohort.length,
    id_kinds: idKinds,
    checkable,
    agree,
    disagree,
    unresolved,
    graded_win: gradedWin,
    graded_loss: gradedLoss,
    verified_hit_rate: verifiedHit,
    stored_hit_rate: storedHit,
    disagreement_rate: checkable ? disagree / checkable : null,
    k3: {
      rule: "Kill any edge claim if >5% of cohort fails independent ground-truth re-grade",
      disagreement_rate: checkable ? disagree / checkable : null,
      result:
        checkable === 0
          ? "NOT_RUN_no_checkable_ids"
          : disagree / checkable > 0.05
            ? "K3_KILLED_gt5pct_disagreement"
            : "K3_PASSES_disagreement_le_5pct",
      note: "Unresolved ids are not counted as agree or disagree — they are NOT RUN",
    },
    k1_followup:
      verifiedHit != null && verifiedHit > 0.75
        ? "verified_hit>75% — evaluate closing-line proxy join for K1"
        : verifiedHit != null
          ? "verified_hit<=75% — stay H_artifact"
          : "NOT_RUN",
    rows,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      ok: true,
      out: OUT,
      checkable,
      agree,
      disagree,
      unresolved,
      verified_hit_rate: verifiedHit,
      k3: report.k3.result,
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
