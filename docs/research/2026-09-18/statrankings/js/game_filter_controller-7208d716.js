import { Controller } from "@hotwired/stimulus"

// Admin game selector on the weekly projections board. Checkbox changes
// submit the form into the table's turbo frame; "All" and "Clear" set every
// box at once before submitting. The "n of N" count lives outside the turbo
// frame, so it is kept current here rather than by a server re-render.
export default class extends Controller {
  static targets = ["form", "checkbox", "count"]

  connect() {
    this.updateCount()
  }

  change() {
    this.updateCount()
    this.formTarget.requestSubmit()
  }

  all() {
    this.setAll(true)
  }

  clear() {
    this.setAll(false)
  }

  setAll(checked) {
    this.checkboxTargets.forEach((box) => { box.checked = checked })
    this.updateCount()
    this.formTarget.requestSubmit()
  }

  updateCount() {
    const checked = this.checkboxTargets.filter((box) => box.checked).length
    this.countTarget.textContent = `${checked} of ${this.checkboxTargets.length}`
  }
}
