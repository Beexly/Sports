import { Controller } from "@hotwired/stimulus";

// Cognito's password policy (min 8, upper, lower, number, symbol -- see
// ops/terraform/modules/cognito/main.tf) is otherwise only enforced after a
// full round trip to AWS. This mirrors it client-side and names exactly
// what's missing, instead of the browser's generic "please match the
// requested format".
//
// Keys must match Components::UI::PasswordRequirements::REQUIREMENTS, whose
// items register as `requirement` targets; each flips to metClass when its
// rule passes, so the checklist goes fully green exactly when the password
// is policy-valid.
const RULES = [
  { key: "length", test: (value) => value.length >= 8, message: "8+ characters" },
  { key: "lower", test: (value) => /[a-z]/.test(value), message: "a lowercase letter" },
  { key: "upper", test: (value) => /[A-Z]/.test(value), message: "an uppercase letter" },
  { key: "number", test: (value) => /\d/.test(value), message: "a number" },
  { key: "special", test: (value) => /[^A-Za-z0-9]/.test(value), message: "a special character" },
];

export default class extends Controller {
  static targets = ["password", "confirmation", "requirement"];
  static classes = ["met"];

  checkPassword() {
    const value = this.passwordTarget.value;
    const missing = RULES.filter((rule) => !rule.test(value)).map((rule) => rule.message);

    this.updateRequirements(value);
    this.passwordTarget.setCustomValidity(missing.length ? `Password needs ${missing.join(", ")}` : "");
    this.checkConfirmation();
  }

  checkConfirmation() {
    const matches = this.confirmationTarget.value === this.passwordTarget.value;
    this.confirmationTarget.setCustomValidity(matches ? "" : "Passwords do not match");
  }

  updateRequirements(value) {
    if (!this.hasMetClass) return;

    this.requirementTargets.forEach((item) => {
      const rule = RULES.find((candidate) => candidate.key === item.dataset.rule);
      item.classList.toggle(this.metClass, Boolean(rule && rule.test(value)));
    });
  }
}
