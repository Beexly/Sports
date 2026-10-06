import { Controller } from "@hotwired/stimulus"
import { dispatchAnalytics } from "dispatch_analytics"

export default class extends Controller {
  static classes = ["dark"]

  connect() {
    const saved = localStorage.getItem("theme")
    // Default to dark if no preference saved. The inline <head> script already
    // applied the correct class before first paint; this keeps it correct on
    // Turbo navigations where the inline script does not re-run.
    if (saved === "light") {
      document.documentElement.classList.remove(this.darkClass)
    } else {
      document.documentElement.classList.add(this.darkClass)
    }
  }

  toggle() {
    const html = document.documentElement
    html.classList.toggle(this.darkClass)
    const theme = html.classList.contains(this.darkClass) ? "dark" : "light"
    localStorage.setItem("theme", theme)
    dispatchAnalytics("theme_toggle", { theme })
  }
}
