import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { expandOnDesktop: Boolean }

  connect() {
    if (this.expandOnDesktopValue && window.innerWidth >= 768) {
      this.element.classList.add("is-expanded")
      const btn = this.element.querySelector(".ci-accordion__toggle")
      if (btn) btn.setAttribute("aria-expanded", "true")
    }
  }

  toggle(event) {
    const toggleBtn = this.element.querySelector(".ci-accordion__toggle")
    if (event && toggleBtn && !toggleBtn.contains(event.target) && event.target.closest("button, a, input, select")) return
    this.element.classList.toggle("is-expanded")
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", this.element.classList.contains("is-expanded"))
  }
}
