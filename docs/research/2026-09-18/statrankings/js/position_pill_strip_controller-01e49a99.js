import { Controller } from "@hotwired/stimulus"
import { dispatchAnalytics } from "dispatch_analytics"

export default class extends Controller {
  static targets = ["pill"]
  // `default` names the value this param carries when the URL says nothing at
  // all -- so selecting it has to remove the param rather than write it. A page
  // whose bare URL already loads that value would otherwise gain a second
  // address for the state it is already showing, and the server would redirect
  // straight back off it. Optional: a strip that configures no default keeps
  // the previous behaviour of always writing the value it was given.
  static values  = { param: String, frame: String, default: String }

  select(event) {
    event.preventDefault()

    const pill  = event.currentTarget
    const value = pill.dataset.value

    dispatchAnalytics("filter_change", {
      filter_name: this.paramValue,
      filter_value: value,
    })

    this.pillTargets.forEach(p => {
      p.classList.remove("active")
      if (p.hasAttribute("aria-pressed")) p.setAttribute("aria-pressed", "false")
    })
    pill.classList.add("active")
    if (pill.hasAttribute("aria-pressed")) pill.setAttribute("aria-pressed", "true")

    // Lets anything outside the navigated frame react to the new selection --
    // the pill itself rides along so listeners can read its data attributes
    // (e.g. the Fantasy Rankings heading, which shows the selected platform but
    // lives outside the frame the visit below replaces).
    this.dispatch("select", { detail: { param: this.paramValue, value, pill } })

    // A pill carrying a path names a page rather than a filter state: Fantasy
    // Rankings puts position and scoring in the address, so the click is a
    // visit and not a param merge. Still a button rather than a link, because
    // some of those addresses are toggle states no crawler should be handed.
    if (pill.dataset.path) {
      this.#visit(pill.dataset.path)
      return
    }

    const url = new URL(window.location.href)

    // "all"/""/null are the absence of a selection, and a configured default is
    // the selection the bare URL already makes -- both are spelled by leaving
    // the param off entirely.
    if (value === "all" || value === "" || value == null || value === this.defaultValue) {
      url.searchParams.delete(this.paramValue)
    } else {
      url.searchParams.set(this.paramValue, value)
    }

    // Reset to page 1 when filtering
    url.searchParams.delete("page")

    this.#visit(url.toString())
  }

  #visit(target) {
    const turbo = window.Turbo
    if (!turbo) {
      window.location.assign(target)
      return
    }

    if (this.frameValue) {
      turbo.visit(target, { frame: this.frameValue })
    } else {
      turbo.visit(target)
    }
  }
}
