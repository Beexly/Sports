import { Controller } from "@hotwired/stimulus";

// Generic show/hide for a trigger + panel pair. Toggles the expanded class on
// the controller element -- CSS decides what that reveals -- and keeps the
// trigger's aria-expanded in sync. Used by the Fantasy Rankings export bar,
// whose buttons collapse behind an "Export" toggle on mobile.
export default class extends Controller {
  static targets = ["trigger"];
  static classes = ["expanded"];

  toggle() {
    const expanded = this.element.classList.toggle(this.expandedClass);

    if (this.hasTriggerTarget) {
      this.triggerTarget.setAttribute("aria-expanded", expanded ? "true" : "false");
    }
  }
}
