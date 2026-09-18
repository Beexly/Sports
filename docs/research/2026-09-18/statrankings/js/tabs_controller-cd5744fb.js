import { Controller } from "@hotwired/stimulus"
import { dispatchAnalytics } from "dispatch_analytics"

export default class extends Controller {
  static targets = ["tab", "panel"]
  static classes = ["active", "hidden"]

  connect() {
    const hash = window.location.hash.replace("#", "")
    const urlTab = new URLSearchParams(window.location.search).get("tab")
    const initial = hash || urlTab || this.tabTargets[0]?.dataset.tab
    if (initial) this.show(initial)
  }

  select(event) {
    event.preventDefault()
    const tab = event.currentTarget.dataset.tab
    dispatchAnalytics("tab_select", { tab_name: tab })
    this.show(tab)
    window.history.replaceState(null, "", `#${tab}`)
  }

  show(name) {
    for (const tab of this.tabTargets) {
      tab.classList.toggle(this.activeClass, tab.dataset.tab === name)
    }
    for (const panel of this.panelTargets) {
      panel.classList.toggle(this.hiddenClass, panel.dataset.tab !== name)
    }
  }
}
