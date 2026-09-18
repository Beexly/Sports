import { Controller } from "@hotwired/stimulus";

// Custom weeks multi-select controller for the Coverage Intelligence Tool.
// Renders an always-visible row of week 1-18 buttons. Selection changes update
// the URL query param "weeks" and trigger a debounced turbo frame visit.

const DEBOUNCE_MS = 300;

export default class extends Controller {
  static targets = ["label", "weekBtn"];
  static values = {
    active:     { type: Array, default: [] },
    turboFrame: { type: String, default: "stats-content" },
  };

  connect() {
    this._visitTimer = null;
    this._syncUI();
  }

  disconnect() {
    clearTimeout(this._visitTimer);
  }

  // Toggle individual week on/off.
  toggleWeek(event) {
    const week = parseInt(event.currentTarget.dataset.week, 10);
    const active = new Set(this.activeValue.map(Number));

    if (active.has(week)) {
      active.delete(week);
    } else {
      active.add(week);
    }

    this.activeValue = [...active].toSorted((a, b) => a - b);
    this._syncUI();
    this._scheduleVisit();
  }

  selectAll() {
    this.activeValue = Array.from({ length: 18 }, (_, i) => i + 1);
    this._syncUI();
    this._scheduleVisit();
  }

  // Reset to the all-selected default: weeks 1-18 selected, no "weeks" param
  // (the query treats that as all weeks). Matches the all-selected initial
  // render so the pills don't appear to do nothing.
  clearAll() {
    this.activeValue = Array.from({ length: 18 }, (_, i) => i + 1);
    this._syncUI();
    this._scheduleVisit();
  }

  _syncUI() {
    const active = new Set(this.activeValue.map(Number));

    this.weekBtnTargets.forEach(btn => {
      const week = parseInt(btn.dataset.week, 10);
      btn.classList.toggle("active", active.has(week));
    });

    if (this.hasLabelTarget) {
      this.labelTarget.textContent = this._formatLabel();
    }
  }

  _formatLabel() {
    const active = this.activeValue.map(Number);
    if (active.length === 0 || active.length === 18) return "All weeks selected";
    if (active.length === 1) return `Week ${active[0]} selected`;
    return `${active.length} of 18 weeks selected`;
  }

  // Debounced turbo frame visit with updated URL params.
  _scheduleVisit() {
    clearTimeout(this._visitTimer);
    this._visitTimer = setTimeout(() => {
      const url = new URL(window.location.href);
      const active = this.activeValue;

      if (active.length === 0 || active.length === 18) {
        url.searchParams.delete("weeks");
      } else {
        url.searchParams.set("weeks", active.join(","));
      }
      url.searchParams.delete("page");
      history.replaceState(history.state, "", url.toString());

      const frame = document.getElementById(this.turboFrameValue);
      if (frame) {
        frame.src = url.toString();
      }
    }, DEBOUNCE_MS);
  }
}
