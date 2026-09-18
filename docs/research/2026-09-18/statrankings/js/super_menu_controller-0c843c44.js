import { Controller } from "@hotwired/stimulus"

// Desktop super-menu rail: switches the active tab/panel pair without
// closing the surrounding hamburger overlay (that's mobile-menu#toggle,
// wired on the shared hamburger button). The first tab/panel starts active
// in the server-rendered HTML, so no connect() hack is needed here -- this
// controller only reacts to clicks.
export default class extends Controller {
  static targets = ["tab", "panel"]
  static classes = ["activeTab", "hiddenPanel"]

  select(event) {
    const index = this.tabTargets.indexOf(event.currentTarget)
    if (index === -1) return

    this.#activate(index)
  }

  #activate(index) {
    this.tabTargets.forEach((tab, i) => {
      const active = i === index
      tab.classList.toggle(this.activeTabClass, active)
      tab.setAttribute("aria-selected", String(active))
    })

    this.panelTargets.forEach((panel, i) => {
      panel.classList.toggle(this.hiddenPanelClass, i !== index)
    })
  }
}
