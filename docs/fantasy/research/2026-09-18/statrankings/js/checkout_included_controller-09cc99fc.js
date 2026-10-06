import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["section", "toggle", "card"];
  static classes = ["collapsed", "infoOpen"];

  connect() {
    document.addEventListener("click", this.#outsideClick);
  }

  disconnect() {
    document.removeEventListener("click", this.#outsideClick);
  }

  toggle() {
    const section = this.sectionTarget || this.element;
    const isCollapsed = section.classList.contains(this.collapsedClass);

    if (isCollapsed) {
      section.classList.remove(this.collapsedClass);
      this.toggleTarget.setAttribute("aria-expanded", "true");
    } else {
      section.classList.add(this.collapsedClass);
      this.toggleTarget.setAttribute("aria-expanded", "false");
    }
  }

  toggleInfo(event) {
    const card = event.currentTarget.closest('[data-checkout-included-target="card"]');
    if (!card) return;

    const wasOpen = card.classList.contains(this.infoOpenClass);

    this.cardTargets.forEach((c) => c.classList.remove(this.infoOpenClass));

    if (!wasOpen) {
      card.classList.add(this.infoOpenClass);
    }
  }

  #outsideClick = (event) => {
    if (this.element.contains(event.target)) return;

    this.cardTargets.forEach((c) => c.classList.remove(this.infoOpenClass));
  };
}
