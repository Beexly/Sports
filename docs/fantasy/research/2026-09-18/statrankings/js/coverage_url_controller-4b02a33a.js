import { Controller } from "@hotwired/stimulus";

// Rewrites the browser address bar to a clean slug URL whenever the active
// coverage × stat combination maps to a known landing page combo.
//
// Patches history.replaceState (used by coverage-shells, coverage-active-stats,
// and v2-filter controllers) to intercept URL updates without modifying those
// controllers. Restores the original on disconnect.
//
// On connect, also seeds the current URL with default stats/coverages params so
// that subsequent Turbo-frame requests (which build from window.location.href)
// carry those params and the landing action's param-precedence logic works.

// Shell order mirrors NFL::CoverageIntelligenceQuery::ALL_COVERAGES
const ALL_SHELL_ORDER = ["0", "1", "2", "2M", "3", "4", "6", "9"];
const STAT_COV_PATH_RE = /^\/nfl\/coverage\/([^/]+)\/vs\/[^/]+$/;
const COV_ONLY_PATH_RE = /^\/nfl\/coverage\/vs\/[^/]+$/;
const OFFENSE_POSITIONS = new Set(["WR_TE", "WR", "TE", "RB", "QB", ""]);
// Params to carry over to the slug URL so filters aren't lost on navigation
const PRESERVE_PARAMS = ["seasons", "weeks", "team", "player_name", "qualifier", "sort_order", "stats"];

export default class extends Controller {
  static values = {
    offenseStatSlugByKey: { type: Object, default: {} },
    defenseStatSlugByKey: { type: Object, default: {} },
    coverageSlugByKey:    { type: Object, default: {} },
    defaultStats:         { type: String, default: "" },
    defaultCoverages:     { type: String, default: "" },
  };

  connect() {
    const original = history.replaceState.bind(history);
    this._original = original;
    history.replaceState = (state, title, url) => {
      const slugUrl = this._toSlugUrl(url);
      // A new stat/coverage combo is a different landing page — navigate so its
      // server-rendered H1, info card, and canonical actually render. Pure filter
      // changes (same path, different params) keep the in-place URL rewrite.
      if (slugUrl && new URL(slugUrl).pathname !== window.location.pathname) {
        Turbo.visit(slugUrl);
        return;
      }
      original(state, title, slugUrl ?? url);
    };

    // Seed URL with default filter params so subsequent filter-change requests
    // (which copy window.location.href) preserve the landing page preset.
    this._seedLandingParams();
  }

  disconnect() {
    if (this._original) {
      history.replaceState = this._original;
      this._original = null;
    }
  }

  // -- private --

  _seedLandingParams() {
    const path = window.location.pathname;
    if (!STAT_COV_PATH_RE.test(path) && !COV_ONLY_PATH_RE.test(path)) return;
    const url = new URL(window.location.href);
    let changed = false;

    if (this.defaultStatsValue && !url.searchParams.has("stats")) {
      url.searchParams.set("stats", this.defaultStatsValue);
      changed = true;
    }
    if (this.defaultCoveragesValue && !url.searchParams.has("coverages")) {
      url.searchParams.set("coverages", this.defaultCoveragesValue);
      changed = true;
    }

    // Use the original replaceState so we don't trigger the slug-rewrite
    // logic (which would strip the params we just added).
    if (changed) this._original(history.state, "", url.toString());
  }

  _toSlugUrl(url) {
    try {
      const u = new URL(url, window.location.origin);
      const statSlug = this._extractStatSlug(u);
      if (!statSlug) return null;

      const coveragesParam = u.searchParams.get("coverages");
      const coverageKey = this._coverageKey(coveragesParam);
      if (coverageKey === null) return null;

      const coverageSlug = this.coverageSlugByKeyValue[coverageKey];
      if (!coverageSlug) return null;

      // Skip rewrite when position doesn't match the stat's view type.
      const position = u.searchParams.get("position") ?? "";
      const statIsOffense = !statSlug.match(/-allowed$|-defended$|-coverage-snap$/);
      const posIsOffense = OFFENSE_POSITIONS.has(position);
      if (statIsOffense !== posIsOffense) return null;

      const slug = new URL(`/nfl/coverage/${statSlug}/vs/${coverageSlug}`, window.location.origin);
      for (const p of PRESERVE_PARAMS) {
        const v = u.searchParams.get(p);
        if (v) slug.searchParams.set(p, v);
      }
      return slug.toString();
    } catch {
      return null;
    }
  }

  _extractStatSlug(u) {
    const position = u.searchParams.get("position") ?? "";
    const useDefense = !OFFENSE_POSITIONS.has(position);
    const map = useDefense ? this.defenseStatSlugByKeyValue : this.offenseStatSlugByKeyValue;

    // sort_field takes precedence — reflects the user's current sort.
    const sortField = u.searchParams.get("sort_field");
    if (sortField) {
      const slug = map[sortField];
      if (slug) return slug;
    }

    // Single active stat → update the path slug to match it.
    const statsParam = u.searchParams.get("stats");
    if (statsParam && !statsParam.includes(",")) {
      const slug = map[statsParam];
      if (slug) return slug;
    }

    // Fall back to the stat+coverage landing page path slug.
    const pathMatch = u.pathname.match(STAT_COV_PATH_RE);
    if (pathMatch) return pathMatch[1];

    return null;
  }

  // Returns the canonical comma-joined shell key for a coverages param value,
  // matching the order of ALL_SHELL_ORDER so it aligns with coverageSlugByKey.
  _coverageKey(param) {
    if (param === null) {
      // Absent param = all coverages (shells controller omits it when all selected)
      return ALL_SHELL_ORDER.join(",");
    }
    if (param === "") return null; // empty = nothing selected, no slug
    const shells = param.split(",");
    const ordered = ALL_SHELL_ORDER.filter(c => shells.includes(c));
    if (ordered.length !== shells.length) return null;
    return ordered.join(",");
  }
}
