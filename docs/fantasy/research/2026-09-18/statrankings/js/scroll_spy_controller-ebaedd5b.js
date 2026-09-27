import { Controller } from "@hotwired/stimulus"

// Keeps the URL hash in sync with the child section currently in view, so a
// copied or reloaded URL restores the reader's place. The "current" section is
// the one whose top has crossed the line just below the sticky navigator
// (read from the --dc-hub-nav-clearance property the sticky-clearance
// controller publishes) — the same line anchor jumps land on, so the hash
// never flips to the previous section right after a jump. On connect it
// re-scrolls to the hash target: the browser's native anchor scroll runs
// before the clearance is measured, so the landing would otherwise sit under
// the expanded panel.
export default class extends Controller {
  connect() {
    this.sections = Array.from(this.element.querySelectorAll(":scope > [id]"))
    this.onScroll = () => this.#queueSpy()
    addEventListener("scroll", this.onScroll, { passive: true })
    this.#restoreAnchor()
  }

  disconnect() {
    removeEventListener("scroll", this.onScroll)
  }

  #queueSpy() {
    if (this.ticking) return

    this.ticking = true
    requestAnimationFrame(() => {
      this.ticking = false
      this.#spy()
    })
  }

  #restoreAnchor() {
    const slug = decodeURIComponent(window.location.hash.slice(1))
    const target = slug && this.sections.find((section) => section.id === slug)
    if (!target) return

    requestAnimationFrame(() => target.scrollIntoView())
  }

  #spy() {
    const clearance = parseFloat(getComputedStyle(this.element).getPropertyValue("--dc-hub-nav-clearance")) || 0
    const line = clearance + 13
    const current = this.sections.findLast((section) => section.getBoundingClientRect().top <= line)
    const hash = current ? `#${current.id}` : ""
    if (window.location.hash === hash) return

    history.replaceState(history.state, "", `${window.location.pathname}${window.location.search}${hash}`)
  }
}
