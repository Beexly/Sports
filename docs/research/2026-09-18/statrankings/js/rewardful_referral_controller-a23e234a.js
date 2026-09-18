import { Controller } from "@hotwired/stimulus";

// Copies Rewardful's referral id into the plan form's hidden field, so
// CheckoutController#create can forward it as the Checkout Session's
// client_reference_id -- which is how Rewardful attributes the sale.
//
// The value exists only client-side: Rewardful's script resolves it from the
// `?via=` token stored when the visitor hit the co-branded landing page, so the
// server cannot know it at render time. Structurally the same as
// return_to_controller.js, which fills its hidden field from sessionStorage.
//
// `rewardful("ready", ...)` is the provider's own callback for "the async
// script has resolved a referral"; reading Rewardful.referral directly on
// connect would race it and usually read undefined.
//
// Silent no-op when window.rewardful is absent. The script is not gated on the
// affiliate_program flag, so this is not the flag-off path -- with the flag off
// this controller is never attached in the first place (see
// Views::Checkout::Form#form_controllers). It is the no-API-key path
// (RewardfulConfig.enabled?) and the not-yet-loaded path, and in both there is
// nothing to attribute.
export default class extends Controller {
  static targets = ["field"];

  connect() {
    if (!this.hasFieldTarget || typeof window.rewardful !== "function") return;

    window.rewardful("ready", () => {
      const referral = window.Rewardful && window.Rewardful.referral;
      if (referral) this.fieldTarget.value = referral;
    });
  }
}
