import { Controller } from "@hotwired/stimulus";

// Multi-year season selector for the Coverage Intelligence Tool.
// Renders a dropdown panel of individual season checkboxes. The panel stays
// open while the user toggles multiple seasons; the URL "seasons" param is only
// updated and the turbo frame reloaded once the panel closes (so the reload
// doesn't dismiss the panel mid-selection).

export default class extends Controller {
  static targets = ["trigger", "panel", "label", "option"];
  static values = {
    active:     { type: Array, default: [] },
    turboFrame: { type: String, default: "stats-content" },
  };

  connect() {
    this._dirty = false;
    this._syncUI();
    this._handleOutsideClick = this._handleOutsideClick.bind(this);
    document.addEventListener("click", this._handleOutsideClick);
  }

  disconnect() {
    document.removeEventListener("click", this._handleOutsideClick);
  }

  toggle(event) {
    event.stopPropagation();
    const willOpen = this.panelTarget.classList.contains("hidden");
    this.panelTarget.classList.toggle("hidden");
    if (!willOpen) this._commit();
  }

  // Toggle individual season on/off. Keeps the panel open and defers the
  // turbo-frame visit until the panel closes.
  toggleSeason(event) {
    const year = parseInt(event.currentTarget.dataset.value, 10);
    const active = new Set(this.activeValue.map(Number));

    if (active.has(year)) {
      active.delete(year);
    } else {
      active.add(year);
    }

    this.activeValue = [...active].toSorted((a, b) => b - a);
    this._dirty = true;
    this._syncUI();
  }

  _syncUI() {
    const active = new Set(this.activeValue.map(Number));

    this.optionTargets.forEach(opt => {
      const year = parseInt(opt.dataset.value, 10);
      opt.classList.toggle("active", active.has(year));
    });

    if (this.hasLabelTarget) {
      this.labelTarget.textContent = this._formatLabel();
    }
  }

  _formatLabel() {
    const active = this.activeValue.map(Number).toSorted((a, b) => a - b);
    if (active.length === 0) return "Select Season";
    if (active.length === 1) return active[0].toString();
    const isConsecutive = active.every((year, i) => i === 0 || year === active[i - 1] + 1);
    return isConsecutive ? `${active[0]}-${active[active.length - 1]}` : active.join(", ");
  }

  // Apply the accumulated selection: update the URL "seasons" param and reload
  // the turbo frame. No-op unless the selection changed since the panel opened.
  _commit() {
    if (!this._dirty) return;
    this._dirty = false;

    const url = new URL(window.location.href);
    const active = this.activeValue;

    if (active.length <= 1) {
      // Single season or empty — use simple season param
      url.searchParams.delete("seasons");
      if (active.length === 1) {
        url.searchParams.set("seasons", active[0].toString());
      }
    } else {
      url.searchParams.set("seasons", active.join(","));
    }
    url.searchParams.delete("page");
    history.replaceState(history.state, "", url.toString());

    const frame = document.getElementById(this.turboFrameValue);
    if (frame) {
      frame.src = url.toString();
    }

    this._syncFilterReset();
  }

  // The FILTERS card's reset button lives on the ancestor v2-filter
  // controller, outside this element — its default check needs to react to
  // season changes too, so nudge it after every commit.
  _syncFilterReset() {
    const filterEl = this.element.closest('[data-controller~="v2-filter"]');
    if (!filterEl) return;

    const ctrl = this.application.getControllerForElementAndIdentifier(filterEl, "v2-filter");
    ctrl?.syncResetVisibility();
  }

  _handleOutsideClick(event) {
    if (!this.element.contains(event.target)) {
      if (!this.panelTarget.classList.contains("hidden")) {
        this.panelTarget.classList.add("hidden");
        this._commit();
      }
    }
  }
}
