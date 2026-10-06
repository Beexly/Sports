import { Controller } from "@hotwired/stimulus";

// Drives every interactive state on the STAT-1271 checkout redesign:
// package (plus/archive) + plan (annual/monthly) + archive add-on
// selection, and the feature tip disclosures. Identifier
// "checkout-packages" -- the original page's own
// "checkout" controller (checkout_controller.js) is a different, simpler
// controller (just keeps the Subscribe button's price label in sync with
// a plain plan radio) that this redesign does not use or touch.
//
// All copy is server-rendered. CTA labels and breakdown lines arrive as
// Values (computed in Ruby from Payments::PackagePricing, in integer cents)
// and this controller only ever reads them and swaps text -- it never
// computes a price. Dimming of unavailable controls (monthly -> archive
// add-on/standalone card; archive package -> plan pills/add-on) is pure CSS
// (`:has()` against the radio/checkbox state), not JavaScript.
export default class extends Controller {
  static targets = [
    "packagePlus",
    "packageArchive",
    "planAnnual",
    "planMonthly",
    "addon",
    "ctaLabel",
    "breakdown",
    "tipPanel",
    "tipTrigger",
  ];

  static values = {
    ctaAnnual: String,
    ctaMonthly: String,
    ctaAllIn: String,
    ctaArchive: String,
    breakdownAnnual: String,
    breakdownMonthly: String,
    breakdownAllIn: String,
    breakdownArchive: String,
  };

  connect() {
    this.updateCta();
  }

  // -- Package / plan / add-on state --------------------------------------

  packageChanged() {
    if (this.hasPackageArchiveTarget && this.packageArchiveTarget.checked) {
      this.planAnnualTarget.checked = true;
      if (this.hasAddonTarget) this.addonTarget.checked = false;
    }
    this.updateCta();
  }

  planChanged() {
    this.packagePlusTarget.checked = true;
    if (
      this.hasPlanMonthlyTarget &&
      this.planMonthlyTarget.checked &&
      this.hasAddonTarget
    ) {
      this.addonTarget.checked = false;
    }
    this.updateCta();
  }

  // Nested plan-pill labels swallow re-selection: clicking a pill whose radio
  // is already checked (annual, after the standalone archive forced it) fires
  // no change event, so this click handler restores the plus package. It
  // no-ops when a real change event follows (planChanged is idempotent).
  reselectPlus() {
    this.packagePlusTarget.checked = true;
    this.updateCta();
  }

  addonChanged() {
    if (this.addonTarget.checked) {
      this.packagePlusTarget.checked = true;
      this.planAnnualTarget.checked = true;
    }
    this.updateCta();
  }

  currentKey() {
    if (this.hasPackageArchiveTarget && this.packageArchiveTarget.checked) {
      return "archive";
    }
    if (this.hasPlanMonthlyTarget && this.planMonthlyTarget.checked) {
      return "monthly";
    }
    if (this.hasAddonTarget && this.addonTarget.checked) {
      return "allIn";
    }
    return "annual";
  }

  updateCta() {
    const key = this.currentKey();
    const ctaByKey = {
      annual: this.ctaAnnualValue,
      monthly: this.ctaMonthlyValue,
      allIn: this.ctaAllInValue,
      archive: this.ctaArchiveValue,
    };
    const breakdownByKey = {
      annual: this.breakdownAnnualValue,
      monthly: this.breakdownMonthlyValue,
      allIn: this.breakdownAllInValue,
      archive: this.breakdownArchiveValue,
    };

    this.ctaLabelTarget.textContent = ctaByKey[key];
    this.breakdownTarget.textContent = breakdownByKey[key];
  }

  // -- Feature tip disclosures ---------------------------------------------

  openTip(event) {
    const { tipId: id } = event.params;

    this.tipPanelTargets.forEach((panel) => {
      panel.hidden = panel.dataset.checkoutTipId !== id;
    });
    // Trigger buttons carry the same id as a Stimulus action param
    // (data-checkout-packages-tip-id-param), which the native dataset API
    // exposes as checkoutPackagesTipIdParam -- one hyphen-to-camelCase
    // conversion, unrelated to Stimulus's own "-param" suffix stripping
    // inside event.params above.
    this.tipTriggerTargets.forEach((trigger) => {
      trigger.setAttribute(
        "aria-expanded",
        String(trigger.dataset.checkoutPackagesTipIdParam === id),
      );
    });
  }

  closeTip() {
    this.tipPanelTargets.forEach((panel) => {
      panel.hidden = true;
    });
    this.tipTriggerTargets.forEach((trigger) => {
      trigger.setAttribute("aria-expanded", "false");
    });
  }
}
