import { Controller } from "@hotwired/stimulus"
import { dispatchAnalytics } from "dispatch_analytics"

export default class extends Controller {
  static targets = ["content", "icon", "trigger"]
  static classes = ["hidden", "rotate"]
  static values = { independent: Boolean }

  toggle() {
    const isHidden = this.contentTarget.classList.contains(this.hiddenClass)

    if (isHidden) {
      if (!this.independentValue) this.#closeSiblings()
      this.#open()
    } else {
      this.#close()
    }

    const label = this.hasTriggerTarget
      ? this.triggerTarget.textContent.trim()
      : ""
    dispatchAnalytics("accordion_toggle", {
      action: isHidden ? "open" : "close",
      label,
    })
  }

  close() {
    this.#close()
  }

  #open() {
    this.contentTarget.classList.remove(this.hiddenClass)
    this.iconTarget.classList.add(this.rotateClass)
    if (this.hasTriggerTarget) {
      this.triggerTarget.setAttribute("aria-expanded", "true")
    }
  }

  #close() {
    this.contentTarget.classList.add(this.hiddenClass)
    this.iconTarget.classList.remove(this.rotateClass)
    if (this.hasTriggerTarget) {
      this.triggerTarget.setAttribute("aria-expanded", "false")
    }
  }

  #closeSiblings() {
    const parent = this.element.parentElement
    if (!parent) return

    for (const sibling of parent.querySelectorAll(":scope > [data-controller~='accordion']")) {
      if (sibling === this.element) continue

      const controller = this.application.getControllerForElementAndIdentifier(sibling, "accordion")
      if (controller) controller.close()
    }
  }
}
