import { describe, expect, it } from "vitest";
import { TestDriver } from "testdriverai/vitest/hooks";

// Public pricing page smoke test for Galaxy Sports Edge (production).
describe("Galaxy Sports Edge — pricing", () => {
  it("loads the pricing page with subscription tiers and prices", async (context) => {
    const testdriver = TestDriver(context);

    await testdriver.provision.chrome({
      url: "https://galaxysportsedge.com/pricing",
    });
    await testdriver.wait(3000);

    // The four tiers and their dollar prices render above the fold.
    const tiersVisible = await testdriver.assert(
      "the pricing page shows subscription tiers including Free, Pro, and Elite with dollar prices",
    );
    expect(tiersVisible).toBeTruthy();
  });
});
