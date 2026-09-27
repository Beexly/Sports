import { Controller } from "@hotwired/stimulus"
import { restoreValueAfterMorph } from "restore_value_after_morph"

// Odds/%/Cents display toggle for the live odds board. Stimulus only ever
// manages one thing here: the format value reflected as
// data-odds-format-format-value on this controller's root element.
// live_odds.scss reads that attribute to show exactly one of BoardTable's
// three pre-rendered price formats per cell -- no DOM manipulation of the
// board itself, so a Turbo morph refreshing the board's prices never fights
// with the toggle's state.
//
// The one thing that DOES fight it: the server renders this value attribute
// as its default (cents on both boards -- it has no memory of a visitor's
// client-only choice), so a broadcast refresh's morph resets it and the
// buttons' aria-pressed with it -- see restore_value_after_morph.js for why
// this needs both the value put back AND formatValueChanged re-run.
export default class extends Controller {
  static values = { format: { type: String, default: "american" } }
  static targets = ["button"]

  connect() {
    this.stopRestoring = restoreValueAfterMorph(
      this.element,
      () => this.formatValue,
      (value) => { this.formatValue = value },
      () => this.formatValueChanged(),
    )
  }

  disconnect() {
    this.stopRestoring?.()
  }

  select(event) {
    this.formatValue = event.params.format
  }

  formatValueChanged() {
    this.buttonTargets.forEach((button) => {
      const pressed = button.dataset.oddsFormatFormatParam === this.formatValue
      button.setAttribute("aria-pressed", pressed ? "true" : "false")
    })
  }
}
