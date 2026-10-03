import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["verifySection"]
  static classes = ["hidden"]

  reveal() {
    if (this.hasVerifySectionTarget) {
      this.verifySectionTarget.classList.remove(this.hiddenClass)
    }
  }
}
