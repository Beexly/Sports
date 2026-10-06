import { Controller } from "@hotwired/stimulus";
import {
  DEBOUNCE_MS, fetchFrameHtml, applyFrameSwap, beginFrameLoading, endFrameLoading,
} from "turbo_frame_refresh";

// Drives the Customize Weeks control on the NFL stats pages
// (Components::Filters::NFLWeekSplitsFilter).
//
// Forked from modify_weeks_controller.js, which now serves only the premium
// tools' always-open weeks card (Components::Stats::WeeksSection). This copy
// drops the always-open path and the card's persistent header summary, and
// keeps only what the stats pages use: the collapsible trigger, the week
// pills, and the All Games / Home / Away / Last N buttons.
//
// Module-level state survives controller teardown when the turbo frame is
// replaced (the debounced fetch this controller schedules on every filter
// change swaps the frame's HTML, tearing down and reconnecting this same
// instance), so it has to persist here rather than as an instance field.
let visitTimer = null;
let pendingWeeks = null;
let abortController = null;
let visitGeneration = 0;
let activeVenues = new Set();
// The within-game selection. Shared with the venue/week state above for the
// same reason.
let activePortion = "full";
let activeZone = "full";
let activeExcludes = new Set();

export default class extends Controller {
  static targets = ["panel", "pill", "presetBtn", "venueBtn",
                    "portionBtn", "zoneSelect", "excludeBox", "triggerSummary",
                    "seasonBtn"];
  static classes = ["open", "active", "hidden", "hasSelection"];
  static values = {
    turboFrame:     { type: String, default: "stats-content" },
    availableWeeks: { type: Array, default: [] },
    signupUrl:      { type: String,  default: "" },
    // Must match NFLWeekSplitsFilter::FREE_PRESETS, which decides which buttons
    // render a lock icon. "full" belongs here: All Games is the same full-season
    // view a locked user already sees, so it unlocks no gated data, and leaving
    // it out paywalled a button that renders unlocked. Specific weeks and the
    // venue buttons stay gated.
    freePresets:    { type: Array,   default: ["full", "l1", "l3"] },
  };

  connect() {
    // Reset-then-read: this state is module-level and survives a turbo frame
    // swap, so a pending week edit left over from the previous page has to be
    // cleared before this page's own URL is read below, not merged with it.
    pendingWeeks = null;

    const url        = new URL(window.location.href);
    const weeksParam = url.searchParams.get("weeks");
    const venuesParam = url.searchParams.get("venues");

    // Detect premium params smuggled via URL: show modal and reset to l3
    // "All Games" (full preset or no weeks param) and l1/l3 are free; venues and specific weeks are locked.
    if (this.signupUrlValue && (weeksParam || venuesParam)) {
      const weekNums = (weeksParam || "").split(",").map(Number).filter(Boolean).toSorted((a, b) => a - b);
      const available = this.availableWeeksValue.toSorted((a, b) => a - b);
      const l1 = available.slice(-1);
      const l3 = available.slice(-3);
      const isAllGames = weeksParam && weekNums.length === available.length && weekNums.every((w, i) => w === available[i]);
      const isFreePreset = isAllGames || (weeksParam && (
        (weekNums.length === 1 && weekNums[0] === l1[0]) ||
        (weekNums.length === 3 && weekNums.every((w, i) => w === l3[i]))
      ));
      if (!isFreePreset || venuesParam) {
        this._showPaywall();
        const l3Weeks = this._presetWeeks("l3");
        pendingWeeks = l3Weeks;
        url.searchParams.set("weeks", l3Weeks.join(","));
        url.searchParams.delete("venues");
        url.searchParams.delete("page");
        history.replaceState(history.state, "", url.toString());
        this._scheduleVisit();
      }
    }

    // Reset-then-read, the same shape _readWithinGameFromUrl uses below: this
    // state is module-level and survives a turbo frame swap, so a venue
    // selection left over from the previous page has to be cleared before
    // resyncing from this page's own URL, not just added to.
    activeVenues.clear();
    const currentVenuesParam = url.searchParams.get("venues");
    if (currentVenuesParam) {
      currentVenuesParam.split(",").forEach(v => activeVenues.add(v.trim()));
    }

    // Only where the controls are rendered. On a page that does not offer them
    // the server ignores these params (see ModifyWeeksFilters#split_selection),
    // so reading them here would apply "Q1" to a filter that was never
    // offered. The reset matters as much as the guard:
    // this state is module-level and survives a turbo frame swap, so navigating
    // from receiving to a page without the controls has to clear it.
    //
    // Checked across all three target types, not portionBtn alone: the three
    // within-game groups render independently per-stat (NFLWithinGameFilter
    // shows each as live or "Not applicable" based on that stat's own
    // facets), so a page can have live exclude checkboxes with no portion
    // pills at all. Gating this solely on hasPortionBtnTarget meant every
    // turbo-frame swap on such a page reconnected the controller, took the
    // else branch, and cleared activeExcludes out from under a selection the
    // click just set two lines up the call stack in toggleExclude ->
    // _commitWithinGame -> _scheduleVisit -- the checkbox would flip back to
    // unchecked ~DEBOUNCE_MS after every click, deterministically.
    if (this.hasPortionBtnTarget || this.hasZoneSelectTarget || this.hasExcludeBoxTarget) {
      this._readWithinGameFromUrl();
    } else {
      activePortion = "full";
      activeZone = "full";
      activeExcludes.clear();
    }

    // Within-game params smuggled into the URL get the same treatment as weeks
    // and venues above: reset to the free default rather than serving gated
    // splits to a visitor who cannot see them.
    if (this.signupUrlValue && (activePortion !== "full" || activeZone !== "full" || activeExcludes.size > 0)) {
      this._showPaywall();
      activePortion = "full";
      activeZone = "full";
      activeExcludes.clear();
      url.searchParams.delete("portion");
      url.searchParams.delete("zone");
      url.searchParams.delete("exclude_two_min");
      url.searchParams.delete("page");
      history.replaceState(history.state, "", url.toString());
      this._scheduleVisit();
    }

    // `modify_weeks=open` predates this controller and is kept as-is: it is a
    // URL contract, not a code path — every selection writes it (see
    // _applyWeekSelectionParams) so the panel stays open across a frame swap
    // and reopens on a shared or reloaded URL.
    //
    // This is the *only* signal `wantsOpen` should read. An earlier version
    // also treated any non-default `weeks` param as "wants open", to cover a
    // shared link landing on a real selection with the panel not yet primed
    // -- but every internal writer of `weeks` already sets `modify_weeks=open`
    // in the same update (_applyWeekSelectionParams), so that fallback was
    // never actually needed for a fresh page load. It broke closing instead:
    // a real selection is deliberately left in the URL when the panel closes
    // (see _closePanel), so the fallback would see that same `weeks` param on
    // the re-fetch closing triggers and reopen the panel the user just shut,
    // on every single close after a real selection.
    const wantsOpen = url.searchParams.get("modify_weeks") === "open";
    if (wantsOpen) {
      this._openPanel();
    }

    if (pendingWeeks !== null) {
      const selectedSet = new Set(pendingWeeks);
      this.pillTargets.forEach(pill => {
        this._setActive(pill, selectedSet.has(Number(pill.dataset.week)));
      });
    } else {
      this._syncPillStates();
    }
    this._syncVenueStates();
    this._syncWithinGameControls();
    this._syncSelectionState();
  }

  disconnect() {}

  // Opens the panel for everyone, including locked visitors: the panel itself is
  // free to look at, and the paywall belongs on the controls inside it that
  // actually unlock gated data. This used to bounce a signed-out visitor
  // straight to /signup, which asked them to buy a control they had never seen.
  toggle(event) {
    event.preventDefault();
    if (this.hasPanelTarget && !this.panelTarget.classList.contains(this.hiddenClass)) {
      this._closePanel();
    } else {
      this._openPanel();
    }
  }

  toggleWeek(event) {
    if (this.signupUrlValue) {
      this._showPaywall();
      return;
    }
    const week = Number(event.currentTarget.dataset.week);

    let selected;
    if (pendingWeeks !== null) {
      selected = [...pendingWeeks];
    } else {
      const raw = new URL(window.location.href).searchParams.get("weeks") || "";
      selected = raw.split(",").map(Number).filter(Boolean);
    }

    if (selected.includes(week)) {
      selected = selected.filter(w => w !== week);
    } else {
      selected.push(week);
      selected.sort((a, b) => a - b);
    }

    pendingWeeks = selected;

    const url = new URL(window.location.href);
    if (selected.length === 0) {
      url.searchParams.delete("weeks");
    } else {
      url.searchParams.set("weeks", selected.join(","));
    }

    this._applyWeekSelectionParams(url);
    history.replaceState(history.state, "", url.toString());

    const selectedSet = new Set(selected);
    this.pillTargets.forEach(pill => {
      this._setActive(pill, selectedSet.has(Number(pill.dataset.week)));
    });

    this._syncSelectionState();

    if (abortController) abortController.abort();
    this._scheduleVisit();
  }

  applyPreset(event) {
    const key = event.currentTarget.dataset.presetKey;
    if (this.signupUrlValue && !this.freePresetsValue.includes(key)) {
      this._showPaywall();
      return;
    }
    const weeks = this._presetWeeks(key);

    pendingWeeks = weeks;

    const url = new URL(window.location.href);
    if (weeks.length === 0) {
      url.searchParams.delete("weeks");
    } else {
      url.searchParams.set("weeks", weeks.join(","));
    }
    this._applyWeekSelectionParams(url);
    history.replaceState(history.state, "", url.toString());

    const selectedSet = new Set(weeks);
    this.pillTargets.forEach(pill => {
      this._setActive(pill, selectedSet.has(Number(pill.dataset.week)));
    });

    this._syncSelectionState();

    if (abortController) abortController.abort();
    this._scheduleVisit();
  }

  toggleVenue(event) {
    if (this.signupUrlValue) {
      this._showPaywall();
      return;
    }
    const venue = event.currentTarget.dataset.venueKey;
    if (activeVenues.has(venue)) {
      activeVenues.delete(venue);
    } else {
      activeVenues.add(venue);
    }

    const url = new URL(window.location.href);
    if (activeVenues.size > 0) {
      url.searchParams.set("venues", [...activeVenues].join(","));
    } else {
      url.searchParams.delete("venues");
    }
    url.searchParams.delete("page");
    history.replaceState(history.state, "", url.toString());

    this._syncVenueStates();
    this._syncSelectionState();

    if (abortController) abortController.abort();
    this._scheduleVisit();
  }

  // "Clear" deselects every week rather than resetting to the "All Games"
  // default — the weeks param is kept in the URL as an explicit empty value
  // (rather than deleted) so the server can tell "cleared" apart from
  // "never customized" and show a message instead of results.
  clearWeeks() {
    if (this.signupUrlValue) {
      this._showPaywall();
      return;
    }
    pendingWeeks = [];
    activeVenues.clear();

    const url = new URL(window.location.href);
    url.searchParams.set("weeks", "");
    url.searchParams.delete("venues");
    this._applyWeekSelectionParams(url);
    history.replaceState(history.state, "", url.toString());

    this.pillTargets.forEach(pill => this._setActive(pill, false));
    this.venueBtnTargets.forEach(btn => this._setActive(btn, false));
    this._syncSelectionState();

    if (abortController) abortController.abort();
    this._scheduleVisit();
  }

  // Every week interaction resets the page and drops an explicit
  // minimum-volume qualifier. The server then computes a default scaled to
  // the selected weeks; dropping the param here means a value typed before
  // the panel was opened does not override that default. Venue toggles
  // deliberately leave it alone -- Home/Away is not a week selection.
  // Presets, venue buttons and week pills are all toggle buttons, so the colour
  // change alone doesn't reach a screen reader -- aria-pressed has to move with
  // Game portion is single-select: a pill replaces the selection rather than
  // toggling into it, so picking Q1 while Q3 is active leaves only Q1. Clicking
  // the active pill falls back to Full rather than leaving nothing selected.
  selectPortion(event) {
    const key = event.currentTarget.dataset.portionKey;
    if (this.signupUrlValue && key !== "full") {
      this._showPaywall();
      return;
    }

    activePortion = activePortion === key ? "full" : key;
    this._commitWithinGame();
  }

  // The select reverts to its previous value before the paywall opens, so a
  // locked visitor does not leave the control showing a zone that is not applied.
  selectZone(event) {
    const key = event.currentTarget.value;
    if (this.signupUrlValue && key !== "full") {
      event.currentTarget.value = activeZone;
      this._showPaywall();
      return;
    }

    activeZone = key;
    this._commitWithinGame();
  }

  // Same revert-then-gate shape as selectZone: uncheck the box the browser just
  // checked, then show the paywall.
  toggleExclude(event) {
    const key = event.currentTarget.dataset.halfKey;
    if (this.signupUrlValue) {
      event.currentTarget.checked = activeExcludes.has(key);
      this._showPaywall();
      return;
    }

    if (activeExcludes.has(key)) {
      activeExcludes.delete(key);
    } else {
      activeExcludes.add(key);
    }
    this._commitWithinGame();
  }

  // The mobile handoff's season pill: one tap back to the default full-season
  // view. Unlike clearWeeks (which empties the week set outright -- "No
  // Games"), this removes every selection param so the page reads exactly as
  // a fresh visit, with the panel kept open for the next pick.
  resetToDefault() {
    pendingWeeks = null;
    activeVenues.clear();
    activePortion = "full";
    activeZone = "full";
    activeExcludes.clear();

    const url = new URL(window.location.href);
    ["weeks", "venues", "portion", "zone", "exclude_two_min", "page"].forEach(p =>
      url.searchParams.delete(p));
    url.searchParams.set("modify_weeks", "open");
    history.replaceState(history.state, "", url.toString());

    this.pillTargets.forEach(pill => this._setActive(pill, false));
    this.venueBtnTargets.forEach(btn => this._setActive(btn, false));
    this._syncWithinGameControls();
    this._syncSelectionState();

    if (abortController) abortController.abort();
    this._scheduleVisit();
  }

  // The panel's mobile RATE select (NFLWithinGameFilter#render_rate_group).
  // Rate isn't part of the within-game split -- it drives the same free
  // `rate` URL param the page's own Rate dropdown does -- so this writes it
  // directly instead of routing through _commitWithinGame.
  selectRate(event) {
    const url = new URL(window.location.href);
    const value = event.currentTarget.value;
    if (value === "season") {
      url.searchParams.delete("rate");
    } else {
      url.searchParams.set("rate", value);
    }
    url.searchParams.delete("page");
    history.replaceState(history.state, "", url.toString());

    if (abortController) abortController.abort();
    this._scheduleVisit();
  }

  // Writes the within-game selection to the URL, resyncs both rendered copies of
  // the control, and refetches. Defaults are deleted rather than written so the
  // unfiltered page keeps a bare URL.
  _commitWithinGame() {
    const url = new URL(window.location.href);

    if (activePortion === "full") {
      url.searchParams.delete("portion");
    } else {
      url.searchParams.set("portion", activePortion);
    }

    if (activeZone === "full") {
      url.searchParams.delete("zone");
    } else {
      url.searchParams.set("zone", activeZone);
    }

    if (activeExcludes.size === 0) {
      url.searchParams.delete("exclude_two_min");
    } else {
      url.searchParams.set("exclude_two_min", [...activeExcludes].join(","));
    }

    this._applyWeekSelectionParams(url);
    history.replaceState(history.state, "", url.toString());

    this._syncWithinGameControls();
    this._syncSelectionState();

    if (abortController) abortController.abort();
    this._scheduleVisit();
  }

  _syncWithinGameControls() {
    this.portionBtnTargets.forEach(btn => {
      this._setActive(btn, btn.dataset.portionKey === activePortion);
    });
    this.zoneSelectTargets.forEach(select => {
      select.value = activeZone;
    });
    this.excludeBoxTargets.forEach(box => {
      const checked = activeExcludes.has(box.dataset.halfKey);
      box.checked = checked;
      box.closest(".week-splits-filter__exclude-box")?.classList.toggle("checked", checked);
    });
  }

  // Reads the within-game selection back out of the URL. Called on connect so a
  // turbo frame swap (which tears the controller down) or a shared link restores
  // the same state the server just rendered.
  _readWithinGameFromUrl() {
    const params = new URL(window.location.href).searchParams;
    activePortion = params.get("portion") || "full";
    activeZone = params.get("zone") || "full";
    activeExcludes = new Set((params.get("exclude_two_min") || "").split(",").filter(Boolean));
  }

  // the active class (the contract UI::Pills follows server-side). Every state
  // flip in this controller goes through here.
  _setActive(element, active) {
    element.classList.toggle(this.activeClass, active);
    element.setAttribute("aria-pressed", active ? "true" : "false");
  }

  _applyWeekSelectionParams(url) {
    url.searchParams.delete("page");
    url.searchParams.delete("qualifier");
    url.searchParams.set("modify_weeks", "open");
  }

  _openPanel() {
    if (this.hasPanelTarget) {
      this.panelTarget.classList.remove(this.hiddenClass);
    }
    if (this.hasOpenClass) {
      this.element.classList.add(this.openClass);
    }
    this._initializeWeeksIfNeeded();
    this._syncSelectionState();
  }

  // Closing the panel is not the same action as Clear -- a real selection
  // (a preset/partial week set, an explicit clear, or a venue) has to survive
  // closing the panel, since "pick Home, close the panel to look at the
  // table" is the normal way to use this control, the same way a within-game
  // selection already survives it untouched. The only case that reverts the
  // URL is the untouched default: _initializeWeeksIfNeeded writes the full
  // available-week list to the URL the moment the panel opens, before the
  // user has touched anything, so closing without any real change cleans
  // that back to a bare URL rather than persisting a redundant explicit
  // weeks param.
  _closePanel() {
    if (this.hasPanelTarget) {
      this.panelTarget.classList.add(this.hiddenClass);
    }
    if (this.hasOpenClass) {
      this.element.classList.remove(this.openClass);
    }

    const untouched = !this._weeksExplicitlyCleared() && this._detectPreset() === "full" && activeVenues.size === 0;

    const url = new URL(window.location.href);
    if (untouched) {
      pendingWeeks = null;
      url.searchParams.delete("weeks");
      this.pillTargets.forEach(pill => this._setActive(pill, false));
    }
    url.searchParams.delete("modify_weeks");
    url.searchParams.delete("page");
    history.replaceState(history.state, "", url.toString());

    if (abortController) abortController.abort();
    this._scheduleVisit();
  }

  _syncVenueStates() {
    this.venueBtnTargets.forEach(btn => {
      this._setActive(btn, activeVenues.has(btn.dataset.venueKey));
    });
  }

  _syncPillStates() {
    const url      = new URL(window.location.href);
    const raw      = url.searchParams.get("weeks") || "";
    const selected = new Set(raw.split(",").map(Number).filter(Boolean));
    this.pillTargets.forEach(pill => {
      const week = Number(pill.dataset.week);
      this._setActive(pill, selected.has(week));
    });
  }

  _initializeWeeksIfNeeded() {
    const url = new URL(window.location.href);
    if (url.searchParams.has("weeks") || pendingWeeks !== null) return;

    pendingWeeks = [...this.availableWeeksValue];

    const selectedSet = new Set(pendingWeeks);
    this.pillTargets.forEach(pill => {
      this._setActive(pill, selectedSet.has(Number(pill.dataset.week)));
    });

    url.searchParams.set("weeks", pendingWeeks.join(","));
    this._applyWeekSelectionParams(url);
    history.replaceState(history.state, "", url.toString());

    if (abortController) abortController.abort();
    this._scheduleVisit();
  }

  _presetWeeks(key) {
    const available = [...this.availableWeeksValue].toSorted((a, b) => a - b);
    switch (key) {
      case "full": return available;
      case "l1":   return available.slice(-1);
      case "l3":   return available.slice(-3);
      case "l5":   return available.slice(-5);
      case "l10":  return available.slice(-10);
      default:     return available;
    }
  }

  _detectPreset() {
    // No weeks param at all (never customized) has to read as "full", not
    // "no preset matched": with pendingWeeks unset, `current` below computes
    // to the same empty array an *explicit* clear (weeks="") produces, which
    // correctly matches no candidate -- but unlike a real clear, "never
    // touched" is the true default and every caller (_hasActiveSelection in
    // particular) needs that distinction to not show a real selection.
    if (pendingWeeks === null && !new URL(window.location.href).searchParams.has("weeks")) {
      return "full";
    }

    const available = [...this.availableWeeksValue].toSorted((a, b) => a - b);
    const current = (pendingWeeks !== null
      ? pendingWeeks
      : (new URL(window.location.href).searchParams.get("weeks") || "")
          .split(",").map(Number).filter(Boolean)
    ).toSorted((a, b) => a - b);

    const candidates = {
      full: available,
      l10:  available.slice(-10),
      l5:   available.slice(-5),
      l3:   available.slice(-3),
      l1:   available.slice(-1),
    };
    for (const [key, weeks] of Object.entries(candidates)) {
      if (current.length === weeks.length && current.every((w, i) => w === weeks[i])) return key;
    }
    return null;
  }

  _weekRangeText(weeks) {
    if (!weeks.length) return "";
    const sorted = [...weeks].toSorted((a, b) => a - b);
    const parts = [];
    let start = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i <= sorted.length; i++) {
      if (sorted[i] === prev + 1) { prev = sorted[i]; continue; }
      parts.push(start === prev ? `${start}` : `${start}–${prev}`);
      start = prev = sorted[i];
    }
    return "Wk " + parts.join(", ");
  }

  // True once the "Clear" button has been used: distinct from the default
  // "All Games" state (no weeks param at all), which parses to the same
  // empty `weeks` array but means "never customized."
  _weeksExplicitlyCleared() {
    if (pendingWeeks !== null) return pendingWeeks.length === 0;
    return new URL(window.location.href).searchParams.get("weeks") === "";
  }

  // True once the state actually differs from the full-season default --
  // distinct from the panel merely being open. "All Games" is what
  // _initializeWeeksIfNeeded writes to the URL the moment the panel opens
  // (before the user has touched anything), so it has to keep reading as
  // the default rather than as a selection, the same way it already does
  // for the preset-button active state and the Custom Split column
  // (Stats::NFL::PageData#custom_weeks?).
  _hasActiveSelection() {
    if (this._weeksExplicitlyCleared()) return true;
    if (this._detectPreset() !== "full") return true;
    if (activeVenues.size > 0) return true;
    return activePortion !== "full" || activeZone !== "full" || activeExcludes.size > 0;
  }

  _syncSelectionState() {
    if (this.hasHasSelectionClass) {
      this.element.classList.toggle(this.hasSelectionClass, this._hasActiveSelection());
    }

    const preset = this._detectPreset();

    // Sync preset button active states
    this.presetBtnTargets.forEach(btn => {
      this._setActive(btn, btn.dataset.presetKey === preset);
    });

    // The season pill is the inverse of every other control: lit exactly when
    // nothing is selected (the default full-season view it represents).
    this.seasonBtnTargets.forEach(btn => {
      this._setActive(btn, !this._hasActiveSelection());
    });

    this._updateTriggerSummary(preset);
  }

  // Composes the compact selection summary the collapsed mobile trigger shows
  // in place of the brand name ("1H · Ex. 2 min.", per the mobile handoff).
  // Deliberately terse: the trigger is one short pill, so zone labels
  // compress ("In 20") and the two exclusion checkboxes collapse to a single
  // "Ex. 2 min." regardless of which halves are picked. CSS decides when it
  // is visible (mobile + --has-selection + panel closed); this only keeps
  // the text current.
  _updateTriggerSummary(preset) {
    if (!this.hasTriggerSummaryTarget) return;

    const portionNames = { h1: "1H", h2: "2H", q1: "Q1", q2: "Q2", q3: "Q3", q4: "Q4" };
    const zoneNames = { z20: "In 20", z10: "In 10", z5: "In 5", z2: "In 2" };
    const parts = [];
    if (portionNames[activePortion]) parts.push(portionNames[activePortion]);
    if (zoneNames[activeZone]) parts.push(zoneNames[activeZone]);
    [...activeVenues].forEach(v => parts.push(v.charAt(0).toUpperCase() + v.slice(1)));
    if (activeExcludes.size > 0) parts.push("Ex. 2 min.");
    if (parts.length === 0 && this._hasActiveSelection()) {
      const presetNames = { l1: "Last 1", l3: "Last 3", l5: "Last 5", l10: "Last 10" };
      if (presetNames[preset]) {
        parts.push(presetNames[preset]);
      } else {
        // A custom week pick reads as its range, "Wk. (3-5)" -- the same
        // phrasing the Custom Split column header uses server-side
        // (Stats::NFL::ModifyWeeksFilters#weeks_label).
        const weeks = pendingWeeks !== null
          ? pendingWeeks
          : (new URL(window.location.href).searchParams.get("weeks") || "")
              .split(",").map(Number).filter(Boolean);
        const range = this._weekRangeText(weeks).replace(/^Wk /, "");
        parts.push(range ? `Wk. (${range})` : "Custom Wks");
      }
    }
    this.triggerSummaryTargets.forEach(el => { el.textContent = parts.join(" · "); });
  }

  // Opens the splits paywall dialog (Components::Stats::SplitsPaywallModal,
  // mounted by Components::Stats::Page for locked visitors). Every locked
  // interaction routes through here: week pills, venues, and the within-game
  // controls.
  //
  // Falls back to navigating to the signup URL when no dialog is on the page,
  // which is what locked_filters_controller already does for the same reason.
  // Something has to happen when a locked control is clicked.
  _showPaywall() {
    const modal = document.getElementById("paywall-modal");
    if (!modal) {
      if (this.signupUrlValue) Turbo.visit(this.signupUrlValue);
      return;
    }
    // Guard against a second call reaching showModal() on an already-open dialog.
    if (!modal.open) modal.showModal();
  }

  _scheduleVisit() {
    clearTimeout(visitTimer);
    const frameId = this.turboFrameValue;
    const generation = ++visitGeneration;

    visitTimer = setTimeout(() => {
      abortController = new AbortController();
      beginFrameLoading(frameId);

      fetchFrameHtml(frameId, { signal: abortController.signal })
        .then(html => {
          if (generation !== visitGeneration) return;
          pendingWeeks = null;
          applyFrameSwap(html, frameId);
          endFrameLoading(frameId);
        })
        .catch(error => {
          if (error.name === "AbortError") return;
          console.error(error);
          if (generation === visitGeneration) endFrameLoading(frameId, { error: true });
        });
    }, DEBOUNCE_MS);
  }
}
