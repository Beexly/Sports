import { describe, expect, it } from "vitest";
import { TestDriver } from "testdriverai/vitest/hooks";

// Smoke tests for the Galaxy Sports Edge marketing homepage (production).
// The app is a sports intelligence platform; sign-in is Google OAuth and is
// not automatable, so these tests exercise the public marketing surface.
describe("Galaxy Sports Edge — homepage", () => {
  it("loads the homepage with the hero headline and primary CTAs", async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({ url: "https://galaxysportsedge.com" });

    // Hero copy is the platform's core positioning.
    const heroVisible = await testdriver.assert(
      "the hero headline about turning market noise into signal is visible",
    );
    expect(heroVisible).toBeTruthy();

    // Primary header CTAs a visitor would use.
    const ctasVisible = await testdriver.assert(
      'the top-right "Sign in" and "See plans" buttons are visible',
    );
    expect(ctasVisible).toBeTruthy();
  });

  it('navigates to the pricing page from the "See plans" CTA', async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({ url: "https://galaxysportsedge.com" });

    await testdriver.find('the "See plans" button in the top-right header').click();
    await testdriver.wait(3000);

    const pricingVisible = await testdriver.assert(
      "the pricing page shows subscription tiers including Free, Pro, and Elite with dollar prices",
    );
    expect(pricingVisible).toBeTruthy();
  });
});
