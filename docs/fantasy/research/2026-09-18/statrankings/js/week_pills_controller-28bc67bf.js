import { Controller } from "@hotwired/stimulus"
import { dispatchAnalytics } from "dispatch_analytics"

// Multi-select week pills for the Playoff Schedule Grid: toggling a pill
// merges the selected weeks into the current URL as a comma list
// (?weeks=14,15,16) and navigates via Turbo, so the server HTML never
// contains crawlable filter anchors (same rationale as position-pill-strip,
// which is single-select).
export default class extends Controller {
  static targets = ["pill"]
  static classes = ["active"]
  static values = {
    param: String,
    frame: String,
    min: { type: Number, default: 2 },
  }

  toggle(event) {
    const pill = event.currentTarget
    const wasActive = pill.classList.contains(this.activeClass)
    if (wasActive && this.selectedValues().length <= this.minValue) return

    pill.classList.toggle(this.activeClass)
    pill.setAttribute("aria-pressed", String(!wasActive))

    dispatchAnalytics("filter_change", {
      filter_name: this.paramValue,
      filter_value: this.selectedValues().join(","),
    })

    this.navigate()
  }

  selectedValues() {
    return this.pillTargets
      .filter((pill) => pill.classList.contains(this.activeClass))
      .map((pill) => pill.dataset.value)
  }

  navigate() {
    const url = new URL(window.location.href)
    url.searchParams.set(this.paramValue, this.selectedValues().join(","))
    url.searchParams.delete("page")

    const turbo = window.Turbo
    if (!turbo) {
      window.location.assign(url.toString())
      return
    }

    if (this.frameValue) {
      turbo.visit(url.toString(), { frame: this.frameValue })
    } else {
      turbo.visit(url.toString())
    }
  }
}
