import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static values = { signupUrl: String };

  redirect(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const modal = document.getElementById("paywall-modal");
    if (modal) {
      modal.showModal();
    } else {
      Turbo.visit(this.signupUrlValue);
    }
  }
}
