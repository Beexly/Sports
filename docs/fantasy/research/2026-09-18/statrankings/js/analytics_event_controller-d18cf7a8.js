import { Controller } from "@hotwired/stimulus"
import { dispatchAnalytics } from "dispatch_analytics"

export default class extends Controller {
  static values = {
    name: String,
    params: { type: Object, default: {} },
    autoTrack: { type: Boolean, default: false },
  }

  connect() {
    if (this.autoTrackValue && this.hasNameValue) {
      dispatchAnalytics(this.nameValue, this.paramsValue)
    }
  }

  track() {
    if (this.hasNameValue) {
      dispatchAnalytics(this.nameValue, this.paramsValue)
    }
  }
}
