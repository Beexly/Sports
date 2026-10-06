import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["menu", "panel"]
  static classes = ["hidden"]

  toggle(event) {
    const menu = event.target.closest("[data-dropdown-target='menu']")
    const panel = menu.querySelector("[data-dropdown-target='panel']")
    const btn = menu.querySelector("button[data-action*='dropdown#toggle']")

    this.panelTargets.forEach(p => {
      if (p !== panel) {
        p.classList.add(this.hiddenClass)
        const otherBtn = p.closest("[data-dropdown-target='menu']")
          ?.querySelector("button[data-action*='dropdown#toggle']")
        otherBtn?.setAttribute("aria-expanded", "false")
      }
    })

    const isNowHidden = panel.classList.toggle(this.hiddenClass)
    btn?.setAttribute("aria-expanded", String(!isNowHidden))
  }

  closeAll(event) {
    if (!this.element.contains(event.target)) {
      this.panelTargets.forEach(p => {
        p.classList.add(this.hiddenClass)
        const btn = p.closest("[data-dropdown-target='menu']")
          ?.querySelector("button[data-action*='dropdown#toggle']")
        btn?.setAttribute("aria-expanded", "false")
      })
    }
  }

  closeOnBeforeCache() {
    this.panelTargets.forEach(p => {
      p.classList.add(this.hiddenClass)
      const btn = p.closest("[data-dropdown-target='menu']")
        ?.querySelector("button[data-action*='dropdown#toggle']")
      btn?.setAttribute("aria-expanded", "false")
    })
  }

  connect() {
    this._outsideClick = this.closeAll.bind(this)
    this._beforeCache = this.closeOnBeforeCache.bind(this)
    document.addEventListener("click", this._outsideClick)
    document.addEventListener("turbo:before-cache", this._beforeCache)
  }

  disconnect() {
    document.removeEventListener("click", this._outsideClick)
    document.removeEventListener("turbo:before-cache", this._beforeCache)
  }
}
