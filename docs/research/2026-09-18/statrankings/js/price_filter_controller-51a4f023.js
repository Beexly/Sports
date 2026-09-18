import { Controller } from "@hotwired/stimulus"
import { restoreValueAfterMorph } from "restore_value_after_morph"

// Favorites/Underdogs/All filter for the live odds board. Same pattern as
// odds_format_controller: the only state is a value Stimulus reflects as a
// data attribute on this controller's root element; live_odds.scss reads it
// to show or hide rows by their data-price-sign. No DOM manipulation of the
// board itself, so a Turbo morph refreshing prices never fights this.
//
// The value attribute itself does need restoring after a broadcast morph,
// though -- same reason and fix as odds_format_controller.js, see
// restore_value_after_morph.js.
export default class extends Controller {
  static values = { sign: { type: String, default: "all" } }
  static targets = ["button"]

  connect() {
    this.stopRestoring = restoreValueAfterMorph(
      this.element,
      () => this.signValue,
      (value) => { this.signValue = value },
      () => this.signValueChanged(),
    )
  }

  disconnect() {
    this.stopRestoring?.()
  }

  select(event) {
    this.signValue = event.params.sign
  }

  signValueChanged() {
    this.buttonTargets.forEach((button) => {
      const pressed = button.dataset.priceFilterSignParam === this.signValue
      button.setAttribute("aria-pressed", pressed ? "true" : "false")
    })
  }
}
