import { Controller } from "@hotwired/stimulus";

// DataTable sort headers render as buttons rather than real <a href> anchors
// so `?sort_field=`/`?sort_order=` variants are never discoverable via static
// HTML (see RDM-02 — crawlers found 32,852 of these). Clicking still performs
// the same Turbo Frame navigation a link would have, just driven by JS.
export default class extends Controller {
  static values = {
    url: String,
    frame: String,
  };

  visit() {
    Turbo.visit(this.urlValue, { frame: this.frameValue });
  }
}
