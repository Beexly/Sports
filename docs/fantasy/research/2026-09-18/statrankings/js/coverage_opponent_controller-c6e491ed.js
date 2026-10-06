import { Controller } from "@hotwired/stimulus";

// Offense Next Opp coverage popover for the Coverage Intelligence Tool.
// On hover/focus of the Next Opp cell, lazily fetches the opponent's coverage
// distribution card HTML once and injects it into the popover element. The
// fetched markup is cached so repeated hovers don't re-request.

let openController = null;

export default class extends Controller {
  static targets = ["popover"];
  static values = { url: String };

  connect() {
    this._fetched = false;
    this._hideTimer = null;
  }

  disconnect() {
    clearTimeout(this._hideTimer);
    if (openController === this) openController = null;
  }

  show() {
    clearTimeout(this._hideTimer);

    // Only one popover open at a time.
    if (openController && openController !== this) openController._hideNow();
    openController = this;

    this.popoverTarget.classList.remove("hidden");
    this._reposition();
    this._load();
  }

  _reposition() {
    const trigger = this.element.getBoundingClientRect();
    const popover = this.popoverTarget;
    const GAP = 8;
    const WIDTH = popover.offsetWidth || 304; // 19rem fallback
    const HEIGHT = popover.offsetHeight || 500;

    const spaceAbove = trigger.top - GAP;
    const spaceBelow = window.innerHeight - trigger.bottom - GAP;
    const spaceRight = window.innerWidth - trigger.right - GAP;

    // Reset all sides before repositioning.
    popover.style.top = popover.style.bottom = popover.style.left = popover.style.right = "";

    if (spaceBelow >= HEIGHT) {
      // Preferred: open below, centered on trigger.
      popover.style.top = `${trigger.bottom + GAP}px`;
      const left = Math.max(8, Math.min(trigger.left + trigger.width / 2 - WIDTH / 2, window.innerWidth - WIDTH - 8));
      popover.style.left = `${left}px`;
    } else if (spaceAbove >= HEIGHT) {
      // Open above, centered on trigger.
      popover.style.bottom = `${window.innerHeight - trigger.top + GAP}px`;
      const left = Math.max(8, Math.min(trigger.left + trigger.width / 2 - WIDTH / 2, window.innerWidth - WIDTH - 8));
      popover.style.left = `${left}px`;
    } else if (spaceRight >= WIDTH) {
      // Neither fits vertically — open to the right, clamped vertically.
      popover.style.left = `${trigger.right + GAP}px`;
      const top = Math.max(8, Math.min(trigger.top + trigger.height / 2 - HEIGHT / 2, window.innerHeight - HEIGHT - 8));
      popover.style.top = `${top}px`;
    } else {
      // Last resort: open to the left, clamped vertically.
      popover.style.left = `${Math.max(8, trigger.left - WIDTH - GAP)}px`;
      const top = Math.max(8, Math.min(trigger.top + trigger.height / 2 - HEIGHT / 2, window.innerHeight - HEIGHT - 8));
      popover.style.top = `${top}px`;
    }
  }

  hide() {
    clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => this._hideNow(), 120);
  }

  _hideNow() {
    this.popoverTarget.classList.add("hidden");
    if (openController === this) openController = null;
  }

  async _load() {
    if (this._fetched || !this.urlValue) return;
    this._fetched = true;

    try {
      const resp = await fetch(this.urlValue, {
        headers: { Accept: "text/html" },
      });
      // The Turbo frame may have replaced this row mid-flight, detaching the
      // controller. Bail before touching a target that no longer exists.
      if (!this.hasPopoverTarget) return;
      if (resp.status === 204) {
        this.popoverTarget.innerHTML =
          '<div class="ci-opp-card ci-opp-card--empty">No coverage data available.</div>';
        this._reposition();
        return;
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const html = await resp.text();
      if (!this.hasPopoverTarget) return;
      this.popoverTarget.innerHTML = html;
      this._reposition();
    } catch {
      this._fetched = false;
      if (!this.hasPopoverTarget) return;
      this.popoverTarget.innerHTML =
        '<div class="ci-opp-card ci-opp-card--empty">Unable to load coverage data.</div>';
      this._reposition();
    }
  }
}
