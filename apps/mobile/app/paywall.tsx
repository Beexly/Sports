import * as React from "react";
import { Linking, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIAP, ErrorCode, getStorefront, type Product } from "expo-iap";

import { useTheme } from "../src/theme";
import { Body, Button, Divider, Eyebrow, Heading, Pill, Row, Spacer, Surface, Touchable } from "../src/components/primitives";
import { TIER_NARRATIVE } from "../src/lib/entitlements";
import { LEGAL_URLS } from "../src/lib/disclosures";
import { tapSuccess, tapWarning } from "../src/lib/haptics";
import type { SubscriptionTier } from "../src/api/contracts";

/**
 * The paywall.
 *
 * THE APP STORE RULE THAT SHAPES THIS ENTIRE SCREEN: guideline 3.1.1 requires
 * In-App Purchase for digital content unlocked inside the app. A "subscribe with
 * Stripe" button here would be a rejection, not a shortcut. So:
 *
 *   · StoreKit 2 is the ONLY purchase path offered in-app, via `expo-iap`.
 *   · "Manage subscription" opens Apple's own subscriptions sheet.
 *   · The product IDs are the single source of truth in `PRODUCT_IDS`.
 *
 * EXTERNAL PURCHASE LINK — the nuance most builds get wrong. Following the 2025
 * US injunction, a US-distributed app may link out to an external purchase
 * mechanism. That permission is US-SPECIFIC, so the link is gated on the
 * StoreKit storefront country code and is not rendered elsewhere. It never
 * auto-opens a checkout, and it is labelled as leaving the app.
 *
 * WHAT THIS SCREEN DOES NOT DO:
 *   · No countdown, no "3 spots left", no urgency of any kind. The positioning
 *     triage rejects that vocabulary outright.
 *   · No win-rate claim. The tiers sell access to analysis and tooling; they do
 *     not sell outcomes, and saying otherwise would be the one claim the product
 *     cannot defend.
 *   · No comparison to a competitor.
 */

/** Product identifiers. These must match App Store Connect exactly. */
export const PRODUCT_IDS = {
  proMonthly: "com.galaxysportsedge.app.pro.monthly",
  proYearly: "com.galaxysportsedge.app.pro.yearly",
  eliteMonthly: "com.galaxysportsedge.app.elite.monthly",
  eliteYearly: "com.galaxysportsedge.app.elite.yearly",
  fantasyMonthly: "com.galaxysportsedge.app.fantasy.monthly",
  fantasyYearly: "com.galaxysportsedge.app.fantasy.yearly",
} as const;

const ALL_PRODUCT_IDS = Object.values(PRODUCT_IDS);

/**
 * Prices are shown from STOREKIT, never hardcoded.
 *
 * A hardcoded price is wrong in every storefront with a different currency or
 * tax treatment, and App Review rejects a listing whose displayed price does not
 * match the store's. The founding rates live in
 * `apps/web/lib/pricing/pricing-phases.ts` for the web ladder; here the store is
 * authoritative and the localised `displayPrice` is what renders.
 */

interface PlanSpec {
  productId: string;
  tier: Exclude<SubscriptionTier, "FREE">;
  title: string;
  cadence: "monthly" | "yearly";
}

const PLANS: PlanSpec[] = [
  { productId: PRODUCT_IDS.proMonthly, tier: "PRO", title: "Pro", cadence: "monthly" },
  { productId: PRODUCT_IDS.proYearly, tier: "PRO", title: "Pro", cadence: "yearly" },
  { productId: PRODUCT_IDS.eliteMonthly, tier: "ELITE", title: "Elite", cadence: "monthly" },
  { productId: PRODUCT_IDS.eliteYearly, tier: "ELITE", title: "Elite", cadence: "yearly" },
  { productId: PRODUCT_IDS.fantasyMonthly, tier: "FANTASY", title: "Fantasy", cadence: "monthly" },
  { productId: PRODUCT_IDS.fantasyYearly, tier: "FANTASY", title: "Fantasy", cadence: "yearly" },
];

export default function PaywallScreen(): React.ReactElement {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [storefront, setStorefront] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const {
    connected,
    products,
    fetchProducts,
    requestPurchase,
    restorePurchases,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      tapSuccess();
      // Finishing the transaction is what stops StoreKit re-delivering it
      // forever. A purchase that is validated but never finished is the single
      // most common cause of "I bought it twice" support tickets.
      try {
        await finishTransaction({ purchase, isConsumable: false });
      } catch {
        // A failed finish is retried by StoreKit on the next launch.
      }
      setNotice("Purchase complete. Your entitlements refresh on the next load.");
      setBusyId(null);
    },
    onPurchaseError: (error) => {
      tapWarning();
      setBusyId(null);
      // A user cancelling is not an error worth an alarming sentence. The code
      // is `ErrorCode.UserCancelled` ("user-cancelled") in expo-iap v3 — the
      // v2 name `E_USER_CANCELLED` no longer exists, and comparing against it
      // was a silent no-op that made every dismissal show an error.
      if (error.code === ErrorCode.UserCancelled) {
        setNotice(null);
        return;
      }
      setNotice("The purchase did not complete. Nothing was charged.");
    },
  });

  React.useEffect(() => {
    if (!connected) return;
    void fetchProducts({ skus: ALL_PRODUCT_IDS, type: "subs" }).catch(() => {
      setNotice("The store could not be reached. Prices are unavailable offline.");
    });
  }, [connected, fetchProducts]);

  const productsById = React.useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of products) map.set(product.id, product);
    return map;
  }, [products]);

  const byTier = React.useMemo(() => {
    const grouped = new Map<string, Product[]>();
    for (const plan of PLANS) {
      const product = productsById.get(plan.productId);
      if (!product) continue;
      const list = grouped.get(plan.tier) ?? [];
      list.push(product);
      grouped.set(plan.tier, list);
    }
    return grouped;
  }, [productsById]);

  // External purchase links are a US allowance. Gate on the storefront, and
  // fail closed: an unknown storefront gets no link.
  const externalAllowed = storefront === "USA";

  React.useEffect(() => {
    // `getStorefront()` takes no arguments in expo-iap v3. A failure leaves the
    // external-purchase link hidden, which is the safe direction: the US
    // allowance must never be shown to a non-US storefront.
    void getStorefront()
      .then((code) => {
        if (typeof code === "string" && code.length > 0) setStorefront(code);
      })
      .catch(() => {
        setStorefront(null);
      });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: t.space.s5,
          paddingTop: insets.top + t.space.s8,
          paddingBottom: insets.bottom + t.space.s10,
        }}
      >
        <Eyebrow tone="wayfind">Access</Eyebrow>
        <Spacer size="s2" />
        <Heading size="archMd">THE FULL BOARD</Heading>
        <Spacer size="s4" />
        <Body tone="meta">
          The board, the published record and the calibration curve are public and stay public.
          A subscription adds the analysis behind them, the tooling that uses them, and alerts
          when a followed pick settles.
        </Body>

        <Spacer size="s5" />
        <Surface>
          <Eyebrow tone="meta">Free: what you already have</Eyebrow>
          <Spacer size="s2" />
          <Body size="bodySm" tone="meta">
            {TIER_NARRATIVE.FREE}
          </Body>
          <Spacer size="s2" />
          <Body size="bodySm" tone="muted">
            Two picks a day, no confidence score, and every public trust surface including the
            Edge Index and the full graded record.
          </Body>
        </Surface>

        <Spacer size="s5" />

        {(["PRO", "ELITE", "FANTASY"] as const).map((tier) => {
          const tierProducts = byTier.get(tier) ?? [];
          return (
            <View key={tier}>
              <Surface>
                <Row justify="space-between" align="center">
                  <Eyebrow tone={tier === "ELITE" ? "accent" : "wayfind"}>{tier}</Eyebrow>
                  {tier === "FANTASY" ? <Pill tone="neutral">Separate line</Pill> : null}
                </Row>
                <Spacer size="s2" />
                <Body size="bodySm" tone="meta">
                  {TIER_NARRATIVE[tier]}
                </Body>
                <Spacer size="s4" />

                {tierProducts.length === 0 ? (
                  <Body size="bodySm" tone="muted">
                    {connected
                      ? "This plan is not available in your storefront right now."
                      : "Loading prices from the App Store."}
                  </Body>
                ) : (
                  <Row gap="s3" wrap>
                    {tierProducts.map((product) => (
                      <Touchable
                        key={product.id}
                        accessibilityLabel={`Subscribe to ${tier}, ${product.displayPrice} ${cadenceOf(product.id)}`}
                        onPress={() => {
                          setBusyId(product.id);
                          setNotice(null);
                          void requestPurchase({
                            request: {
                              ios: { sku: product.id },
                              android: { skus: [product.id] },
                            },
                            type: "subs",
                          });
                        }}
                      >
                        <View
                          style={{
                            minHeight: 44,
                            justifyContent: "center",
                            paddingHorizontal: t.space.s5,
                            borderRadius: t.radius.sm,
                            borderWidth: 1,
                            borderColor: tier === "ELITE" ? t.colors.accent : t.colors.borderStrong,
                            opacity: busyId && busyId !== product.id ? 0.5 : 1,
                          }}
                        >
                          <Eyebrow tone={tier === "ELITE" ? "accent" : "fg"}>
                            {busyId === product.id
                              ? "Working"
                              : `${product.displayPrice} ${cadenceOf(product.id)}`}
                          </Eyebrow>
                        </View>
                      </Touchable>
                    ))}
                  </Row>
                )}
              </Surface>
              <Spacer size="s4" />
            </View>
          );
        })}

        {notice ? (
          <>
            <Surface>
              <Body size="bodySm" tone="meta">
                {notice}
              </Body>
            </Surface>
            <Spacer size="s4" />
          </>
        ) : null}

        <Row gap="s3">
          <Button
            label="Restore"
            variant="secondary"
            onPress={() => {
              void restorePurchases();
              setNotice("Checking the App Store for previous purchases.");
            }}
          />
          <Button
            label="Manage"
            variant="ghost"
            onPress={() => void Linking.openURL("https://apps.apple.com/account/subscriptions")}
          />
        </Row>

        {externalAllowed ? (
          <>
            <Spacer size="s5" />
            <Surface>
              <Eyebrow tone="meta">Purchasing outside the app</Eyebrow>
              <Spacer size="s2" />
              <Body size="bodySm" tone="muted">
                In the United States you may also subscribe on our website. This opens your
                browser and leaves the app. Prices and terms there are separate from the App
                Store&apos;s.
              </Body>
              <Spacer size="s3" />
              <Button
                label="Open our pricing page"
                variant="ghost"
                onPress={() => void Linking.openURL("https://www.galaxysportsedge.com/pricing")}
              />
            </Surface>
          </>
        ) : null}

        <Spacer size="s6" />
        <Body size="bodySm" tone="muted">
          Subscriptions renew automatically until cancelled. Cancel any time in your App Store
          account settings. Prices are set by the App Store for your region.
        </Body>
        <Spacer size="s3" />
        <Row gap="s4">
          <Touchable
            onPress={() => void Linking.openURL(LEGAL_URLS.terms)}
            accessibilityLabel="Terms"
            accessibilityRole="link"
          >
            <Eyebrow tone="muted">Terms</Eyebrow>
          </Touchable>
          <Touchable
            onPress={() => void Linking.openURL(LEGAL_URLS.privacy)}
            accessibilityLabel="Privacy policy"
            accessibilityRole="link"
          >
            <Eyebrow tone="muted">Privacy</Eyebrow>
          </Touchable>
        </Row>

        <Spacer size="s8" />
        <Divider />
        <Spacer size="s4" />
        <Button label="Not now" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </View>
  );
}

function cadenceOf(productId: string): string {
  if (productId.endsWith(".yearly")) return "/ year";
  return "/ month";
}