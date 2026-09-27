import { Controller } from "@hotwired/stimulus"

// Toggles a set of "overflow" rows that are present in the DOM but hidden
// until the visitor opts in — the "Show all N / Show fewer" affordance in the
// stat accordion's Base Stats tier. No server round-trip; the rows ship with
// the page and are revealed client-side.
export default class extends Controller {
  static targets = ["overflow", "label"]
  static classes = ["hidden"]
  static values = { collapsedLabel: String, expandedLabel: String }

  toggle() {
    const willExpand = this.#collapsed

    for (const overflow of this.overflowTargets) {
      overflow.classList.toggle(this.hiddenClass, !willExpand)
    }

    if (this.hasLabelTarget) {
      this.labelTarget.textContent = willExpand
        ? this.expandedLabelValue
        : this.collapsedLabelValue
      this.labelTarget.setAttribute("aria-expanded", willExpand ? "true" : "false")
    }
  }

  get #collapsed() {
    return this.overflowTargets.some((overflow) =>
      overflow.classList.contains(this.hiddenClass),
    )
  }
}
