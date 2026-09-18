import { Controller } from "@hotwired/stimulus"
import { dispatchAnalytics } from "dispatch_analytics"

export default class extends Controller {
  static targets = ["panel", "trigger"]

  toggle() {
    this.panelTarget.hidden = !this.panelTarget.hidden
    this.#syncTriggerExpanded()
    dispatchAnalytics("more_stats_toggle", { action: this.panelTarget.hidden ? "close" : "open" })
  }

  close() {
    this.panelTarget.hidden = true
    this.#syncTriggerExpanded()
  }

  #syncTriggerExpanded() {
    if (this.hasTriggerTarget) {
      this.triggerTarget.setAttribute("aria-expanded", this.panelTarget.hidden ? "false" : "true")
    }
  }

  closeOnOutsideClick(event) {
    if (!this.element.contains(event.target)) {
      this.close()
    }
  }

  closeOnEscape(event) {
    if (event.key === "Escape") {
      this.close()
    }
  }

  connect() {
    this.boundCloseOnOutsideClick = this.closeOnOutsideClick.bind(this)
    this.boundCloseOnEscape = this.closeOnEscape.bind(this)
    document.addEventListener("click", this.boundCloseOnOutsideClick)
    document.addEventListener("keydown", this.boundCloseOnEscape)
  }

  disconnect() {
    document.removeEventListener("click", this.boundCloseOnOutsideClick)
    document.removeEventListener("keydown", this.boundCloseOnEscape)
  }
}
