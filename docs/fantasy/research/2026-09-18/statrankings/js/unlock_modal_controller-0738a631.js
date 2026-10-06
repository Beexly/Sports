import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static values = { openOnConnect: Boolean };

  connect() {
    if (this.element.tagName === "DIALOG") {
      this.element.addEventListener("click", this.#backdropClose);
      // A dialog holding a form that came back rejected (a bad promo code on
      // the archive add-on card) has to reopen itself: the server replies with
      // a fresh page, and the error inside a closed dialog is invisible.
      if (this.openOnConnectValue) this.element.showModal();
    }
  }

  disconnect() {
    if (this.element.tagName === "DIALOG") {
      this.element.removeEventListener("click", this.#backdropClose);
    }
  }

  open(event) {
    this.#closeOpen();
    document.getElementById(event.params.id)?.showModal();
  }

  // Close before navigating away (e.g. the CTA link to checkout) so the
  // dialog isn't left in its "open" state for the bfcache to restore when
  // the user hits Back — otherwise the dialog reappears without its backdrop.
  close() {
    if (this.element.tagName === "DIALOG") this.element.close();
  }

  #closeOpen() {
    document
      .querySelectorAll("dialog.unlock-modal[open]")
      .forEach((dialog) => dialog.close());
  }

  #backdropClose = (event) => {
    if (event.target === this.element) this.element.close();
  };
}
