import { Controller } from "@hotwired/stimulus"
import { dispatchAnalytics } from "dispatch_analytics"

export default class extends Controller {
  static targets = ["overlay"]
  static classes = ["hidden", "overflowHidden"]

  toggle() {
    this.overlayTarget.classList.toggle(this.hiddenClass)
    document.body.classList.toggle(this.overflowHiddenClass)

    const opened = !this.overlayTarget.classList.contains(this.hiddenClass)
    // A page can carry horizontal scroll from a wide marketing surface (the
    // homepage ticker/marquee rows); on iOS Safari that scroll offset can
    // visually drag position: fixed elements sideways with it. Zeroing it on
    // open keeps the overlay pinned to the left edge regardless of where the
    // page was scrolled when the menu was triggered.
    if (opened) window.scrollTo({ left: 0 })

    dispatchAnalytics("mobile_menu_toggle", { action: opened ? "open" : "close" })
  }

  close() {
    this.overlayTarget.classList.add(this.hiddenClass)
    document.body.classList.remove(this.overflowHiddenClass)
  }

  connect() {
    this._beforeCache = this.close.bind(this)
    document.addEventListener("turbo:before-cache", this._beforeCache)
  }

  disconnect() {
    document.removeEventListener("turbo:before-cache", this._beforeCache)
  }
}
