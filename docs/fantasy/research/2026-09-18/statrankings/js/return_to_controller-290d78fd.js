import { Controller } from "@hotwired/stimulus";

// Preserves "return to where I was" behavior for login/signup CTAs without
// ever rendering a destination-specific `?return_to=` query param in a
// static, crawlable <a href> (see RDM-01/03 — that param alone accounted for
// tens of thousands of junk URLs discovered by crawlers).
//
// Capture side: a login/signup link uses a plain href (e.g. "/login") and
// calls #capture on click, stashing the current location in sessionStorage.
//
// Restore side: the destination page's form wraps this same controller and
// tags its hidden "return_to" field as the `field` target. On connect, if the
// field is still blank (no server-echoed value from a failed-submission
// retry), it's filled in from sessionStorage so the normal POST body -> Rails
// session[:return_to] flow (ApplicationController#store_return_location)
// works exactly as it did when the value arrived via query string.
export const STORAGE_KEY = "sr-return-to";

export default class extends Controller {
  static targets = ["field"];

  connect() {
    if (!this.hasFieldTarget || this.fieldTarget.value) return;

    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) this.fieldTarget.value = stored;
  }

  capture() {
    sessionStorage.setItem(STORAGE_KEY, window.location.pathname + window.location.search);
  }
}
