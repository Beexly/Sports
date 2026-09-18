import { Controller } from "@hotwired/stimulus"
import { dispatchAnalytics } from "dispatch_analytics"

export default class extends Controller {
  static values = { param: String, turboFrame: String }

  toggle() {
    const checked = this.element.querySelector("input[type=checkbox]").checked

    dispatchAnalytics("filter_change", {
      filter_name: this.paramValue,
      filter_value: String(checked),
    })

    const url = new URL(window.location.href)
    const turbo = window.Turbo

    if (checked) {
      url.searchParams.set(this.paramValue, "true")
    } else {
      url.searchParams.delete(this.paramValue)
    }

    if (!turbo) {
      window.location.assign(url.toString())
      return
    }

    if (this.turboFrameValue) {
      turbo.visit(url.toString(), { frame: this.turboFrameValue })
      return
    }

    turbo.visit(url.toString())
  }
}
