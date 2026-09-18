import { Controller } from "@hotwired/stimulus";

// Toggles StatBuilder+'s "Custom Split" column between its Total (sum) and
// Avg/Game values for every row at once. Both values are already rendered in
// the DOM by Components::StatBuilder::ResultsTable (no network request on
// toggle) — this just flips which span is hidden and which segment button
// looks active.
export default class extends Controller {
  static targets = ["sum", "avg", "sumButton", "avgButton"];
  static classes = ["hidden", "activeButton"];

  showSum() {
    this._setMode(true);
  }

  showAvg() {
    this._setMode(false);
  }

  _setMode(showSum) {
    this.sumTargets.forEach((el) => el.classList.toggle(this.hiddenClass, !showSum));
    this.avgTargets.forEach((el) => el.classList.toggle(this.hiddenClass, showSum));

    // Plural targets: MatchupIQ+ renders the toggle twice (Offense header on
    // desktop, the STAT header on mobile) against this one controller, so
    // every copy's buttons must stay in sync.
    this.sumButtonTargets.forEach((btn) => {
      btn.classList.toggle(this.activeButtonClass, showSum);
      btn.setAttribute("aria-pressed", String(showSum));
    });

    this.avgButtonTargets.forEach((btn) => {
      btn.classList.toggle(this.activeButtonClass, !showSum);
      btn.setAttribute("aria-pressed", String(!showSum));
    });
  }
}
