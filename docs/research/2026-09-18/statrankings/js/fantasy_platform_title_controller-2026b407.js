import { Controller } from "@hotwired/stimulus"

// Keeps a page heading and the document title in sync with a
// position-pill-strip toggle that lives outside the turbo frame the pill
// navigates -- originally the Fantasy Rankings Hub's platform name
// ("Fantasy Rankings | Underdog"), also reused by the Fantasy Rankings
// Show page's Half PPR / Full PPR heading. paramValue picks which
// position-pill-strip param this instance cares about, so more than one
// of these can coexist on a page listening for different toggles.
//
// The pill strip navigates the page's turbo frame, but the heading sits in
// the page header above that frame, so the frame response never repaints
// it. The <title> gets no help from Turbo either: the deferred stylesheets in
// the layout are swapped from media="print" to media="all" after load, which
// leaves the live <head> different from every response's <head>, so Turbo
// treats its tracked elements as changed and skips the head merge it would
// otherwise do on an advance frame visit.
//
// Retitling from the clicked pill rather than from the frame response also
// means the heading changes on click, in step with the pill's own active
// state, instead of a request later.
export default class extends Controller {
  static targets = ["label", "logo"]
  static values  = { template: String, param: { type: String, default: "platform" } }

  update({ detail: { param, pill } }) {
    if (param !== this.paramValue || !this.hasLabelTarget) return

    const label = pill.dataset.label ?? ""

    this.labelTarget.textContent = label
    this.#updateLogo(pill)
    this.#updateDocumentTitle(label)
    this.#refitHeading()
  }

  #updateLogo(pill) {
    if (!this.hasLogoTarget) return

    const logo = pill.querySelector("img")
    this.logoTarget.src = logo ? logo.src : ""
    this.logoTarget.hidden = !logo
  }

  // Placeholder the server leaves in templateValue, named after whichever
  // param this instance listens for -- "{platform}" or "{scoring}".
  #updateDocumentTitle(label) {
    if (!this.hasTemplateValue) return

    document.title = this.templateValue.replace(`{${this.paramValue}}`, label)
  }

  // The heading shrinks its font-size to fit on one line (fit-text), measured
  // against the text it had when it connected. Platform names differ enough in
  // width ("NFL Fantasy" vs "CBS") that a swap needs a remeasure.
  #refitHeading() {
    const heading = this.element.closest("[data-controller~='fit-text']")
    if (!heading) return

    this.application
      .getControllerForElementAndIdentifier(heading, "fit-text")
      ?.fit()
  }
}
