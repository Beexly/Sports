import { Controller } from "@hotwired/stimulus"

// Keeps an absolutely-positioned tooltip within the viewport regardless of
// where its trigger sits. The tooltip's base position is centered on the trigger
// (CSS applies translateX(-50%)); this controller measures the tooltip on
// open and sets the `--tooltip-shift` custom property, which CSS adds to that
// transform so the body slides back on-screen while the arrow stays on the icon.
export default class extends Controller {
  static targets = ["tooltip"]
  static values = { margin: { type: Number, default: 8 } }

  connect() {
    this.reposition = this.reposition.bind(this)
    this.element.addEventListener("pointerenter", this.reposition)
    this.element.addEventListener("focusin", this.reposition)
    this.element.addEventListener("touchstart", this.reposition, { passive: true })
  }

  disconnect() {
    this.element.removeEventListener("pointerenter", this.reposition)
    this.element.removeEventListener("focusin", this.reposition)
    this.element.removeEventListener("touchstart", this.reposition)
  }

  reposition() {
    if (!this.hasTooltipTarget) return

    const tip = this.tooltipTarget
    const margin = this.marginValue
    const rect = this.element.getBoundingClientRect()
    const center = rect.left + rect.width / 2
    const half = tip.offsetWidth / 2
    const viewport = document.documentElement.clientWidth

    // Clamp within the nearest ancestor that actually clips overflow — a
    // .content-container card (overflow: hidden) or a table's overflow-x: auto
    // scroll wrapper — otherwise the viewport. Keep the tooltip centered on
    // the trigger, nudging only as far as needed to clear each edge; the
    // right-edge fit is applied last so it wins when both can't be satisfied.
    const clip = this.clippingAncestor()
    const clipRect = clip ? clip.getBoundingClientRect() : null
    const leftBound = Math.max(margin, clipRect ? clipRect.left + margin : margin)
    const rightBound = clipRect
      ? Math.min(viewport - margin, clipRect.right - margin)
      : viewport - margin

    let shift = 0
    if (center - half < leftBound) {
      shift = leftBound - (center - half)
    }
    if (center + half + shift > rightBound) {
      shift = rightBound - (center + half)
    }

    tip.style.setProperty("--tooltip-shift", `${Math.round(shift)}px`)
  }

  // Nearest ancestor whose horizontal overflow clips (hidden/auto/scroll/clip).
  // Generalizes the old hardcoded .content-container lookup so tooltips inside
  // any scrollable table wrapper shift back into view instead of being cut off.
  clippingAncestor() {
    let el = this.element.parentElement
    while (el && el !== document.body) {
      if (getComputedStyle(el).overflowX !== "visible") return el
      el = el.parentElement
    }
    return null
  }
}
