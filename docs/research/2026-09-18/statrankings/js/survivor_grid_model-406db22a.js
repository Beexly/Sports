// Survivor Map pure grid model -- no DOM access anywhere in this module.
// Ported (modulo module syntax) from the standalone reference implementation
// in mockups/nfl-survivor-map/index.html: just the pure helpers the grid
// itself needs (sorting, band colors, the FAV LEFT count, the "updated"
// caption). The Best Path optimizer that used to live alongside these was
// removed along with the rest of the Best Path feature.

// teams[].weeks is a sparse-ish list keyed by w; build a dense 1..18 array
// per team so every other function can just index by (week - 1).
export function buildWeekIndex(teams) {
  return teams.map((t) => {
    const arr = Array.from({ length: 18 });
    t.weeks.forEach((w) => { arr[w.w - 1] = w; });
    return arr;
  });
}

// Count remaining weeks (from `week`, or the whole season if null) where
// team `ti` is favored (winPct >= 58) and not on a bye. Shared by both the
// FAV LEFT column and the default (no-week-selected) sort order.
export function favLeftCount(weekIndex, ti, week) {
  const start = week ? week - 1 : 0;
  let n = 0;
  for (let wi = start; wi < 18; wi++) {
    const c = weekIndex[ti][wi];
    if (c && !c.bye && c.winPct >= 58) n++;
  }
  return n;
}

export function sortedTeamIndices(teams, weekIndex, week) {
  const idx = teams.map((_, i) => i);
  if (week) {
    idx.sort((x, y) => {
      const cx = weekIndex[x][week - 1];
      const cy = weekIndex[y][week - 1];
      const sx = cx.bye ? 99 : cx.spread;
      const sy = cy.bye ? 99 : cy.spread;
      return sx - sy;
    });
  } else {
    idx.sort((x, y) =>
      favLeftCount(weekIndex, y, week) - favLeftCount(weekIndex, x, week) ||
      teams[x].abbr.localeCompare(teams[y].abbr));
  }
  return idx;
}

export function bandClass(winPct) {
  if (winPct >= 75) return "b75";
  if (winPct >= 60) return "b60";
  if (winPct >= 50) return "b50";
  return "bunder";
}

const BAND_COLOR = {
  b75: "var(--band-75)", b60: "var(--band-60)", b50: "var(--band-50)", bunder: "var(--band-under)",
};

// Exact precedence from the source design: band color < selected-week blue
// < used-team dim. Returns the literal border color to apply to a cell.
export function cellBorderColor(opts) {
  let bd = "var(--line-14)";
  if (opts.colorOn) bd = BAND_COLOR[bandClass(opts.winPct)];
  if (opts.selected) bd = "var(--blue)";
  if (opts.used) bd = "var(--cell-used-bd)";
  return bd;
}

// "Updated 2h ago" caption for the odds freshness readout. Pure given an
// explicit `now` (testable, no hidden Date.now() dependency deep in view
// logic). Absent/invalid generatedAt renders the pre-allocated placeholder.
export function formatRelativeUpdated(iso, now) {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d.getTime())) return { text: "Updated —", title: "" };
  const mins = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60000));
  let text;
  if (mins < 1) text = "Updated just now";
  else if (mins < 60) text = `Updated ${mins}m ago`;
  else if (mins < 60 * 24) text = `Updated ${Math.round(mins / 60)}h ago`;
  else text = `Updated ${Math.round(mins / (60 * 24))}d ago`;
  return { text, title: d.toLocaleString() };
}

// Lowest week N (1-18) whose rollover -- the Wednesday 09:00 UTC following
// week N's Thursday anchor -- is still in the future. Drives the grid's
// default horizontal scroll (already-played weeks start out of view) and
// falls back to week 1 if anchors are absent/malformed.
export function computeCurrentWeek(weekAnchors, now) {
  if (!Array.isArray(weekAnchors) || weekAnchors.length !== 18) return 1;
  for (let n = 1; n <= 18; n++) {
    const anchor = new Date(`${weekAnchors[n - 1]}T00:00:00Z`);
    if (isNaN(anchor.getTime())) return 1;
    const rollover = new Date(anchor.getTime() + 6 * 24 * 3600 * 1000);
    rollover.setUTCHours(9, 0, 0, 0);
    if (now.getTime() < rollover.getTime()) return n;
  }
  return 18;
}
