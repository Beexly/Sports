// Survivor Map client-side persistence -- the store backing the grid's USED
// badges. Everything here is device-local localStorage; nothing is
// server-persisted.
//
// Also home to the Splash entries CSV importer: parsing, validation, and
// the team-name matching it needs. All pure functions (Node-testable, see
// spec/javascript/survivor_splash_csv_spec.mjs).

const USED_KEY = "sr.survivor.used.v1";
const CSV_KEY = "sr.survivor.csv.v1";
const NAMES_KEY = "sr.survivor.names.v1";
const SPLASH_KEY = "sr.survivor.splash.v1";

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / blocked storage: the page still works, state just
    // doesn't survive a reload.
  }
}

// { ABBR: true, ... } -- manually marked used teams.
export function loadUsed() {
  return read(USED_KEY, {});
}
export function persistUsed(next) {
  write(USED_KEY, next);
}

// { order: [handle, ...], entries: { handle: [usedAbbr, ...] } } -- the
// subscriber's parsed Splash entries CSV. null until they upload one.
export function loadCsvEntries() {
  const v = read(CSV_KEY, null);
  return v && Array.isArray(v.order) && v.entries ? v : null;
}
export function persistCsvEntries(next) {
  write(CSV_KEY, next);
}

// { handle: displayName, ... } -- subscriber renames for entry pills.
export function loadEntryNames() {
  return read(NAMES_KEY, {});
}
export function persistEntryNames(next) {
  write(NAMES_KEY, next);
}

// Per-device Splash presentation toggle -- whale marks + 2x double-week
// badges. Defaults to off: the page reads as a generic single-pick survivor
// grid until a visitor opts in.
export function loadSplashMode() {
  return read(SPLASH_KEY, false);
}
export function persistSplashMode(next) {
  write(SPLASH_KEY, next);
}

export const STORAGE_KEYS = {
  used: USED_KEY, csv: CSV_KEY, names: NAMES_KEY, splash: SPLASH_KEY,
};

/* =========================================================================
 * Contest entries CSV import.
 *
 * Generic export format (one row per entry, works for any pool site):
 *
 *   Contest Name,Handle,Week 1,Week 2,...
 *   ,your-entry-1,San Francisco,Baltimore,"Cincinnati, Miami",...
 *
 * - "Handle" identifies the entry; "Contest Name" may be blank.
 * - Week cells hold full team names or cities; a double week's cell holds
 *   two teams separated by a comma (so the cell arrives quoted).
 * ========================================================================= */

// Minimal RFC-4180-ish CSV parser: quoted cells (with embedded commas and
// "" escapes), \r\n or \n line endings. Returns an array of rows, each an
// array of cell strings.
export function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const src = String(text || "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else { inQuotes = false; }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell); cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

// Builds every alias a Splash cell might use for each team from the odds
// payload's teams list: full name ("San Francisco 49ers"), city ("San
// Francisco"), nickname ("49ers"), and abbreviation ("SF"). An alias shared
// by two teams (e.g. "New York") maps to null so the importer can report it
// as ambiguous instead of guessing.
export function buildTeamNameIndex(teams) {
  const index = {};
  const put = (alias, abbr) => {
    const key = alias.toLowerCase().trim();
    if (!key) return;
    if (Object.prototype.hasOwnProperty.call(index, key) && index[key] !== abbr) index[key] = null;
    else index[key] = abbr;
  };
  teams.forEach((t) => {
    const name = String(t.name || "").trim();
    const words = name.split(/\s+/);
    put(name, t.abbr);
    put(words.slice(0, -1).join(" "), t.abbr); // city ("San Francisco", "LA")
    put(words[words.length - 1], t.abbr);      // nickname ("49ers")
    put(t.abbr, t.abbr);
  });
  return index;
}

function headerError(headerRow) {
  const cells = headerRow.map((c) => c.trim().toLowerCase());
  if (!cells.includes("handle")) {
    return 'Missing the "Handle" column — the first row must be a header like "Contest Name,Handle,Week 1,Week 2,…". Download the sample CSV to see the expected format.';
  }
  if (!cells.some((c) => /^week\s*\d+$/.test(c))) {
    return 'No "Week" columns found — each pick belongs in a "Week 1", "Week 2", … column. Download the sample CSV to see the expected format.';
  }
  return null;
}

function matchTeams(cellValue, teamIndex, rowNum, weekNum, errors) {
  return cellValue.split(",").map((raw) => raw.trim()).filter((raw) => raw !== "").map((raw) => {
    const abbr = teamIndex[raw.toLowerCase()];
    if (abbr === null) {
      errors.push(`Row ${rowNum}, Week ${weekNum}: "${raw}" matches more than one NFL team — use the team's nickname (e.g. "Giants" or "Jets") instead.`);
      return null;
    }
    if (!abbr) {
      errors.push(`Row ${rowNum}, Week ${weekNum}: "${raw}" doesn't match any NFL team. Check the spelling, or use the team's full name.`);
      return null;
    }
    return abbr;
  }).filter(Boolean);
}

// Parses + validates a Splash entries CSV against the page's team list.
// Returns { entries: { order, entries } } on success, or { errors: [...] }
// with every problem found (so the user can fix the file in one pass).
// A file with any error imports nothing -- never a silently partial import.
export function parseSplashCsv(text, teams) {
  const rows = parseCsvRows(text).filter((row) => row.some((cell) => cell.trim() !== ""));
  if (rows.length === 0) return { errors: ["The file is empty. Download the sample CSV to see the expected format."] };

  const headerProblem = headerError(rows[0]);
  if (headerProblem) return { errors: [headerProblem] };

  const header = rows[0].map((c) => c.trim().toLowerCase());
  const handleCol = header.indexOf("handle");
  const weekCols = [];
  header.forEach((cell, i) => {
    const m = cell.match(/^week\s*(\d+)$/);
    if (m) weekCols.push({ col: i, week: parseInt(m[1], 10) });
  });

  const teamIndex = buildTeamNameIndex(teams);
  const errors = [];
  const order = [];
  const entries = {};
  const handleRows = {};

  rows.slice(1).forEach((row, i) => {
    const rowNum = i + 2; // 1-based, after the header row
    const handle = (row[handleCol] || "").trim();
    if (!handle) {
      errors.push(`Row ${rowNum} has no Handle — every entry row needs one so its picks can be told apart.`);
      return;
    }
    if (Object.prototype.hasOwnProperty.call(entries, handle)) {
      errors.push(`Rows ${handleRows[handle]} and ${rowNum} both use the handle "${handle}" — handles must be unique.`);
      return;
    }
    const picks = [];
    const seenWeeks = {};
    weekCols.forEach(({ col, week }) => {
      matchTeams(row[col] || "", teamIndex, rowNum, week, errors).forEach((abbr) => {
        if (Object.prototype.hasOwnProperty.call(seenWeeks, abbr)) {
          errors.push(`Row ${rowNum}: ${abbr} appears twice (Week ${seenWeeks[abbr]} and Week ${week}) — a survivor entry can only use a team once.`);
        } else {
          seenWeeks[abbr] = week;
          picks.push(abbr);
        }
      });
    });
    handleRows[handle] = rowNum;
    order.push(handle);
    entries[handle] = picks;
  });

  if (errors.length > 0) return { errors };
  if (order.length === 0) return { errors: ["No entry rows found below the header. Download the sample CSV to see the expected format."] };
  return { entries: { order, entries } };
}
