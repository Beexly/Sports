import { Controller } from "@hotwired/stimulus"

// Highlights the progress-rail dot for the card currently pinned in the
// homepage's scroll stack. The pinning itself is pure CSS (position:sticky,
// see .hl-stack) -- this only reads scroll position. The "current" card is
// the last one whose top has reached the pin line just below the navbar:
// pinned cards all sit exactly on that line, and cards still approaching it
// sit below, so findLast picks the card the visitor actually sees on top.
//
// Rail clicks scroll to the card's STATIC position rather than following the
// anchor: a native anchor jump to an already-stuck card targets its sticky-
// displaced rect and overshoots into the next card's territory.
export default class extends Controller {
  static targets = ["card", "dot"]
  static classes = ["active"]

  connect() {
    this.onScroll = () => this.#queue()
    addEventListener("scroll", this.onScroll, { passive: true })
    addEventListener("resize", this.onScroll, { passive: true })
    this.#highlight()
  }

  disconnect() {
    removeEventListener("scroll", this.onScroll)
    removeEventListener("resize", this.onScroll)
  }

  jump(event) {
    const index = this.dotTargets.indexOf(event.currentTarget)
    const card = this.cardTargets[index]
    if (!card) return

    event.preventDefault()
    // The card's static offset is the sum of the in-flow siblings before it
    // (earlier cards AND the archive band that sits between two of them) --
    // its own rect can't be used, since a stuck card reports its displaced
    // position.
    const stackTop = this.element.getBoundingClientRect().top + window.scrollY
    let offset = 0
    for (const child of this.element.children) {
      if (child === card) break
      if (getComputedStyle(child).position !== "absolute") offset += child.offsetHeight
    }
    const navbarHeight = this.#pinLine() - 8
    const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    window.scrollTo({ top: stackTop + offset - navbarHeight, behavior })
  }

  #queue() {
    if (this.ticking) return

    this.ticking = true
    requestAnimationFrame(() => {
      this.ticking = false
      this.#highlight()
    })
  }

  #highlight() {
    const line = this.#pinLine()
    const index = this.cardTargets.findLastIndex((card) => card.getBoundingClientRect().top <= line)
    const current = Math.max(index, 0)
    this.dotTargets.forEach((dot, i) => dot.classList.toggle(this.activeClass, i === current))
  }

  #pinLine() {
    const navbarHeight = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--navbar-height"),
    )
    return (Number.isNaN(navbarHeight) ? 76 : navbarHeight) + 8
  }
}
