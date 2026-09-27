import { Controller } from "@hotwired/stimulus";
import {
  buildWeekIndex, favLeftCount, sortedTeamIndices, cellBorderColor, formatRelativeUpdated,
  computeCurrentWeek,
} from "survivor_grid_model";
import {
  loadUsed, persistUsed,
  loadCsvEntries, persistCsvEntries, loadEntryNames, persistEntryNames,
  loadSplashMode, persistSplashMode,
  parseSplashCsv, STORAGE_KEYS,
} from "survivor_state";

// Drives the whole Survivor Map page: WIN%/SPREAD + COLORS/PLAIN toggles,
// week sorting, USED-team marking (free for everyone, device-local -- no
// account needed), and the premium-gated contest-entries surface (the ONLY
// gated surface -- SPEC.md RE-SCOPE 2026-09-01). Locked interactions open a
// survivor-specific upsell modal (see premiumGateHtml) built from this
// page's own gate-* chrome, styled in the house UI::UnlockModal/
// PremiumCtaModal family but with bespoke copy covering both this page's
// CSV import and the site-wide premium pitch.
//
// Ported from the reference implementation in
// mockups/nfl-survivor-map/index.html: a single reactive store; every state
// change re-renders the dynamic containers from one pure view-model.
// Containers are never replaced wholesale (only their innerHTML is written),
// so listeners delegated on them at connect() survive every render. The
// server renders the initial grid (same markup, default state) for SEO and
// no-JS visitors; this controller re-renders it identically on connect.
export default class extends Controller {
  static targets = [
    "payload", "weekPills", "colgroup", "headRow", "gridBody", "srcPills",
    "usedTeamsLabel", "entWrap", "entToggle", "entToggleLabel", "entPanelRoot",
    "modePctBtn", "modeSpreadBtn", "colorOnBtn",
    "colorOffBtn", "oddsUpdated", "legend2x", "countLine",
    "gateRoot", "toast", "csvInput", "uploadCsvBtn", "tableScroll", "usedTableRoot",
    "splashOnBtn", "splashOffBtn",
  ];

  static values = {
    premiumSignupUrl: String,
    sampleCsvUrl: String,
  };

  connect() {
    this.data_ = this.normalizeOdds(JSON.parse(this.payloadTarget.textContent));
    this.state = {
      week: null,
      used: loadUsed(),
      src: "manual",
      colors: true,
      mode: "pct",
      entOpen: false,
      editing: null,
      premiumGateOpen: false,
      csvErrors: null,
      csvUploadOpen: false,
      csvEntries: loadCsvEntries(),
      entryNames: loadEntryNames(),
      splash: loadSplashMode(),
    };
    this.renderScheduled = false;
    this.toastTimer = null;
    this.wireEvents();
    this.renderApp();
    // Weeks that have already been played start scrolled out of view: the
    // current week opens as the first visible week column.
    const currentWeek = computeCurrentWeek(this.data_.weekAnchors, new Date());
    if (currentWeek > 1) this.scrollWeekIntoView(currentWeek, "instant");
    // Marks the client takeover complete: the server-rendered grid has been
    // replaced by this controller's render, so nodes found from here on
    // won't be detached by the connect-time re-render (system specs wait on
    // this before interacting).
    this.element.dataset.survivorReady = "true";
  }

  disconnect() {
    document.removeEventListener("mousedown", this.onDocMousedown);
    document.removeEventListener("keydown", this.onDocKeydown);
    window.removeEventListener("storage", this.onStorage);
    clearTimeout(this.toastTimer);
  }

  // ---------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------

  normalizeOdds(json) {
    const teams = (json.teams || []).map((t) => {
      const weeks = (t.weeks || []).map((w) => {
        if (w.bye) return { w: w.w, bye: true };
        return {
          w: w.w, opp: w.opp, home: !!w.home, spread: w.spread,
          pk: w.spread === 0 && !!w.pk,
          winPct: w.winPct, divisional: !!w.divisional, international: !!w.international,
          // Optional per-cell game result once final: "W" | "L". Absent/null
          // means not final yet -- never invented client-side.
          result: (w.result === "W" || w.result === "L") ? w.result : null,
        };
      });
      return { abbr: t.abbr, name: t.name, division: t.division || "", weeks };
    });
    return {
      teams,
      doubleWeeks: json.doubleWeeks || [],
      generatedAt: json.generatedAt || null,
      logos: json.logos || {},
      weekAnchors: Array.isArray(json.weekAnchors) && json.weekAnchors.length === 18 ? json.weekAnchors : null,
    };
  }

  logoImg(abbr, klass) {
    const urls = this.data_.logos[abbr];
    if (!urls) return "";
    const { light, dark } = urls;
    if (light === dark) {
      return `<img class="${klass}" src="${this.escapeHtml(light)}" alt="">`;
    }
    return `<img class="${klass} logo-light" src="${this.escapeHtml(light)}" alt="">` +
      `<img class="${klass} logo-dark" src="${this.escapeHtml(dark)}" alt="" aria-hidden="true">`;
  }

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------

  setState(patch) {
    const next = typeof patch === "function" ? patch(this.state) : patch;
    Object.assign(this.state, next);
    this.scheduleRender();
  }

  // Coalesces a burst of setState calls into one render. setTimeout(0)
  // rather than requestAnimationFrame: rAF callbacks pause while the window
  // is occluded, which would leave a queued render (e.g. from another tab's
  // storage event) stuck until the next repaint.
  scheduleRender() {
    if (this.renderScheduled) return;
    this.renderScheduled = true;
    setTimeout(() => { this.renderScheduled = false; this.renderApp(); }, 0);
  }

  entryDisplayName(key) {
    return this.state.entryNames[key] || key;
  }

  // Value-present-means-locked, exactly like week_splits_controller's
  // signupUrlValue -- the single source of truth for whether the visitor has
  // premium access, read everywhere the entries surfaces or Upload CSV need
  // to gate on it.
  isPremium() {
    return !this.premiumSignupUrlValue;
  }

  // ---------------------------------------------------------------------
  // View model -- pure: (state, data) -> plain object. No DOM in here.
  // ---------------------------------------------------------------------

  computeViewModel() {
    const teams = this.data_.teams;
    const weekIndex = buildWeekIndex(teams);
    const teamByAbbr = {};
    teams.forEach((t) => { teamByAbbr[t.abbr] = t; });

    const { week, mode } = this.state;
    const colorOn = this.state.colors;
    const premium = this.isPremium();
    // A stale `src` left in localStorage from a lapsed subscription (or a
    // previously-premium session) is only honored while premium is active --
    // otherwise a lapsed/non-subscriber would see a synced (read-only) used
    // map instead of always falling back to manual tracking.
    const synced = premium && this.state.src !== "manual";
    // THE single lever for the Splash presentation: every consumer below
    // (week pills, both table headers, the legend's 2x item) reads
    // vm.doubleWeeks -- never doubleWeeks/splash separately -- so toggling
    // splash off is simply presenting an empty double-weeks list.
    const effDoubleWeeks = this.state.splash ? this.data_.doubleWeeks : [];
    // Used-team tracking is free for everyone (RE-SCOPE: the only premium
    // surface is the contest-entries feature).
    let usedMap;
    if (synced) {
      usedMap = {};
      ((this.state.csvEntries && this.state.csvEntries.entries[this.state.src]) || [])
        .forEach((ab) => { usedMap[ab] = true; });
    } else {
      usedMap = this.state.used;
    }

    const idx = sortedTeamIndices(teams, weekIndex, week);

    // Used teams are pulled out of the main grid entirely (they get their
    // own table below it), so rank is assigned only over the unused rows,
    // in the same sort order the full set would have used.
    const rows = [];
    const usedRows = [];
    let rank = 0;
    idx.forEach((ti) => {
      const t = teams[ti];
      const used = !!usedMap[t.abbr];
      const cells = weekIndex[ti].map((c, wi) => {
        const wk = wi + 1;
        const selected = !!week && wi === week - 1;
        if (!c || c.bye) {
          return { bye: true, selected, week: wk, bg: selected ? "var(--blue-soft2)" : "transparent" };
        }
        const away = !c.home;
        const oppTeam = teamByAbbr[c.opp];
        const val = mode === "pct"
          ? `${c.winPct}%`
          : (c.pk ? "PK" : (c.spread < 0 ? c.spread.toFixed(1) : `+${c.spread.toFixed(1)}`));
        return {
          bye: false, selected, week: wk, val,
          pre: away ? "@" : "vs.",
          oppAbbr: c.opp,
          oppName: (away ? "at " : "vs ") + (oppTeam ? oppTeam.name : c.opp),
          bg: selected ? "var(--blue-soft2)" : "transparent",
          bd: cellBorderColor({ colorOn, winPct: c.winPct, selected, used }),
          divColor: c.divisional ? "var(--text)" : "transparent",
          intlColor: c.international ? "var(--intl)" : "transparent",
          result: c.result || null,
        };
      });
      const favLeft = favLeftCount(weekIndex, ti, week);
      const cw = week ? weekIndex[ti][week - 1] : null;
      const favNow = !!(cw && !cw.bye && cw.winPct >= 58);
      const row = { abbr: t.abbr, name: t.name, used, favLeft, favNow, cells };
      if (used) {
        usedRows.push(row);
      } else {
        rank += 1;
        rows.push({ ...row, rank });
      }
    });

    let usedCount = 0;
    Object.keys(usedMap).forEach((k) => { if (usedMap[k]) usedCount++; });
    const favWeek = rows.filter((r) => r.favNow).length;

    // Entries are dynamic: however many the uploaded CSV actually contains.
    // The Manual pill is free for everyone; every other entries surface
    // (extra src-pills, the All-N dropdown, the entries panel) is gated on
    // the PREMIUM flag, not on what happens to be sitting in localStorage --
    // a non-subscriber (or a lapsed one with stale imported entries) sees
    // only Manual, full stop.
    const entryKeys = premium ? ((this.state.csvEntries && this.state.csvEntries.order) || []) : [];
    const entryCount = entryKeys.length;
    const hasCsv = entryCount > 0;

    const ENTRY_PILL_VISIBLE_COUNT = 5;
    const srcKeys = hasCsv ? ["manual"].concat(entryKeys.slice(0, ENTRY_PILL_VISIBLE_COUNT)) : ["manual"];
    const srcPills = srcKeys.map((k) => ({
      key: k, label: k === "manual" ? "Manual" : this.entryDisplayName(k),
      active: k === this.state.src, hasLogo: k !== "manual",
    }));

    const srcInDrop = premium && this.state.src !== "manual" &&
      entryKeys.indexOf(this.state.src) >= ENTRY_PILL_VISIBLE_COUNT;
    const entRows = entryKeys.map((k) => ({
      key: k, label: this.entryDisplayName(k),
      editing: this.state.editing === k,
      active: k === this.state.src,
    }));

    const clickNote = synced
      ? `Used teams synced from ${this.entryDisplayName(this.state.src)}’s CSV`
      : "Click a team to mark it used";

    return {
      week, colorOn, mode,
      splash: this.state.splash,
      doubleWeeks: effDoubleWeeks,
      rows, usedRows, usedCount, teamsLeft: 32 - usedCount, favWeek,
      hasCsv, srcPills, entRows,
      entOpen: !!this.state.entOpen,
      entBtnLabel: srcInDrop ? this.entryDisplayName(this.state.src) : `All ${entryCount}`,
      entBtnActive: srcInDrop,
      premiumGateOpen: !!this.state.premiumGateOpen,
      csvUploadOpen: !!this.state.csvUploadOpen,
      csvErrors: this.state.csvErrors || [],
      clickNote,
      oddsUpdated: formatRelativeUpdated(this.data_.generatedAt, new Date()),
    };
  }

  // ---------------------------------------------------------------------
  // Render -- the only block that touches the DOM.
  // ---------------------------------------------------------------------

  renderApp() {
    const vm = this.computeViewModel();
    this.element.classList.toggle("splash-on", vm.splash);
    this.renderGate(vm);
    this.renderWeekPills(vm);
    this.renderTableHead(vm);
    this.renderTableBody(vm);
    this.renderUsedTable(vm);
    this.renderControls(vm);
    this.renderEntries(vm);
    this.renderCountLine(vm);
  }

  renderGate(vm) {
    const root = this.gateRootTarget;
    if (vm.premiumGateOpen) { root.innerHTML = this.premiumGateHtml(); return; }
    if (vm.csvUploadOpen) { root.innerHTML = this.csvUploadHtml(vm); return; }
    root.innerHTML = "";
  }

  // Contest-entries upsell for non-subscribers -- the ONLY premium-gated
  // surface. Opened from Upload CSV and from the entry pills/dropdown alike
  // (see wireEvents). Visually in the house UI::UnlockModal/PremiumCtaModal
  // family (badge, feature checklist, "ALSO INCLUDED IN" cross-sell) but
  // built from this page's own gate-* chrome rather than rendering either
  // Phlex component, so its copy can cover both what the CSV import unlocks
  // on THIS page and the site-wide premium pitch in one place. No plan/price
  // selection here -- one CTA, straight to checkout, matching the product
  // call for this page specifically.
  premiumGateHtml() {
    return `<div class="gate-overlay" data-gate-overlay>
        <div class="gate-card gate-card--premium" role="dialog" aria-modal="true" aria-labelledby="premium-gate-title">
          <div class="gate-head">
            <div class="gate-title" id="premium-gate-title">Unlock Contest Entries</div>
            <button type="button" class="gate-close" data-gate-close aria-label="Close">${CLOSE_SVG}</button>
          </div>
          <div class="gate-body">
            <span class="gate-badge">${LOCK_SVG}PREMIUM</span>
            <div class="gate-copy">Import every entry from your survivor contest CSV, switch between them with one click, and see each entry&rsquo;s used teams marked on the grid automatically &mdash; tracked all season.</div>
            <div class="gate-features">
              <span class="gate-feature">${CHECK_SVG}Import every entry from your contest CSV</span>
              <span class="gate-feature">${CHECK_SVG}Switch between entries with one click</span>
              <span class="gate-feature">${CHECK_SVG}Used teams sync automatically, per entry, all season</span>
            </div>
            <div class="gate-divider"><span>ALSO INCLUDED IN STATRANKINGS+</span></div>
            <div class="gate-features">
              <span class="gate-feature">${CHECK_SVG}550+ premium stats across every tool on the site</span>
              <span class="gate-feature">${CHECK_SVG}CustomSplits+ week ranges on every stat, site-wide</span>
              <span class="gate-feature">${CHECK_SVG}CoverageIQ, StatBuilder+, MatchupIQ+ &amp; more</span>
            </div>
            <a class="gate-submit" href="${this.escapeHtml(this.premiumSignupUrlValue)}">Unlock ${this.brandMarkHtml()}</a>
          </div>
        </div>
      </div>`;
  }

  // Client-side rendering of the "statrankings+" brand mark: a bold "stat",
  // a light "rankings" jammed against it, and a "+" -- the same lead/rest/
  // plus split Components::UI::BrandName reads from config/premium_tools.yml
  // for this exact name. BrandName itself can't render from a JS template,
  // so this mirrors its class names (.brand-name, .premium-label__lead/
  // rest/plus) rather than reinventing the treatment.
  brandMarkHtml() {
    return '<span class="brand-name"><span class="premium-label__lead">stat</span>' +
      '<span class="premium-label__rest">rankings</span>' +
      '<span class="premium-label__plus">+</span></span>';
  }

  // Import problems found in an uploaded entries CSV. Every problem is
  // listed (capped for readability) so the user can fix the file in one
  // pass; nothing is imported from a file with errors. Rendered inside the
  // upload modal itself (csvUploadHtml) rather than a separate modal, so
  // fixing and retrying never loses the upload context.
  csvErrorBlockHtml(errors) {
    if (!errors.length) return "";
    const MAX_SHOWN = 8;
    const items = errors.slice(0, MAX_SHOWN).map((e) => `<li>${this.escapeHtml(e)}</li>`).join("");
    const more = errors.length > MAX_SHOWN ? `<div class="gate-copy csv-error-more">…and ${errors.length - MAX_SHOWN} more.</div>` : "";
    return `<div class="csv-error-block">
        <div class="csv-error-heading">We couldn't import that CSV — nothing was imported. Fix the issues below and choose the file again.</div>
        <ul class="csv-error-list">${items}</ul>
        ${more}
      </div>`;
  }

  // Explains the generic entries-CSV export format before handing off to the
  // native file picker -- opened from the Upload CSV button for premium
  // users instead of clicking the hidden file input directly. No
  // Splash branding: this modal covers any pool site's export. The
  // double-week bullet only makes sense when Splash mode is on (the base
  // page has no 2-pick weeks).
  csvUploadHtml(vm) {
    const dblFeature = vm.splash
      ? `<span class="gate-feature">${CHECK_SVG}Double weeks: both picks in one cell &mdash; &ldquo;Cincinnati, Miami&rdquo;</span>`
      : "";
    return `<div class="gate-overlay" data-gate-overlay>
        <div class="gate-card" role="dialog" aria-modal="true" aria-labelledby="csv-upload-title">
          <div class="gate-head">
            <div class="gate-title" id="csv-upload-title">Upload your entries CSV</div>
            <button type="button" class="gate-close" data-gate-close aria-label="Close">${CLOSE_SVG}</button>
          </div>
          <div class="gate-body">
            <div class="gate-copy">Export your entries from your pool site and upload the CSV here. One row per entry: a unique handle, then the team picked each week.</div>
            <div class="gate-features">
              <span class="gate-feature">${CHECK_SVG}One row per entry, identified by its Handle</span>
              <span class="gate-feature">${CHECK_SVG}Full team names or cities &mdash; e.g. San Francisco or 49ers</span>
              ${dblFeature}
            </div>
            ${this.csvPreviewHtml()}
            ${this.csvErrorBlockHtml(vm.csvErrors)}
            <button type="button" class="gate-submit" data-csv-choose>Choose CSV file</button>
            <a class="csv-sample-box" href="${this.escapeHtml(this.sampleCsvUrlValue)}" download>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 4v12"></path><path d="M7 11l5 5 5-5"></path><path d="M5 20h14"></path></svg>
              <span class="csv-sample-lines"><span>Not sure about the format?</span><span class="csv-sample-cta">Download the sample CSV</span></span>
            </a>
          </div>
        </div>
      </div>`;
  }

  // Small spreadsheet-style preview of the required CSV columns, shown in
  // the upload modal in place of a static screenshot. Handle + every Week
  // column are marked required; Contest Name may be blank.
  csvPreviewHtml() {
    return `<div class="csv-preview-wrap">
        <div class="csv-preview">
          <table>
            <thead>
              <tr>
                <th scope="col">Contest Name</th>
                <th scope="col" class="csv-preview-required">Handle</th>
                <th scope="col" class="csv-preview-required">Week 1</th>
                <th scope="col" class="csv-preview-required">Week 2</th>
                <th scope="col">&hellip;</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td></td>
                <td>your-entry-1</td>
                <td>San Francisco</td>
                <td>Baltimore</td>
                <td>&hellip;</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="csv-preview-caption">&ldquo;Handle&rdquo; and the &ldquo;Week&rdquo; columns are required.</div>
      </div>`;
  }

  renderWeekPills(vm) {
    let html = "";
    for (let n = 1; n <= 18; n++) {
      const active = n === vm.week;
      const dbl = vm.doubleWeeks.indexOf(n) >= 0;
      html += `<button type="button" class="pill${active ? " active" : ""}${dbl ? " is-dbl" : ""}" data-week="${n}" aria-pressed="${active}">${n}<span class="dbl-badge">${SPLASH_SVG}<span>2&times;</span></span></button>`;
    }
    this.weekPillsTarget.innerHTML = html;
  }

  renderTableHead(vm) {
    let cols = "";
    let heads = "";
    for (let n = 1; n <= 18; n++) {
      const active = n === vm.week;
      const dbl = vm.doubleWeeks.indexOf(n) >= 0;
      cols += '<col class="c-week">';
      heads += `<th scope="col" class="week-th${dbl ? " is-dbl" : ""}" aria-sort="${active ? "ascending" : "none"}"><button type="button" class="week-head-btn${active ? " active" : ""}" data-week="${n}">${n}<span class="week-head-dbl">${SPLASH_SVG}<span>2&times;</span></span></button></th>`;
    }
    const colgroup = this.colgroupTarget;
    // keep the first 3 fixed <col>s, replace only the week columns
    while (colgroup.children.length > 3) colgroup.removeChild(colgroup.lastChild);
    colgroup.insertAdjacentHTML("beforeend", cols);
    const headRow = this.headRowTarget;
    while (headRow.children.length > 3) headRow.removeChild(headRow.lastChild);
    headRow.insertAdjacentHTML("beforeend", heads);
  }

  // Shared row template for both the main grid's tbody and the used-teams
  // table below it -- never duplicate the row markup between the two.
  rowHtml(r) {
    const cellsHtml = r.cells.map((c) => {
      if (c.bye) {
        return `<td class="week-cell bye" style="background:${c.bg};border-color:var(--line-14);">BYE</td>`;
      }
      const style = `background:${c.bg};border-color:${c.bd};`;
      const inner =
        `<span class="cell-div-dot" style="background:${c.divColor};"></span>` +
        `<svg class="cell-intl" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true" style="color:${c.intlColor}"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c3.2 3.5 3.2 14 0 18M12 3c-3.2 3.5-3.2 14 0 18"></path></svg>` +
        `<span class="cell-opp"><span class="cell-pre">${c.pre}</span>${this.logoImg(c.oppAbbr, "cell-logo")}</span>` +
        `<div class="cell-val">${c.val}</div>` +
        (c.result ? `<span class="cell-result ${c.result === "W" ? "win" : "loss"}" role="img" aria-label="Week ${c.week}: ${c.result === "W" ? "win" : "loss"} vs ${this.escapeHtml(c.oppAbbr)}">${c.result === "W" ? RESULT_WIN_SVG : RESULT_LOSS_SVG}</span>` : "");
      return `<td class="week-cell" title="${this.escapeHtml(c.oppName)}" style="${style}">${inner}</td>`;
    }).join("");
    const teamBtnA11y = `aria-pressed="${r.used}" aria-label="${r.used ? `Mark ${this.escapeHtml(r.name)} unused` : `Mark ${this.escapeHtml(r.name)} used`}"`;
    return `<tr class="${r.used ? "row-used" : ""}" data-abbr="${r.abbr}">
        <td class="rank-cell">${r.used ? "–" : r.rank}</td>
        <td class="team-cell${r.used ? " used" : ""}">
          <button type="button" class="team-btn" data-action-used data-abbr="${r.abbr}" ${teamBtnA11y}>
            <span class="tm-tip" role="tooltip">${this.escapeHtml(r.name)}</span>
            ${this.logoImg(r.abbr, "team-logo")}
            <span class="used-badge">USED</span>
          </button>
        </td>
        <td class="fav-left-cell" style="color:${r.favLeft > 0 ? "var(--text-dim)" : "var(--text-dim7)"};">${r.favLeft}</td>
        ${cellsHtml}
      </tr>`;
  }

  renderTableBody(vm) {
    this.gridBodyTarget.innerHTML = vm.rows.length
      ? vm.rows.map((r) => this.rowHtml(r)).join("")
      : '<tr><td colspan="21" class="grid-empty">Every team is marked used.</td></tr>';
  }

  // The used-teams table lives entirely client-side (the server's initial
  // state never has used teams -- they come from localStorage), so it's
  // simplest to rebuild the whole card from scratch each render rather than
  // patch pieces of it like the main grid does.
  renderUsedTable(vm) {
    const root = this.usedTableRootTarget;
    if (!vm.usedRows.length) { root.innerHTML = ""; return; }
    root.innerHTML =
      `<section class="table-card used-card" aria-label="Used teams">
        <div class="used-card-head">
          <span class="used-card-title">Used teams</span>
          <span class="used-card-count">${vm.usedRows.length} of 32</span>
        </div>
        <div class="table-scroll">
          <table class="grid">
            ${this.usedColgroupHtml()}
            ${this.usedTheadHtml(vm)}
            <tbody>${vm.usedRows.map((r) => this.rowHtml(r)).join("")}</tbody>
          </table>
        </div>
      </section>`;
  }

  usedColgroupHtml() {
    let cols = '<col class="c-rank"><col class="c-team"><col class="c-fav">';
    for (let n = 1; n <= 18; n++) cols += '<col class="c-week">';
    return `<colgroup>${cols}</colgroup>`;
  }

  // Same column meaning as the main table's thead, but week headers are
  // plain (non-interactive, no aria-sort) -- the two tables scroll
  // independently so each needs its own header for column meaning.
  usedTheadHtml(vm) {
    let heads = '<th scope="col">#</th><th scope="col">TEAM</th><th scope="col">FAV LEFT</th>';
    for (let n = 1; n <= 18; n++) {
      const active = n === vm.week;
      const dbl = vm.doubleWeeks.indexOf(n) >= 0;
      heads += `<th scope="col" class="week-th${dbl ? " is-dbl" : ""}"><span class="week-head-btn${active ? " active" : ""}">${n}<span class="week-head-dbl">${SPLASH_SVG}<span>2&times;</span></span></span></th>`;
    }
    return `<thead><tr>${heads}</tr></thead>`;
  }

  renderControls(vm) {
    this.usedTeamsLabelTarget.style.display = "block";

    this.srcPillsTarget.innerHTML = vm.srcPills.map((p) =>
      `<button type="button" class="src-pill${p.active ? " active" : ""}${p.hasLogo ? " has-logo" : ""}" data-src="${this.escapeHtml(p.key)}">${SPLASH_SVG}${this.escapeHtml(p.label)}</button>`).join("");

    this.entWrapTarget.style.display = vm.hasCsv ? "block" : "none";
    this.entToggleTarget.classList.toggle("active-src", vm.entBtnActive);
    this.entToggleTarget.setAttribute("aria-expanded", vm.entOpen ? "true" : "false");
    this.entToggleLabelTarget.textContent = vm.entBtnLabel;

    this.setToggle(this.modePctBtnTarget, vm.mode === "pct");
    this.setToggle(this.modeSpreadBtnTarget, vm.mode === "spread");
    this.setToggle(this.colorOnBtnTarget, vm.colorOn);
    this.setToggle(this.colorOffBtnTarget, !vm.colorOn);
    this.setToggle(this.splashOnBtnTarget, vm.splash);
    this.setToggle(this.splashOffBtnTarget, !vm.splash);

    this.oddsUpdatedTarget.textContent = vm.oddsUpdated.text;
    this.oddsUpdatedTarget.title = vm.oddsUpdated.title;

    // Legend's "2x" explainer is driven by the same doubleWeeks source as
    // everything else.
    this.legend2xTarget.style.display = vm.doubleWeeks.length ? "" : "none";
  }

  setToggle(el, on) {
    el.classList.toggle("active", on);
    el.setAttribute("aria-pressed", on);
  }

  renderEntries(vm) {
    const root = this.entPanelRootTarget;
    if (!vm.entOpen) { root.innerHTML = ""; return; }
    const rowsHtml = vm.entRows.map((en) => {
      const inputId = `ent-input-${en.key.replace(/\s+/g, "-")}`;
      if (en.editing) {
        return `<div class="ent-edit-row">${SPLASH_SVG}<label class="sr-only" for="${inputId}">Rename ${this.escapeHtml(en.key)}</label><input class="ent-input" id="${inputId}" data-entry="${this.escapeHtml(en.key)}" value="${this.escapeHtml(en.label)}"></div>`;
      }
      return `<div class="ent-row-wrap">
        <button type="button" class="ent-row${en.active ? " active" : ""}" data-entry="${this.escapeHtml(en.key)}">${SPLASH_SVG}<span class="ent-label">${this.escapeHtml(en.label)}</span></button>
        <button type="button" class="ent-pen" data-edit-entry="${this.escapeHtml(en.key)}" aria-label="Rename ${this.escapeHtml(en.label)}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M17 3l4 4L8 20l-5 1 1-5L17 3z"></path></svg>
        </button>
      </div>`;
    }).join("");
    root.innerHTML =
      `<div class="ent-panel" role="listbox" aria-label="Contest entries">
        <div class="ent-panel-head">ALL ${vm.entRows.length} ENTRIES</div>
        <div class="ent-list">${rowsHtml}</div>
      </div>`;
    const focusInput = root.querySelector(".ent-input");
    if (focusInput) { focusInput.focus(); focusInput.select(); }
  }

  renderCountLine(vm) {
    let html = `${this.escapeHtml(vm.clickNote)} &middot; <span class="hl">${vm.teamsLeft} of 32 left</span>`;
    if (vm.week) {
      html += ` &middot; <span class="hl">${vm.favWeek}</span>&nbsp;favored in Week ${vm.week}`;
    }
    this.countLineTarget.innerHTML = html;
  }

  showToast(msg) {
    const el = this.toastTarget;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { el.classList.remove("show"); }, 2600);
  }

  // ---------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------

  toggleWeek(n) {
    const selecting = this.state.week !== n;
    this.setState((s) => ({ week: s.week === n ? null : n }));
    if (selecting) this.scrollWeekIntoView(n, "smooth");
  }

  // Horizontally scrolls the grid so `week`'s column is visible -- aligned
  // right after the sticky #/TEAM/FAV LEFT columns when it's off-screen
  // (matters on phones, where only a few week columns fit at once).
  // No-op when the column is already fully in view.
  scrollWeekIntoView(week, behavior) {
    const scroller = this.tableScrollTarget;
    const firstWeekTh = this.headRowTarget.children[3];
    const th = this.headRowTarget.children[2 + week];
    if (!firstWeekTh || !th) return;
    const stickyEdge = firstWeekTh.offsetLeft;
    const visibleLeft = scroller.scrollLeft + stickyEdge;
    const visibleRight = scroller.scrollLeft + scroller.clientWidth;
    if (th.offsetLeft >= visibleLeft && th.offsetLeft + th.offsetWidth <= visibleRight) return;
    scroller.scrollTo({ left: th.offsetLeft - stickyEdge, behavior });
  }

  // Used-team tracking is free for everyone. Marking/unmarking moves a team
  // between the main grid and the used-teams table below it, so the toast
  // tells the user where it went.
  toggleUsedTeam(abbr) {
    // A stale synced `src` only blocks manual marking while premium is
    // still active -- see the same guard in computeViewModel.
    if (this.isPremium() && this.state.src !== "manual") return; // synced from a CSV entry: read-only
    const nextUsed = { ...this.state.used };
    const willBeUsed = !nextUsed[abbr];
    nextUsed[abbr] = willBeUsed;
    persistUsed(nextUsed);
    this.setState({ used: nextUsed });
    const team = this.data_.teams.find((t) => t.abbr === abbr);
    const name = team ? team.name : abbr;
    this.showToast(willBeUsed
      ? `${name} moved to Used teams below the grid.`
      : `${name} returned to the board.`);
  }

  commitEntryName(key, rawValue) {
    const val = (rawValue || "").trim();
    const next = { ...this.state.entryNames };
    if (val && val !== key) next[key] = val; else delete next[key];
    persistEntryNames(next);
    this.setState({ editing: null, entryNames: next });
  }

  // ---------------------------------------------------------------------
  // Events -- delegated on persistent containers so re-renders (which only
  // replace .innerHTML of these containers) never lose their listeners.
  // ---------------------------------------------------------------------

  wireEvents() {
    this.weekPillsTarget.addEventListener("click", (e) => {
      const btn = e.target.closest(".pill");
      if (btn) this.toggleWeek(parseInt(btn.getAttribute("data-week"), 10));
    });
    this.headRowTarget.addEventListener("click", (e) => {
      const btn = e.target.closest(".week-head-btn");
      if (btn) this.toggleWeek(parseInt(btn.getAttribute("data-week"), 10));
    });
    this.gridBodyTarget.addEventListener("click", (e) => {
      const btn = e.target.closest(".team-btn");
      if (btn) this.toggleUsedTeam(btn.getAttribute("data-abbr"));
    });
    this.usedTableRootTarget.addEventListener("click", (e) => {
      const btn = e.target.closest(".team-btn");
      if (btn) this.toggleUsedTeam(btn.getAttribute("data-abbr"));
    });
    this.srcPillsTarget.addEventListener("click", (e) => {
      const btn = e.target.closest(".src-pill");
      if (!btn) return;
      const src = btn.getAttribute("data-src");
      // Entry/CSV-synced used-team tracking is Premium-only; "Manual" is a
      // harmless no-op so it's left free to click.
      if (src !== "manual" && this.premiumSignupUrlValue) { this.setState({ premiumGateOpen: true }); return; }
      this.setState({ src });
    });
    this.entToggleTarget.addEventListener("click", () => {
      this.setState((s) => ({ entOpen: !s.entOpen }));
    });
    const entRoot = this.entPanelRootTarget;
    entRoot.addEventListener("click", (e) => {
      const pen = e.target.closest("[data-edit-entry]");
      if (pen) { e.stopPropagation(); this.setState({ editing: pen.getAttribute("data-edit-entry"), entOpen: true }); return; }
      const row = e.target.closest(".ent-row");
      if (row) {
        const key = row.getAttribute("data-entry");
        // Every row here is a CSV-synced entry (never "manual") -- all
        // entry-sourced used-team tracking is Premium-only.
        if (this.premiumSignupUrlValue) { this.setState({ entOpen: false, premiumGateOpen: true }); return; }
        this.setState({ src: key, entOpen: false });
      }
    });
    entRoot.addEventListener("keydown", (e) => {
      if (!e.target.matches(".ent-input")) return;
      if (e.key === "Enter") this.commitEntryName(e.target.getAttribute("data-entry"), e.target.value);
      if (e.key === "Escape") this.setState({ editing: null });
    });
    entRoot.addEventListener("focusout", (e) => {
      if (!e.target.matches(".ent-input")) return;
      this.commitEntryName(e.target.getAttribute("data-entry"), e.target.value);
    });

    this.modePctBtnTarget.addEventListener("click", () => this.setState({ mode: "pct" }));
    this.modeSpreadBtnTarget.addEventListener("click", () => this.setState({ mode: "spread" }));
    this.colorOnBtnTarget.addEventListener("click", () => this.setState({ colors: true }));
    this.colorOffBtnTarget.addEventListener("click", () => this.setState({ colors: false }));

    this.splashOnBtnTarget.addEventListener("click", () => {
      persistSplashMode(true);
      this.setState({ splash: true });
    });
    this.splashOffBtnTarget.addEventListener("click", () => {
      persistSplashMode(false);
      this.setState({ splash: false });
    });

    this.uploadCsvBtnTarget.addEventListener("click", () => {
      // Contest entries are the ONLY premium-gated surface (RE-SCOPE). The
      // presence of the signup-url value means locked, exactly like
      // week_splits_controller's toggleWeek/applyPreset/etc.
      if (this.premiumSignupUrlValue) { this.setState({ premiumGateOpen: true }); return; }
      this.setState({ csvUploadOpen: true, csvErrors: null });
    });

    this.csvInputTarget.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = ""; // allow re-selecting the same file later
      if (!file) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const result = parseSplashCsv(String(reader.result || ""), this.data_.teams);
        if (result.errors) {
          // The upload modal stays (or reopens, for the direct-attach path
          // specs use before it was ever opened) so the user can fix the
          // file and retry without losing context.
          this.setState({ csvErrors: result.errors, csvUploadOpen: true });
          return;
        }
        persistCsvEntries(result.entries);
        this.setState({ csvEntries: result.entries, src: "manual", csvUploadOpen: false, csvErrors: null });
        this.showToast(`Imported ${result.entries.order.length} entr${result.entries.order.length === 1 ? "y" : "ies"} from your CSV.`);
      });
      reader.readAsText(file);
    });

    this.gateRootTarget.addEventListener("click", (e) => {
      if (e.target.closest("[data-csv-choose]")) {
        this.csvInputTarget.click();
        return;
      }
      if (e.target.hasAttribute("data-gate-overlay") || e.target.closest("[data-gate-close]")) {
        this.setState({ premiumGateOpen: false, csvUploadOpen: false, csvErrors: null });
      }
    });

    this.onDocMousedown = (e) => {
      if (this.state.entOpen && !e.target.closest(".ent-wrap")) this.setState({ entOpen: false });
    };
    this.onDocKeydown = (e) => {
      if (e.key !== "Escape") return;
      if (this.state.csvUploadOpen) this.setState({ csvUploadOpen: false, csvErrors: null });
      else if (this.state.premiumGateOpen) this.setState({ premiumGateOpen: false });
      else if (this.state.entOpen) this.setState({ entOpen: false });
    };
    this.onStorage = (e) => {
      if (!e.key || e.key === STORAGE_KEYS.used) this.setState({ used: loadUsed() });
      if (!e.key || e.key === STORAGE_KEYS.csv) this.setState({ csvEntries: loadCsvEntries() });
      if (!e.key || e.key === STORAGE_KEYS.names) this.setState({ entryNames: loadEntryNames() });
      if (!e.key || e.key === STORAGE_KEYS.splash) this.setState({ splash: loadSplashMode() });
    };
    document.addEventListener("mousedown", this.onDocMousedown);
    document.addEventListener("keydown", this.onDocKeydown);
    window.addEventListener("storage", this.onStorage);
  }

  escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }
}

// Small inline SVG fragments used inside generated HTML strings (JS-side
// templates -- the Ruby side renders the same marks via the icon helper).
const SPLASH_SVG = '<svg class="ic-splash" width="1em" height="0.46em" viewBox="0 0 24 11" aria-hidden="true"><use href="#ic-splash"></use></svg>';
const RESULT_WIN_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle></svg>';
const RESULT_LOSS_SVG = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg>';
const CLOSE_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg>';
const CHECK_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';
// Solid lock mark for the premium gate's "PREMIUM" badge -- mirrors the
// house UI::UnlockModal hero badge (lock-closed, solid variant).
const LOCK_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z"></path></svg>';
