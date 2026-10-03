import { Controller } from "@hotwired/stimulus"

// Keeps a sticky element nested beneath the site chrome that is actually on
// screen, and publishes the total vertical clearance it occupies — chrome
// offset plus its own rendered height — as a CSS custom property on its
// parent, so sibling anchor targets can size scroll-margin-top to land just
// below it.
//
// Everything is measured live because none of it is static: the chrome
// selector may match a fixed navbar, a banner that is fixed on desktop but
// scrolls away on mobile, or nothing at all once the banner is retired; and
// the element's own height changes with its collapse state and viewport
// width. Without a chrome selector the element's CSS `top` is left alone and
// only the clearance property is published.
export default class extends Controller {
  static values = { property: String, chrome: String }

  connect() {
    this.observer = new ResizeObserver(() => this.update())
    this.observer.observe(this.element)
    this.onScroll = () => this.#queueUpdate()
    addEventListener("scroll", this.onScroll, { passive: true })
    addEventListener("resize", this.onScroll, { passive: true })
    this.update()
  }

  disconnect() {
    this.observer.disconnect()
    removeEventListener("scroll", this.onScroll)
    removeEventListener("resize", this.onScroll)
  }

  // The element's own `top` nests under everything currently visible, but
  // the published clearance counts only fixed chrome: sticky chrome (the
  // mobile navbar) scrolls away with the page, so it is gone by the time an
  // anchor jump lands — sizing scroll margins against it would leave a gap
  // and misplace the current-section line.
  update() {
    const visible = this.#chromeClearance(false)
    const pinned = this.#chromeClearance(true)
    const applied = `${visible}:${pinned}:${this.element.offsetHeight}`
    if (applied === this.lastApplied) return

    this.lastApplied = applied
    if (this.hasChromeValue) this.element.style.top = `${visible}px`
    this.element.parentElement.style.setProperty(
      this.propertyValue,
      `${pinned + this.element.offsetHeight}px`,
    )
  }

  #queueUpdate() {
    if (this.ticking) return

    this.ticking = true
    requestAnimationFrame(() => {
      this.ticking = false
      this.update()
    })
  }

  // The bottom edge of the lowest qualifying chrome element — the line the
  // sticky element must sit below.
  #chromeClearance(pinnedOnly) {
    if (!this.hasChromeValue) return parseFloat(getComputedStyle(this.element).top) || 0

    let clearance = 0
    for (const chrome of document.querySelectorAll(this.chromeValue)) {
      const { position } = getComputedStyle(chrome)
      if (position !== "fixed" && (pinnedOnly || position !== "sticky")) continue

      clearance = Math.max(clearance, chrome.getBoundingClientRect().bottom)
    }
    return clearance
  }
}
