import { Controller } from "@hotwired/stimulus";

// Coverage shell multi-select controller for the Coverage Intelligence Tool.
// Manages individual coverage buttons and group toggle buttons.
// Group is active when any of its members are selected.
//
// Group button mapping:
//   Man  → ['0','1','2M']
//   Zone → ['2','3','4','6','9']

const DEBOUNCE_MS = 300;

const GROUPS = {
  man:  ["0", "1", "2M"],
  zone: ["2", "3", "4", "6", "9"],
};

const ALL_COVERAGES = ["0", "1", "2", "2M", "3", "4", "6", "9"];

export default class extends Controller {
  static targets = ["coverageBtn", "groupBtn", "groupCard", "label"];
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

  // Toggle a single coverage type on/off.
  toggleCoverage(event) {
    const value = event.currentTarget.dataset.value;
    const active = new Set(this.activeValue);
    if (active.has(value)) {
      active.delete(value);
    } else {
      active.add(value);
    }
    this.activeValue = ALL_COVERAGES.filter(c => active.has(c));
    this._syncUI();
    this._scheduleVisit();
  }

  // Toggle a coverage group — if all members are active, deactivate them;
  // otherwise activate all members.
  toggleGroup(event) {
    const group = event.currentTarget.dataset.group;
    const members = GROUPS[group] || [];
    const active = new Set(this.activeValue);
    const allActive = members.every(m => active.has(m));

    members.forEach(m => {
      if (allActive) {
        active.delete(m);
      } else {
        active.add(m);
      }
    });

    this.activeValue = ALL_COVERAGES.filter(c => active.has(c));
    this._syncUI();
    this._scheduleVisit();
  }

  selectAll() {
    this.activeValue = [...ALL_COVERAGES];
    this._syncUI();
    this._scheduleVisit();
  }

  clearAll() {
    this.activeValue = [];
    this._syncUI();
    this._scheduleVisit();
  }

  clearGroup(event) {
    const group = event.currentTarget.dataset.group;
    const members = GROUPS[group] || [];
    const active = new Set(this.activeValue);
    members.forEach(m => active.delete(m));
    this.activeValue = ALL_COVERAGES.filter(c => active.has(c));
    this._syncUI();
    this._scheduleVisit();
  }

  // Sync button active states and status badge to match the current selection.
  _syncUI() {
    const active = new Set(this.activeValue);

    this.coverageBtnTargets.forEach(btn => {
      btn.classList.toggle("active", active.has(btn.dataset.value));
    });

    this.groupBtnTargets.forEach(btn => {
      const members = GROUPS[btn.dataset.group] || [];
      const allActive = members.every(m => active.has(m));
      btn.classList.toggle("active", allActive);
    });

    this.groupCardTargets.forEach(card => {
      const members = GROUPS[card.dataset.group] || [];
      card.classList.toggle("group-active", members.some(m => active.has(m)));
    });

    if (this.hasLabelTarget) {
      this.labelTarget.textContent = this._formatLabel();
    }
  }

  _formatLabel() {
    const n = this.activeValue.length;
    if (n === ALL_COVERAGES.length) return "All coverages selected";
    return `${n} of ${ALL_COVERAGES.length} selected`;
  }

  // Debounced turbo frame visit with updated URL params.
  _scheduleVisit() {
    clearTimeout(this._visitTimer);
    this._visitTimer = setTimeout(() => {
      const url = new URL(window.location.href);
      const active = this.activeValue;

      if (active.length === ALL_COVERAGES.length) {
        url.searchParams.delete("coverages");
      } else if (active.length === 0) {
        url.searchParams.set("coverages", "");
      } else {
        url.searchParams.set("coverages", active.join(","));
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
