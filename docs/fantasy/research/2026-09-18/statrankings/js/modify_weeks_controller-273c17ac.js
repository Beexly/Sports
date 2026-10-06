import { Controller } from "@hotwired/stimulus";
import {
  DEBOUNCE_MS, fetchFrameHtml, applyFrameSwap, beginFrameLoading, endFrameLoading,
} from "turbo_frame_refresh";

// Module-level state survives controller teardown when the turbo frame is replaced
let visitTimer = null;
let pendingWeeks = null;
let abortController = null;
let visitGeneration = 0;
let activeVenues = new Set();

export default class extends Controller {
  static targets = [
    "panel", "pill", "triggerLabel", "selectedSummary", "collapsedSummary", "presetBtn", "venueBtn",
  ];
  static classes = ["open", "active", "hidden"];
  static values = {
    signedIn:       Boolean,
    turboFrame:     { type: String, default: "stats-content" },
    availableWeeks: { type: Array, default: [] },
    alwaysOpen:     { type: Boolean, default: false },
    signupUrl:      { type: String,  default: "" },
    // "full" (All Games) is the default state, so returning to it is always
    // free -- same rule as week_splits_controller and the URL-smuggle guard
    // in connect() below, which both already treat All Games as free.
    freePresets:    { type: Array,   default: ["full", "l1", "l3"] },
  };

  connect() {
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

    const currentVenuesParam = url.searchParams.get("venues");
    if (currentVenuesParam) {
      currentVenuesParam.split(",").forEach(v => activeVenues.add(v.trim()));
    }

    if (this.alwaysOpenValue) {
      this._connectAlwaysOpen(url.searchParams.get("weeks"));
      return;
    }

    const wantsOpen = url.searchParams.get("modify_weeks") === "open" || Boolean(url.searchParams.get("weeks"));
    if (wantsOpen) {
      this._openPanel();
    }

    if (pendingWeeks !== null) {
      const selectedSet = new Set(pendingWeeks);
      this.pillTargets.forEach(pill => {
        pill.classList.toggle(this.activeClass, selectedSet.has(Number(pill.dataset.week)));
      });
    } else {
      this._syncPillStates();
    }
    this._syncVenueStates();
    this._updateSelectedSummary();
  }

  // weeksParam is null when the "weeks" param is absent (default, never
  // customized), "" when explicitly cleared (empty string is falsy in JS,
  // so it must be checked before the truthy branch), or a real
  // comma-separated list otherwise.
  _connectAlwaysOpen(weeksParam) {
    if (weeksParam) {
      this._syncPillStates();
    } else if (weeksParam === "") {
      pendingWeeks = [];
      this.pillTargets.forEach(pill => pill.classList.remove(this.activeClass));
    } else {
      pendingWeeks = [...this.availableWeeksValue];
      const availableSet = new Set(this.availableWeeksValue);
      this.pillTargets.forEach(pill => {
        pill.classList.toggle(this.activeClass, availableSet.has(Number(pill.dataset.week)));
      });
    }
    this._syncVenueStates();
    this._updateSelectedSummary();
  }

  disconnect() {}

  toggle(event) {
    event.preventDefault();
    if (!this.signedInValue) {
      const current = window.location.pathname + window.location.search;
      const returnUrl = current.includes("?")
        ? current + "&modify_weeks=open"
        : current + "?modify_weeks=open";
      window.location.assign("/signup?return_to=" + encodeURIComponent(returnUrl));
      return;
    }
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

    url.searchParams.delete("page");
    url.searchParams.set("modify_weeks", "open");
    history.replaceState(history.state, "", url.toString());

    const selectedSet = new Set(selected);
    this.pillTargets.forEach(pill => {
      pill.classList.toggle(this.activeClass, selectedSet.has(Number(pill.dataset.week)));
    });

    this._updateSelectedSummary();

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
    url.searchParams.delete("page");
    url.searchParams.set("modify_weeks", "open");
    history.replaceState(history.state, "", url.toString());

    const selectedSet = new Set(weeks);
    this.pillTargets.forEach(pill => {
      pill.classList.toggle(this.activeClass, selectedSet.has(Number(pill.dataset.week)));
    });

    this._updateSelectedSummary();

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
      event.currentTarget.classList.remove(this.activeClass);
    } else {
      activeVenues.add(venue);
      event.currentTarget.classList.add(this.activeClass);
    }

    const url = new URL(window.location.href);
    if (activeVenues.size > 0) {
      url.searchParams.set("venues", [...activeVenues].join(","));
    } else {
      url.searchParams.delete("venues");
    }
    url.searchParams.delete("page");
    history.replaceState(history.state, "", url.toString());

    this._updateSelectedSummary();

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
    url.searchParams.delete("page");
    url.searchParams.set("modify_weeks", "open");
    history.replaceState(history.state, "", url.toString());

    this.pillTargets.forEach(pill => pill.classList.remove(this.activeClass));
    this.venueBtnTargets.forEach(btn => btn.classList.remove(this.activeClass));
    this._updateSelectedSummary();

    if (abortController) abortController.abort();
    this._scheduleVisit();
  }

  _openPanel() {
    if (this.hasPanelTarget) {
      this.panelTarget.classList.remove(this.hiddenClass);
    }
    if (this.hasOpenClass) {
      this.element.classList.add(this.openClass);
    }
    if (this.hasTriggerLabelTarget) {
      this.triggerLabelTarget.textContent = "Default View";
    }
    this._initializeWeeksIfNeeded();
    this._updateSelectedSummary();
  }

  _closePanel() {
    if (this.hasPanelTarget) {
      this.panelTarget.classList.add(this.hiddenClass);
    }
    if (this.hasOpenClass) {
      this.element.classList.remove(this.openClass);
    }
    if (this.hasTriggerLabelTarget) {
      this.triggerLabelTarget.textContent = "Customize Weeks";
    }

    pendingWeeks = null;
    activeVenues.clear();
    this.pillTargets.forEach(pill => pill.classList.remove(this.activeClass));
    this.venueBtnTargets.forEach(btn => btn.classList.remove(this.activeClass));

    const url = new URL(window.location.href);
    url.searchParams.delete("weeks");
    url.searchParams.delete("venues");
    url.searchParams.delete("modify_weeks");
    url.searchParams.delete("page");
    history.replaceState(history.state, "", url.toString());

    if (abortController) abortController.abort();
    this._scheduleVisit();
  }

  _syncVenueStates() {
    this.venueBtnTargets.forEach(btn => {
      btn.classList.toggle(this.activeClass, activeVenues.has(btn.dataset.venueKey));
    });
  }

  _syncPillStates() {
    const url      = new URL(window.location.href);
    const raw      = url.searchParams.get("weeks") || "";
    const selected = new Set(raw.split(",").map(Number).filter(Boolean));
    this.pillTargets.forEach(pill => {
      const week = Number(pill.dataset.week);
      pill.classList.toggle(this.activeClass, selected.has(week));
    });
  }

  _initializeWeeksIfNeeded() {
    const url = new URL(window.location.href);
    if (url.searchParams.has("weeks") || pendingWeeks !== null) return;

    pendingWeeks = [...this.availableWeeksValue];

    const selectedSet = new Set(pendingWeeks);
    this.pillTargets.forEach(pill => {
      pill.classList.toggle(this.activeClass, selectedSet.has(Number(pill.dataset.week)));
    });

    url.searchParams.set("weeks", pendingWeeks.join(","));
    url.searchParams.delete("page");
    url.searchParams.set("modify_weeks", "open");
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
      parts.push(start === prev ? `${start}` : `${start}\u2013${prev}`);
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

  // Preset-button active-state syncing below must run regardless of which
  // (if any) summary-display targets are present on the page — there is no
  // blanket early-return here; each section below guards only the DOM it
  // actually touches.
  _updateSelectedSummary() {
    const cleared = this._weeksExplicitlyCleared();
    const weeks = pendingWeeks !== null
      ? pendingWeeks
      : (new URL(window.location.href).searchParams.get("weeks") || "")
          .split(",").map(Number).filter(Boolean);

    const preset = this._detectPreset();
    const presetNames = { full: "All Games", l1: "Last 1", l3: "Last 3", l5: "Last 5", l10: "Last 10" };
    let label = preset ? presetNames[preset] : this._weekRangeText(weeks);

    // Append active venues
    if (activeVenues.size > 0) {
      const venueLabels = [...activeVenues].map(v => v.charAt(0).toUpperCase() + v.slice(1));
      label = label + " + " + venueLabels.join(" + ");
    }

    // Sync preset button active states
    this.presetBtnTargets.forEach(btn => {
      btn.classList.toggle(this.activeClass, btn.dataset.presetKey === preset);
    });

    // Persistent status label in the card header (StatBuilder+/CoverageIQ
    // weeks cards). Empty selection means the full range, so fall back to
    // "All Games" — unless the user explicitly cleared it, which means none.
    if (this.hasCollapsedSummaryTarget) {
      this.collapsedSummaryTarget.textContent = cleared ? "No Games Selected" : (weeks.length > 0 ? label : "All Games");
    }

    if (!this.hasSelectedSummaryTarget) return;

    // Rebuild in-panel summary content ("Selected: <pill>")
    const el = this.selectedSummaryTarget;
    el.innerHTML = "";

    const pre = document.createElement("span");
    pre.className = "modify-weeks-filter__selected-pre";
    pre.textContent = "Selected:";
    el.appendChild(pre);

    if (weeks.length > 0 || cleared) {
      const pill = document.createElement("span");
      pill.className = "modify-weeks-filter__selected-pill";
      pill.textContent = cleared ? "None" : label;
      el.appendChild(pill);
    }
  }

  _showPaywall() {
    const modal = document.getElementById("paywall-modal");
    // The control is rendered twice (one per placement); guard against a second
    // instance calling showModal() on an already-open dialog.
    if (modal && !modal.open) {
      modal.showModal();
    }
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
