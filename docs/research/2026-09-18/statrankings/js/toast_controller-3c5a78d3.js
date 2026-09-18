import { Controller } from "@hotwired/stimulus"

// Auto-dismisses a UI::Toast banner after dismissAfterValue ms, or
// immediately on manual dismiss. Fades out via CSS transition (skipped for
// prefers-reduced-motion) before removing the element.
export default class extends Controller {
  static values = { dismissAfter: Number }

  connect() {
    this.timeout = setTimeout(() => this.dismiss(), this.dismissAfterValue)
  }

  disconnect() {
    clearTimeout(this.timeout)
  }

  dismiss() {
    clearTimeout(this.timeout)
    this.element.classList.add("toast--dismissing")
    this.element.addEventListener("transitionend", () => this.element.remove(), { once: true })
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) this.element.remove()
  }
}
