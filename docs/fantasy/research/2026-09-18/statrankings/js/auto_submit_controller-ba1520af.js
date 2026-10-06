import { Controller } from "@hotwired/stimulus"

// Submits the nearest form as soon as this element changes -- e.g. a filter
// <select> that should re-query immediately rather than waiting for a
// separate submit button. The button stays in the DOM as a no-JS fallback.
export default class extends Controller {
  submit() {
    this.element.form?.requestSubmit()
  }
}
