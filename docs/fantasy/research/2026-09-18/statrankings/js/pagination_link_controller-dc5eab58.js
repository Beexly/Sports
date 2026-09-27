import { Controller } from "@hotwired/stimulus";

// Pagination links render with a plain href carrying only `?page=N` (see
// UI::Pagination#page_url) so a crawler following static HTML never
// discovers a URL combining page with sort_field/sort_order/split/position
// (see RDM-03 — that combinatorial explosion is exactly why Pagination
// stopped forwarding the rest of the query string in the first place). That
// fix broke real users, though: paginating away from a sorted/filtered view
// reset it back to the default. This controller intercepts the click and
// merges the *current* window location's query params with the new page
// number before navigating, so sort/filter state survives pagination
// without ever appearing in the server-rendered href.
//
// A plain click (no modifier keys, primary mouse button) is the only case
// intercepted -- middle-click/ctrl-click/cmd-click to open in a new tab
// still follows the plain href, just without carrying that extra state
// forward. With JS unavailable entirely, the href still works the same way.
export default class extends Controller {
  static values = { frame: String };

  visit(event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

    event.preventDefault();

    const target = new URL(this.element.href, window.location.href);
    const params = new URLSearchParams(window.location.search);
    params.set("page", target.searchParams.get("page"));
    target.search = params.toString();

    Turbo.visit(target.toString(), this.hasFrameValue ? { frame: this.frameValue } : {});
  }
}
