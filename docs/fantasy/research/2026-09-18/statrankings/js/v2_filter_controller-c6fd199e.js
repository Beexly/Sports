import { Controller } from "@hotwired/stimulus";

const DEBOUNCE_MS = 300;

// Drives the V2 filter bar: native selects + text/number inputs
// that navigate a Turbo Frame by updating URL search params.
export default class extends Controller {
  static values = {
    frame:         { type: String, default: "stats-content" },
    // Matches SeasonHelper.nfl_season server-side — the season a blank/
    // single-selected "seasons" param falls back to, so the reset button
    // can tell a default selection from a real filter.
    currentSeason: Number,
  };
  static targets = ["display", "resetWrapper"];

  connect() {
    this._timers = new Map();
  }

  disconnect() {
    this._timers.forEach(t => clearTimeout(t));
  }

  // Called on <select> change events.
  navigate(event) {
    const display = event.currentTarget.closest(".v2-filter")?.querySelector("[data-v2-filter-target='display']");
    if (display) {
      const v = event.currentTarget.value;
      display.textContent = v === "" || v.toLowerCase() === "all" ? "All" : v;
    }
    this._update(event.params.name, event.currentTarget.value);
  }

  reset() {
    this._timers.forEach(t => clearTimeout(t));
    this._timers.clear();

    // Reset all selects and inputs within this card.
    this.element.querySelectorAll("select").forEach(el => { el.selectedIndex = 0; });
    this.element.querySelectorAll("input[type='text'], input[type='number']").forEach(el => { el.value = ""; });

    // Reset display spans that mirror select values (skip seasons — handled separately).
    this.element.querySelectorAll(".v2-filter__display").forEach(el => {
      if (!el.closest("[data-controller~='coverage-seasons']")) el.textContent = "All";
    });

    // Reset the seasons controller to just the most recent available season.
    const seasonsEl = this.element.querySelector("[data-controller~='coverage-seasons']");
    if (seasonsEl) {
      const ctrl = this.application.getControllerForElementAndIdentifier(seasonsEl, "coverage-seasons");
      if (ctrl && ctrl.optionTargets.length > 0) {
        const latestYear = parseInt(ctrl.optionTargets[0].dataset.value, 10);
        ctrl.activeValue = [latestYear];
        ctrl._syncUI();
      }
    }

    const url = new URL(window.location.href);
    ["position", "team", "player_name", "qualifier", "seasons"].forEach(p => url.searchParams.delete(p));
    url.searchParams.delete("page");
    history.replaceState(history.state, "", url.toString());

    const frame = document.getElementById(this.frameValue);
    if (frame) frame.src = url.toString();
    this.syncResetVisibility();
  }

  // Called on text/number input events — debounced 300ms.
  search(event) {
    const name = event.params.name;
    const value = event.currentTarget.value;
    clearTimeout(this._timers.get(name));
    this._timers.set(name, setTimeout(() => this._update(name, value), DEBOUNCE_MS));
  }

  // Also called by coverage-seasons#_commit — its own selection lives
  // outside this controller, but the reset button's default check needs to
  // account for it too.
  syncResetVisibility() {
    if (!this.hasResetWrapperTarget) return;

    const p = new URLSearchParams(window.location.search);
    const isDefault = (p.get("position") || "WR") === "WR"
      && !p.get("team") && !p.get("player_name") && !p.get("qualifier")
      && this._isDefaultSeasons(p);
    this.resetWrapperTarget.classList.toggle("hidden", isDefault);
  }

  _isDefaultSeasons(params) {
    const raw = params.get("seasons");
    if (!raw) return true;
    const years = raw.split(",").map(Number);
    return years.length === 1 && years[0] === this.currentSeasonValue;
  }

  _update(name, value) {
    const url = new URL(window.location.href);
    const v = (value ?? "").trim();
    if (v !== "" && v.toLowerCase() !== "all") {
      url.searchParams.set(name, v);
    } else {
      url.searchParams.delete(name);
    }
    url.searchParams.delete("page");
    history.replaceState(history.state, "", url.toString());
    const frame = document.getElementById(this.frameValue);
    if (frame) frame.src = url.toString();
    this.syncResetVisibility();
  }
}
