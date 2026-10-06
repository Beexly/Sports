import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static values = { dialogId: String };

  connect() {
    if (this.element.tagName === "DIALOG") {
      this.element.addEventListener("click", this.#backdropClose);
    }
  }

  disconnect() {
    this.element.removeEventListener("click", this.#backdropClose);
  }

  open() {
    document.getElementById(this.dialogIdValue)?.showModal();
  }

  #backdropClose = (e) => {
    if (e.target === this.element) this.element.close();
  };
}
