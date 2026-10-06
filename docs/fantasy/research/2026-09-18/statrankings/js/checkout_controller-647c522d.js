import { Controller } from "@hotwired/stimulus";

// The plan selector posts to CheckoutController#create, which redirects to
// Stripe-hosted checkout — card entry happens on checkout.stripe.com, so no
// Stripe SDK loads here. This controller only keeps the Subscribe button's
// price label in sync with the selected plan.
export default class extends Controller {
  static targets = ["subscribeAmount"];

  planChanged() {
    const radio = this.element.querySelector('[name="plan"]:checked');
    if (!radio) return;

    const amount =
      radio.value === "annual"
        ? radio.dataset.annualPrice
        : radio.dataset.monthlyPrice;

    if (amount && this.hasSubscribeAmountTarget) {
      this.subscribeAmountTarget.textContent = `· ${amount}`;
    }
  }
}
