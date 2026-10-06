import { Controller } from "@hotwired/stimulus";

// Manages the Active Stats pill section for the Coverage Intelligence Tool.
// Handles remove (×) and add-stat interactions by updating the ?stats= URL
// param and triggering dual Turbo Frame updates (pills + data table).
// Pills and the count badge update optimistically before the server responds.

export default class extends Controller {
  static targets = [
    "pill", "addWrap", "addPanel", "count", "row", "resetWrapper", "overflowWrap", "overflowTrigger", "overflowPanel",
    "pillsRow",
  ];
  // Pre-JS clamp on the pills row (see Components::Stats::ActiveStatsSection::
  // CLAMPED_CLASS) -- removed on the first overflow collapse, once this
  // controller owns the row height.
  static classes = ["clamped"];
  static values = {
    url:         { type: String, default: "" },
    turboFrame:  { type: String, default: "stats-content" },
    keys:        { type: Array,  default: [] },
    max:         { type: Number, default: 20 },
    // Optional — only StatBuilder+'s call site sets this (and renders a
    // resetWrapper target). Absent for CoverageIQ, so _syncResetVisibility
    // below is a no-op there; see Components::Stats::ActiveStatsSection.
    defaultKeys: { type: Array,  default: [] },
    // Optional — only StatBuilder+'s call site sets this (stat key =>
    // numeric_id). Absent for CoverageIQ, so _navigate writes keys straight
    // to the ?stats= param, unchanged. See docs/STAT_NUMERIC_IDS.md.
    numericIds:  { type: Object, default: {} },
    // Full rows of pills allowed before collapsing the rest behind "+N more".
    maxRows:     { type: Number, default: 2 },
  };

  connect() {
    this._handleOutsideClick = this._handleOutsideClick.bind(this);
    document.addEventListener("click", this._handleOutsideClick);

    this._handleResize = this._debounce(() => this._collapseOverflow(), 150);
    window.addEventListener("resize", this._handleResize);

    this._collapseOverflow();
  }

  disconnect() {
    document.removeEventListener("click", this._handleOutsideClick);
    window.removeEventListener("resize", this._handleResize);
    clearTimeout(this._closeOverflowTimeout);
  }

  // Bound to turbo:frame-load on the "active-stats" frame itself (see
  // Components::Stats::ActiveStatsSection#frame_data) -- this controller
  // lives on the wrapper *outside* that frame, so it never reconnects when
  // the frame's .src reloads after add/remove/reorder; this is how overflow
  // gets recomputed against the freshly-rendered pill list each time.
  handleFrameLoad() {
    this._collapseOverflow();
  }

  // Bound alongside card-toggle#toggle on the header (see
  // ActiveStatsSection#render_header). That toggle flips the pill row's
  // display synchronously (no transition, see
  // coverage_intelligence_critical.scss), so it's safe to recompute overflow
  // right after -- _collapseOverflow can't measure offsetTop while the row
  // is display: none, which is why a card that starts collapsed (StatBuilder+'s
  // default) never collapsed its pills once expanded before this existed.
  handleToggle() {
    this._collapseOverflow();
  }

  removeStat(event) {
    const key = event.params.key;
    const wasOverflowOpen = this.hasOverflowPanelTarget && !this.overflowPanelTarget.hidden;
    const pill = this.pillTargets.find(p => p.dataset.coverageActiveStatsKeyParam === key);
    if (pill) pill.remove();
    this._collapseOverflow();
    // _collapseOverflow always closes the panel first to get a clean
    // baseline for remeasuring (see its own comment) -- reopen it here if
    // the user had it open and there's still overflow, so removing a stat
    // from inside the "+N more" panel doesn't also close the panel.
    if (wasOverflowOpen && !this.overflowWrapTarget.hidden) this.openOverflowPanel();
    this._navigate(this.keysValue.filter(k => k !== key));
  }

  addStat(event) {
    const key = event.params.key;
    if (this.keysValue.includes(key)) return;
    const label = event.params.label;
    this._insertPillOptimistically(key, label);
    if (this.hasAddPanelTarget) {
      this.addPanelTarget.classList.add("hidden");
      this._setAddPanelExpanded(false);
    }
    this._collapseOverflow();
    this._navigate([...this.keysValue, key]);
  }

  toggleAddPanel(event) {
    event.stopPropagation();
    if (this.hasAddPanelTarget) {
      const hidden = this.addPanelTarget.classList.toggle("hidden");
      this._setAddPanelExpanded(!hidden);
      if (!hidden) this._positionAddPanel();
    }
  }

  // Flips the "+ Add Stat" panel to anchor from the trigger's right edge
  // instead of its default left edge (see .active-stats-add__panel in
  // coverage_intelligence.scss) when opening it left-anchored would push it
  // past the viewport's right edge -- e.g. the rightmost player column in
  // PlayerComparison+, or a trigger sitting close to the edge on a narrower
  // desktop viewport. Below the 64rem breakpoint the panel is fixed/centered
  // instead (no left/right anchoring to flip), so this only measures and
  // acts above it. Recomputed on every open since the trigger's on-screen
  // position can change between opens (window resize, column reorder).
  _positionAddPanel() {
    const panel = this.addPanelTarget;
    panel.classList.remove("active-stats-add__panel--flip");
    if (window.innerWidth < 1024) return;

    const overflowsRight = panel.getBoundingClientRect().right > window.innerWidth;
    panel.classList.toggle("active-stats-add__panel--flip", overflowsRight);
  }

  _setAddPanelExpanded(expanded) {
    if (this.hasAddWrapTarget) {
      this.addWrapTarget.querySelector(".active-stats-add__btn")?.setAttribute("aria-expanded", expanded.toString());
    }
  }

  // Adds or removes one stat depending on its current state -- the
  // StatPicker tree's checkbox rows (Components::StatBuilder::
  // StatPickerPanel) call this instead of separate addStat/removeStat
  // buttons. Silently no-ops past the cap rather than the paywall path --
  // reaching the cap isn't a premium gate, see toggleStat's locked check
  // being handled the same way addStat/removeStat already are (via the
  // .ci-locked pointer-events override on everything except
  // .stat-picker__category-toggle -- see coverage_intelligence.scss).
  toggleStat(event) {
    const key = event.params.key;
    if (this.keysValue.includes(key)) {
      this._navigate(this.keysValue.filter(k => k !== key));
    } else {
      if (this.keysValue.length >= this.maxValue) return;
      this._navigate([...this.keysValue, key]);
    }
  }

  // Bulk-adds every id in a StatPicker category that isn't already active,
  // capped at maxValue -- mirrors toggleStat's single-key add path.
  // stopPropagation: StatPickerPanel's whole category-header row (not just
  // a nested toggle button) carries the expand/collapse click action, since
  // the mock's own row puts Select All/Reset between the title and the
  // caret -- without this, clicking either button would also toggle the
  // category open/closed as an unwanted side effect. When locked, redirects
  // to the paywall instead -- see _redirectIfLocked.
  selectCategory(event) {
    if (this._redirectIfLocked(event)) return;
    event.stopPropagation();
    const ids = event.params.ids;
    const room = this.maxValue - this.keysValue.length;
    if (room <= 0) return;
    const toAdd = ids.filter(id => !this.keysValue.includes(id)).slice(0, room);
    if (!toAdd.length) return;
    this._navigate([...this.keysValue, ...toAdd]);
  }

  // Bulk-removes every id in a StatPicker category that's currently active.
  resetCategory(event) {
    if (this._redirectIfLocked(event)) return;
    event.stopPropagation();
    const ids = event.params.ids;
    const toRemove = this.keysValue.filter(k => ids.includes(k));
    if (!toRemove.length) return;
    this._navigate(this.keysValue.filter(k => !ids.includes(k)));
  }

  // Reparents overflowing pills between the main row and the popover panel
  // (same elements, same remove/tooltip/drag wiring — no duplicate markup).
  // Bound to both click (the trigger button — works for touch, where hover
  // doesn't exist) and mouseenter (the whole wrap — opens for mouse users).
  // Deliberately open-only, not a toggle: if click also closed on an
  // already-hover-opened panel, clicking the trigger with a mouse would
  // immediately re-close what hover just opened. Closing happens via
  // mouseleave (closeOverflowPanel below) or an outside click/tap.
  openOverflowPanel(event) {
    event?.stopPropagation();
    clearTimeout(this._closeOverflowTimeout);
    if (!this.hasOverflowPanelTarget || !this.hasOverflowTriggerTarget || !this.overflowPanelTarget.hidden) return;

    const overflowPills = this.pillTargets.filter(p => p.classList.contains("active-stats-pill--overflow"));
    overflowPills.forEach(pill => this.overflowPanelTarget.appendChild(pill));
    this.overflowPanelTarget.hidden = false;
    this.overflowTriggerTarget.setAttribute("aria-expanded", "true");
  }

  // Delayed, not immediate -- the panel (up to 20rem, see
  // coverage_intelligence.scss) is wider than the "+N more" trigger that
  // opens it, so a real mouse path from the trigger to a pill deeper in the
  // panel routinely drifts outside both elements for an instant. Closing on
  // that first mouseleave made the panel unreachable; this grace period
  // gives openOverflowPanel's own mouseenter (fired the moment the pointer
  // lands back on the trigger or the panel) a chance to cancel it first.
  closeOverflowPanel() {
    clearTimeout(this._closeOverflowTimeout);
    this._closeOverflowTimeout = setTimeout(() => this._closeOverflowPanel(), 300);
  }

  // Category headers inside the "+ Add Stat" panel (StatBuilder+ only —
  // CoverageIQ's flat option list never renders these). Collapsed by
  // default in the server-rendered HTML; this just flips one group open.
  // Bound to the whole .stat-picker__category-header row (matching the
  // mock's own row-level click handler, since Select All/Reset/the caret
  // all sit inside it) -- .closest() resolves to that same element whether
  // event.currentTarget already is the header or a descendant of it.
  //
  // stopPropagation matters specifically for StatPickerPanel's tree: locked
  // (non-subscriber) users can still browse it, via a pointer-events
  // override that re-enables just .stat-picker__category-header inside an
  // otherwise-inert .ci-locked panel (see coverage_intelligence.scss).
  // Without stopping propagation here, that click would still bubble up to
  // the frame's own locked-filters#redirect listener and pop the paywall
  // even though this row itself is meant to work unlocked.
  toggleCategory(event) {
    event.stopPropagation();
    if (event.key === " ") event.preventDefault(); // avoid scrolling the page
    const header = event.currentTarget.closest(".stat-picker__category-header");
    const options = header.nextElementSibling;
    const expanded = header.getAttribute("aria-expanded") === "true";
    header.setAttribute("aria-expanded", (!expanded).toString());
    if (options) options.classList.toggle("hidden", expanded);
  }

  // Search box inside StatPickerPanel (StatBuilder+/MatchupIQ+ only).
  // Hides non-matching rows, then hides any category/tier left with no
  // visible rows -- and forces every category open while a query is
  // active, so matches aren't hidden behind a collapsed accordion the user
  // never asked to open.
  filterStats(event) {
    const query = event.target.value.trim().toLowerCase();
    const panel = event.target.closest(".stat-picker");
    if (!panel) return;

    panel.querySelectorAll(".stat-picker__row").forEach(row => {
      const matches = !query || row.dataset.coverageActiveStatsLabelParam.toLowerCase().includes(query);
      row.classList.toggle("hidden", !matches);
    });

    panel.querySelectorAll(".stat-picker__category").forEach(category => {
      const anyVisible = !!category.querySelector(".stat-picker__row:not(.hidden)");
      category.classList.toggle("hidden", !anyVisible);

      const header = category.querySelector(":scope > .stat-picker__category-header");
      const body = header?.nextElementSibling;
      if (!header || !body) return;

      if (query) {
        header.setAttribute("aria-expanded", "true");
        body.classList.remove("hidden");
      }
    });

    panel.querySelectorAll(".stat-picker__flat").forEach(flat => {
      const anyVisible = !!flat.querySelector(".stat-picker__row:not(.hidden)");
      flat.classList.toggle("hidden", !anyVisible);
    });
  }

  dragStart(event) {
    this._dragKey = event.params.key;
    event.dataTransfer.effectAllowed = "move";
    event.currentTarget.classList.add("dragging");
  }

  dragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    event.currentTarget.classList.add("drag-over");
  }

  drop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove("drag-over");
    this._reorder(this._dragKey, event.params.key);
  }

  dragEnd(event) {
    this._dragKey = null;
    event.currentTarget.classList.remove("dragging");
    this.pillTargets.forEach(p => p.classList.remove("drag-over"));
  }

  // Touch has no native drag-and-drop: touchmove/touchend keep firing on
  // the pill touchstart began on (unlike dragover/drop, which the browser
  // retargets to whatever's under the pointer), so the hit-testing dragover
  // gets for free has to be done by hand here via elementFromPoint.
  touchStart(event) {
    this._dragKey = event.params.key;
    event.currentTarget.classList.add("dragging");
  }

  touchMove(event) {
    if (!this._dragKey) return;

    const touch  = event.touches[0];
    const target = this._pillAt(touch.clientX, touch.clientY);
    if (target === event.currentTarget) return;

    if (this._touchOverEl && this._touchOverEl !== target) this._touchOverEl.classList.remove("drag-over");
    this._touchOverEl = target;
    if (target) target.classList.add("drag-over");
  }

  touchEnd(event) {
    if (this._touchOverEl) this._reorder(this._dragKey, this._touchOverEl.dataset.coverageActiveStatsKeyParam);

    this._dragKey = null;
    this._touchOverEl = null;
    event.currentTarget.classList.remove("dragging");
    this.pillTargets.forEach(p => p.classList.remove("drag-over"));
  }

  // -- private --

  // Select All/Reset sit *inside* .stat-picker__category-header, which has
  // its own click->toggleCategory listener -- unlike an individual row's
  // click (nothing sits between a row and the frame's own paywall redirect,
  // so it reaches that just by bubbling), letting these bubble here would
  // also toggle the category open/closed as an unwanted side effect. So a
  // locked click opens the paywall directly instead of relying on bubbling,
  // and stops propagation so toggleCategory never fires.
  _redirectIfLocked(event) {
    if (!event.currentTarget.closest(".ci-locked")) return false;

    event.preventDefault();
    event.stopPropagation();
    document.getElementById("paywall-modal")?.showModal();
    return true;
  }

  // Shared by drop() and touchEnd() — moves fromKey to sit where toKey is.
  _reorder(fromKey, toKey) {
    if (!fromKey || fromKey === toKey) return;

    const keys = [...this.keysValue];
    const from = keys.indexOf(fromKey);
    const to   = keys.indexOf(toKey);
    if (from === -1 || to === -1) return;

    keys.splice(from, 1);
    keys.splice(to, 0, fromKey);
    this._navigate(keys);
  }

  // The pill (if any) under a touch point — touchmove/touchend only ever
  // report their original touchstart target, so hit-testing has to go
  // through the DOM directly instead.
  _pillAt(x, y) {
    const el = document.elementFromPoint(x, y);
    return el ? el.closest(".active-stats-pill") : null;
  }

  _navigate(keys) {
    const url = new URL(window.location.href);
    url.searchParams.set("stats", this._encodeStats(keys));
    url.searchParams.delete("page");
    history.replaceState(history.state, "", url.toString());
    this.keysValue = keys;
    this._syncResetVisibility();
    this._syncCounts();
    this._syncRows();

    const statsFrame = document.getElementById(this.turboFrameValue);
    if (statsFrame) statsFrame.src = url.toString();

    const pillsFrame = document.getElementById("active-stats");
    if (pillsFrame) pillsFrame.src = url.toString();
  }

  // Numeric-encodes keys for the ?stats= param when numericIds is set
  // (StatBuilder+ — keeps the URL short across a 300+ stat catalog); falls
  // back to writing keys verbatim otherwise (CoverageIQ, unchanged).
  _encodeStats(keys) {
    if (!Object.keys(this.numericIdsValue).length) return keys.join(",");
    return keys.map(k => this.numericIdsValue[k] ?? k).join(",");
  }

  // The reset-to-defaults control (StatBuilder+ only) lives in the header,
  // outside the active-stats turbo frame that add/remove/reorder refresh —
  // so it needs its own explicit sync rather than picking up the change for
  // free from a frame reload.
  _syncResetVisibility() {
    if (!this.hasResetWrapperTarget) return;
    const current = this.keysValue.toSorted();
    const defaults = this.defaultKeysValue.toSorted();
    const isDefault = current.length === defaults.length && current.every((k, i) => k === defaults[i]);
    this.resetWrapperTarget.classList.toggle("hidden", isDefault);
  }

  // Recomputes every "N of M[ selected]" count badge (main status, picker
  // header, per-category) from this.keysValue -- each `count` target carries
  // its own scope of ids as JSON (count-ids) plus an optional trailing
  // suffix (count-suffix, e.g. " selected"). These all live outside the
  // frames add/remove/reorder reload (see _navigate), so nothing else keeps
  // them in sync.
  _syncCounts() {
    this.countTargets.forEach(el => {
      const ids = JSON.parse(el.dataset.countIds);
      const selected = ids.filter(id => this.keysValue.includes(id)).length;
      el.textContent = `${selected} of ${ids.length}${el.dataset.countSuffix ?? ""}`;
    });
  }

  // Keeps the StatPicker's own checkbox rows (checked state + check/lock
  // icon) in sync with this.keysValue -- same reasoning as _syncCounts, the
  // picker panel never reloads via a frame.
  _syncRows() {
    this.rowTargets.forEach(row => {
      const active = this.keysValue.includes(row.dataset.coverageActiveStatsKeyParam);
      row.classList.toggle("stat-picker__row--active", active);
      row.setAttribute("aria-checked", active.toString());
      row.querySelector(".stat-picker__row-check")?.classList.toggle("hidden", !active);
      row.querySelector(".stat-picker__row-lock")?.classList.toggle("hidden", active);
    });
  }

  _insertPillOptimistically(key, label) {
    const pill = document.createElement("span");
    pill.className = "active-stats-pill";
    pill.draggable = true;
    pill.dataset.coverageActiveStatsTarget = "pill";
    pill.dataset.coverageActiveStatsKeyParam = key;
    pill.innerHTML =
      `<span class="active-stats-pill__label">${label}</span>` +
      `<button type="button" class="active-stats-pill__remove"` +
        ` data-action="coverage-active-stats#removeStat"` +
        ` data-coverage-active-stats-key-param="${key}"` +
        ` aria-label="Remove ${label}">×</button>`;

    const frame = document.getElementById("active-stats");
    // Anchor before the overflow wrapper (not the add-wrap) so a newly-added
    // pill lands grouped with the other pills, ahead of "+N more" / "+ Add Stat".
    const anchor = this.hasOverflowWrapTarget ? this.overflowWrapTarget
      : this.hasAddWrapTarget ? this.addWrapTarget : null;
    if (frame) {
      frame.insertBefore(pill, anchor);
    }
  }

  _handleOutsideClick(event) {
    if (this.hasAddPanelTarget && this.hasAddWrapTarget && !this.addWrapTarget.contains(event.target)) {
      this.addPanelTarget.classList.add("hidden");
      this._setAddPanelExpanded(false);
    }
    // composedPath(), not overflowWrapTarget.contains(event.target): a click
    // on a pill's remove button inside the panel (removeStat, above) deletes
    // that button from the DOM before this document-level listener runs, so
    // .contains() would see a detached node and wrongly call it an outside
    // click, closing the panel we just told removeStat to keep open.
    // composedPath() reflects the tree as it was when the click dispatched,
    // before any handler mutated it.
    if (
      this.hasOverflowPanelTarget && !this.overflowPanelTarget.hidden &&
      !event.composedPath().includes(this.overflowWrapTarget)
    ) {
      this._closeOverflowPanel();
    }
  }

  // Recomputes which pills fit within maxRowsValue full rows by comparing
  // offsetTop -- lets the browser's own flex-wrap do the layout math (font
  // metrics, gaps, rounding) instead of summing widths by hand. Always
  // starts from a clean, closed state so this is safe to call repeatedly
  // (on connect, resize, frame reload, and every add/remove).
  //
  // Counts actual rows in use rather than precomputing a fixed cutoff, so
  // it accounts for the "+N more" trigger *and* the "+ Add Stat" button
  // (rendered right after the pills in the same wrapping row, but not a
  // pillTarget itself) each potentially claiming a row of their own --
  // pills alone can fit within maxRowsValue while the button still spills
  // onto row (maxRowsValue + 1), which is exactly the case this guards.
  _collapseOverflow() {
    clearTimeout(this._closeOverflowTimeout);
    this._closeOverflowPanel();
    if (this.hasPillsRowTarget && this.hasClampedClass) {
      this.pillsRowTarget.classList.remove(this.clampedClass);
    }
    if (!this.hasOverflowWrapTarget || !this.hasOverflowTriggerTarget) return;

    this.pillTargets.forEach(pill => pill.classList.remove("active-stats-pill--overflow"));
    this.overflowWrapTarget.hidden = true;
    if (!this.pillTargets.length) return;

    const overflow = [];
    const syncTrigger = () => {
      this.overflowWrapTarget.hidden = overflow.length === 0;
      if (overflow.length) this.overflowTriggerTarget.textContent = `+${overflow.length} more`;
    };

    while (this._rowsInUse() > this.maxRowsValue) {
      const nextToHide = this.pillTargets.toReversed()
        .find(pill => !pill.classList.contains("active-stats-pill--overflow"));
      if (!nextToHide) break;

      nextToHide.classList.add("active-stats-pill--overflow");
      overflow.push(nextToHide);
      syncTrigger();
    }
  }

  // Distinct offsetTop values among everything currently visible in the
  // pill row == the number of rows actually in use right now.
  _rowsInUse() {
    const tops = new Set(
      this.pillTargets
        .filter(pill => !pill.classList.contains("active-stats-pill--overflow"))
        .map(pill => pill.offsetTop),
    );
    if (!this.overflowWrapTarget.hidden) tops.add(this.overflowWrapTarget.offsetTop);
    if (this.hasAddWrapTarget) tops.add(this.addWrapTarget.offsetTop);
    return tops.size;
  }

  _closeOverflowPanel() {
    if (!this.hasOverflowPanelTarget || !this.hasOverflowWrapTarget) return;

    const parent = this.overflowWrapTarget.parentElement;
    [...this.overflowPanelTarget.children].forEach(pill => parent.insertBefore(pill, this.overflowWrapTarget));
    this.overflowPanelTarget.hidden = true;
    if (this.hasOverflowTriggerTarget) this.overflowTriggerTarget.setAttribute("aria-expanded", "false");
  }

  _debounce(fn, waitMs) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), waitMs);
    };
  }
}
