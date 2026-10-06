import { Controller } from "@hotwired/stimulus"
import { impliedProbability } from "implied_probability"

// Flashes a soft background on every sportsbook/prediction-market price cell
// when the live-odds board's Postgres-triggered broadcast changes its value:
// green if the price improved for the bettor, red if it worsened, no flash
// for a move under CHANGE_THRESHOLD (noise, not a signal worth calling out).
//
// Must hook turbo:before-morph-element / turbo:morph-element, not
// turbo:render: idiomorph overwrites each price cell's own data-price
// attribute in place as it walks the tree, so by the time turbo:render fires
// (once, after the whole page has already morphed) every cell's "before"
// value is already gone. before-morph-element fires once per element right
// before that element's own mutation -- the one synchronous window where
// both the old (event.target.dataset.price) and soon-to-be-new value exist
// -- so the old value is stashed per-element and read back in
// morph-element, which fires immediately after for that same element, once
// idiomorph has applied the new value.
const CHANGE_THRESHOLD = 0.05 // relative move in implied probability

export default class extends Controller {
  static classes = ["better", "worse"]
  static values = { holdMs: { type: Number, default: 1400 } }

  connect() {
    this._previous = new WeakMap()
    this._onBeforeMorph = (event) => this.captureBefore(event)
    this._onMorph = (event) => this.compareAfter(event)
    document.addEventListener("turbo:before-morph-element", this._onBeforeMorph)
    document.addEventListener("turbo:morph-element", this._onMorph)
  }

  disconnect() {
    document.removeEventListener("turbo:before-morph-element", this._onBeforeMorph)
    document.removeEventListener("turbo:morph-element", this._onMorph)
  }

  captureBefore(event) {
    const el = event.target
    if (!isPriceCell(el)) return

    this._previous.set(el, el.dataset.price)
  }

  compareAfter(event) {
    const el = event.target
    if (!isPriceCell(el)) return

    const before = this._previous.get(el)
    this._previous.delete(el)
    if (before === undefined) return

    const beforePrice = parsePrice(before)
    const afterPrice = parsePrice(el.dataset.price)
    if (beforePrice === null || afterPrice === null || beforePrice === afterPrice) return

    const beforeProbability = impliedProbability(beforePrice)
    const afterProbability = impliedProbability(afterPrice)
    const relativeChange = Math.abs(afterProbability - beforeProbability) / beforeProbability
    if (relativeChange < CHANGE_THRESHOLD) return

    // Higher American odds are always the better price for the bettor,
    // across the whole range (-140 beats -150, +105 beats -105, etc.) --
    // no sign-case-by-case logic needed.
    const flashClass = afterPrice > beforePrice ? this.betterClass : this.worseClass
    el.classList.remove(this.betterClass, this.worseClass)
    // Force a reflow so re-adding the same class restarts its CSS animation
    // if this cell already flashed once and is flashing again.
    void el.offsetWidth
    el.classList.add(flashClass)
    setTimeout(() => el.classList.remove(flashClass), this.holdMsValue)
  }
}

function isPriceCell(el) {
  return el instanceof Element && el.matches('[data-book-filter-target="price"]')
}

function parsePrice(raw) {
  if (raw === undefined || raw === "") return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}
