import { Controller } from "@hotwired/stimulus";
import { dispatchAnalytics } from "dispatch_analytics";

// Navigation for every shape of the sibling-tool switcher (segmented pills,
// single-button, and the mobile <select> fallback -- see
// Components::Stats::ToolSwitcher) for StatBuilder+/PlayerComparison+/
// MatchupIQ+.
//
// Every href/option value is rendered once, server-side, from whatever
// ?stats=/?weeks= the current *full page load* had -- but toggling a stat or
// week only replaces the turbo_frame_tag each tool's own controls live
// inside. That in-frame "advance" navigation still updates window.location
// (Turbo pushes history for frame navigations too), but nothing outside the
// frame re-renders -- this switcher, sitting in the page header, included.
// So a switcher link's baked-in ?stats=/?weeks= silently goes stale the
// moment the user changes either after the initial load.
//
// Rewriting them here, at the moment of navigation, is the only point
// guaranteed correct: window.location itself is always current regardless
// of how it got there, and connect() only fires once (this element is
// outside the frame, so it never reconnects when the frame updates).
const CARRY_PARAMS = ["stats", "weeks"];

export default class extends Controller {
  visitLink(event) {
    event.preventDefault();
    const href = event.currentTarget.href;
    dispatchAnalytics("tool_switch", { tool: this.#toolName(href) });
    Turbo.visit(this.#withCurrentParams(href));
  }

  // The current tool's <option> carries an empty value, so re-selecting it
  // (or a stray change event) is a no-op rather than navigating to the root
  // URL.
  visitSelect(event) {
    const url = event.target.value;
    if (!url) return;

    dispatchAnalytics("tool_switch", { tool: this.#toolName(url) });
    Turbo.visit(this.#withCurrentParams(url));
  }

  // The destination tool's identifier is the last path segment of its route
  // (e.g. "/nfl/advanced/matchup-iq" -> "matchup-iq") -- a stable, readable
  // param without threading the display name through a data attribute.
  #toolName(href) {
    const segments = new URL(href, window.location.origin).pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] || "";
  }

  #withCurrentParams(href) {
    const url = new URL(href, window.location.origin);
    const current = new URLSearchParams(window.location.search);
    CARRY_PARAMS.forEach(param => {
      if (current.has(param)) url.searchParams.set(param, current.get(param));
    });
    return url.toString();
  }
}
