import { Controller } from "@hotwired/stimulus";
import { dispatchAnalytics } from "dispatch_analytics";

// PlayerComparison+'s "trending player" chips render as buttons rather than
// real <a href> anchors when they'd otherwise carry a compound ?compare=
// state (existing picks + this chip's id) -- crawlers only follow <a href>,
// so keeping the target URL on a button's data attribute instead keeps every
// reachable ?compare= combination out of static, crawlable HTML (mirrors
// sort_link_controller.js's own reasoning for DataTable's sort headers).
// Clicking still performs the same full-page Turbo Drive visit a
// data-turbo-frame="_top" link would have, just driven by JS.
export default class extends Controller {
  static values = { url: String, player: String };

  visit() {
    dispatchAnalytics("comparison_add_player", { player: this.playerValue });
    Turbo.visit(this.urlValue);
  }
}
