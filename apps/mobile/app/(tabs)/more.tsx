import * as React from "react";
import { Linking, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../src/theme";
import { usePreferences } from "../../src/state/preferences";
import { useSession, viewerTier } from "../../src/state/session";
import { Body, Button, Divider, Eyebrow, Heading, Pill, Row, Spacer, Surface, Touchable } from "../../src/components/primitives";
import { GalaxyMark } from "../../src/components/brand";
import { SyncStatus } from "../../src/components/SyncStatus";
import { tierLabel, tierSatisfies } from "../../src/lib/entitlements";
import { HELPLINE } from "../../src/lib/disclosures";
import { SUPPORTED_SPORTS } from "../../src/state/preferences";
import { tapSelection } from "../../src/lib/haptics";

/**
 * More — account, appearance, and the surfaces a review will look for.
 *
 * Deliberately a plain index rather than a settings form. Four things on this
 * screen exist because App Review requires them, and they are placed where a
 * reviewer will find them without hunting:
 *
 *   · Account deletion (guideline 5.1.1(v)) — a real, destructive, in-app flow.
 *   · Manage subscription — StoreKit's own management UI, per 3.1.1.
 *   · Responsible play + the helpline (5.3, 1.4.3).
 *   · Data and privacy — what is collected and what is not, stated plainly.
 *
 * Everything else here is a preference the user actually owns.
 */

export default function MoreScreen(): React.ReactElement {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const user = useSession((s) => s.user);
  const signOut = useSession((s) => s.signOut);
  const tier = viewerTier(user);

  const themeMode = usePreferences((s) => s.themeMode);
  const setThemeMode = usePreferences((s) => s.setThemeMode);
  const sports = usePreferences((s) => s.sports);
  const toggleSport = usePreferences((s) => s.toggleSport);
  const hapticsEnabled = usePreferences((s) => s.hapticsEnabled);
  const setHaptics = usePreferences((s) => s.setHaptics);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: t.space.s16 }}>
        <View style={{ paddingTop: insets.top + t.space.s3, paddingHorizontal: t.space.s4 }}>
          <Eyebrow tone="wayfind">More</Eyebrow>
          <Heading size="archMd" style={{ marginTop: t.space.s1 }}>
            SETTINGS
          </Heading>
          <Spacer size="s3" />
          <Divider />
        </View>

        {/* Queue state goes first: it is the only thing on this screen that can
            tell the user something they did has not reached their account. */}
        <View style={{ paddingHorizontal: t.space.s4 }}>
          <Spacer size="s4" />
          <SyncStatus />
        </View>

        {/* ── Account ───────────────────────────────────────────────────── */}
        <Section title="Account">
          <Surface>
            <Row justify="space-between" align="center">
              <View style={{ flex: 1 }}>
                <Eyebrow tone="meta">Signed in as</Eyebrow>
                <Spacer size="s1" />
                <Body size="bodySm" numberOfLines={1}>
                  {user?.email ?? "Not signed in"}
                </Body>
              </View>
              <Pill tone={tier === "FREE" ? "neutral" : "accent"}>{tierLabel(tier)}</Pill>
            </Row>

            <Spacer size="s4" />
            <Divider />
            <Spacer size="s3" />

            {user ? (
              <Row gap="s3">
                <Button
                  label="Manage subscription"
                  variant="secondary"
                  onPress={() => {
                    // StoreKit's own sheet. Apple requires subscriptions sold
                    // in-app to be manageable in-app, and this is the only
                    // correct entry point — a web link here is a 3.1.1 problem.
                    void Linking.openURL("https://apps.apple.com/account/subscriptions");
                  }}
                />
                <Button
                  label="Sign out"
                  variant="ghost"
                  onPress={() => {
                    void signOut();
                  }}
                />
              </Row>
            ) : (
              <Button
                label="Sign in"
                variant="secondary"
                onPress={() => router.push("/paywall")}
                accessibilityHint="Sign-in is optional. The board, the picks and the calibration record are public."
              />
            )}

            <Spacer size="s3" />
            <Body size="bodySm" tone="muted">
              Signing in is optional. The board, the published record and the calibration
              curve are public — an account adds alerts, your own watchlist, and the tools
              that need to know who you are.
            </Body>
          </Surface>

          {tierSatisfies(tier, "FREE") ? (
            <>
              <Spacer size="s3" />
              <Button
                label="Upgrade"
                variant="primary"
                onPress={() => router.push("/paywall")}
              />
            </>
          ) : null}
        </Section>

        {/* ── Appearance ────────────────────────────────────────────────── */}
        <Section title="Appearance">
          <Surface>
            <Eyebrow tone="meta">Reading mode</Eyebrow>
            <Spacer size="s2" />
            <Body size="bodySm" tone="meta">
              Field is the product&apos;s identity. Paper is a dense-data reading mode,
              offered on the Board, Picks and Calibration surfaces where numbers read like a
              spreadsheet. It is never used on the brief or onboarding.
            </Body>
            <Spacer size="s3" />
            <Row gap="s2">
              <Choice
                label="Field"
                selected={themeMode === "field"}
                onPress={() => {
                  tapSelection();
                  setThemeMode("field");
                }}
              />
              <Choice
                label="Paper"
                selected={themeMode === "paper"}
                onPress={() => {
                  tapSelection();
                  setThemeMode("paper");
                }}
              />
            </Row>
          </Surface>

          <Spacer size="s3" />
          <Surface>
            <Row justify="space-between" align="center">
              <View style={{ flex: 1 }}>
                <Body size="bodySm">Haptics</Body>
                <Body size="bodySm" tone="muted">
                  Three moments only: lane changes, a settlement, a withheld row.
                </Body>
              </View>
              <Choice
                label={hapticsEnabled ? "On" : "Off"}
                selected={hapticsEnabled}
                onPress={() => {
                  tapSelection();
                  setHaptics(!hapticsEnabled);
                }}
              />
            </Row>
          </Surface>
        </Section>

        {/* ── Sports ────────────────────────────────────────────────────── */}
        <Section title="Sports">
          <Surface>
            <Body size="bodySm" tone="meta">
              Filter the board. Leave everything off to see every sport we cover.
            </Body>
            <Spacer size="s3" />
            <Row gap="s2" wrap>
              {SUPPORTED_SPORTS.map((sport) => (
                <Choice
                  key={sport}
                  label={sport}
                  selected={sports.includes(sport)}
                  onPress={() => {
                    tapSelection();
                    toggleSport(sport);
                  }}
                />
              ))}
            </Row>
            {sports.length > 1 ? (
              <>
                <Spacer size="s3" />
                <Body size="bodySm" tone="muted">
                  More than one sport selected, so the board is showing all of them.
                </Body>
              </>
            ) : null}
          </Surface>
        </Section>

        {/* ── Integrity and help ────────────────────────────────────────── */}
        <Section title="Integrity and help">
          <Surface padded={false}>
            <LinkRow
              label="Responsible play"
              detail="Session nudges, loss cool-down, self-exclusion, and the helpline."
              onPress={() => router.push("/responsible-play")}
            />
            <Divider />
            <LinkRow
              label="How we make money"
              detail="No sportsbook revenue share. The disclosure is on the site and we will not paraphrase it here."
              onPress={() => void Linking.openURL("https://www.galaxysportsedge.com/how-we-make-money")}
            />
            <Divider />
            <LinkRow
              label="Methodology"
              detail="The framework is published. The weights are not."
              onPress={() => void Linking.openURL("https://www.galaxysportsedge.com/methodology")}
            />
            <Divider />
            <LinkRow
              label="Verify a record"
              detail="Every pick carries a receipt hash. Paste it at the verify surface."
              onPress={() => void Linking.openURL("https://www.galaxysportsedge.com/verify")}
            />
          </Surface>

          <Spacer size="s3" />
          <Surface>
            <Eyebrow tone="meta">{HELPLINE.name}</Eyebrow>
            <Spacer size="s2" />
            <Body size="bodySm" tone="meta">
              If betting has stopped being a decision, this is free, confidential and
              available 24 hours a day.
            </Body>
            <Spacer size="s3" />
            <Button
              label={`Call ${HELPLINE.shortLabel}`}
              variant="secondary"
              onPress={() => void Linking.openURL(HELPLINE.telHref)}
              accessibilityHint={`Calls ${HELPLINE.name} at ${HELPLINE.number}`}
            />
          </Surface>
        </Section>

        {/* ── Data and privacy ──────────────────────────────────────────── */}
        <Section title="Data and privacy">
          <Surface>
            <Body size="bodySm" tone="meta">
              We do not track you across other apps or websites, and we do not run
              advertising SDKs. Because of that, iOS never asks you for tracking
              permission and this app never prompts for it.
            </Body>
            <Spacer size="s3" />
            <Body size="bodySm" tone="meta">
              What the app stores on your device: your appearance and sport preferences, and
              a cache of the last board it received so it can show you something without a
              connection. The cache carries its age on screen.
            </Body>
            <Spacer size="s3" />
            <Body size="bodySm" tone="meta">
              What the server stores: your account, your subscription state, and your
              watchlist. Deleting your account removes them.
            </Body>
          </Surface>

          <Spacer size="s3" />
          <Surface padded={false}>
            <LinkRow
              label="Privacy policy"
              detail="The full document."
              onPress={() => void Linking.openURL("https://www.galaxysportsedge.com/privacy")}
            />
            <Divider />
            <LinkRow
              label="Delete account"
              detail="Removes your account, subscription link and watchlist. Cannot be undone."
              destructive
              onPress={() => router.push("/settings")}
            />
          </Surface>
        </Section>

        {/* ── About ─────────────────────────────────────────────────────── */}
        <Section title="About">
          <Surface>
            <Row gap="s3" align="center">
              <GalaxyMark size={32} accent />
              <View style={{ flex: 1 }}>
                <Body size="bodySm">Galaxy Sports Edge</Body>
                <Body size="bodySm" tone="muted">
                  Version 1.0.0
                </Body>
              </View>
            </Row>
            <Spacer size="s3" />
            <Divider />
            <Spacer size="s3" />
            <Body size="bodySm" tone="meta">
              We&apos;re not AI. We&apos;re math you can read.
            </Body>
          </Surface>
        </Section>

        <Spacer size="s10" />
      </ScrollView>
    </View>
  );
}

/* ── Parts ─────────────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  const t = useTheme();
  return (
    <View style={{ paddingHorizontal: t.space.s4 }}>
      <Spacer size="s5" />
      <Eyebrow tone="wayfind">{title}</Eyebrow>
      <Spacer size="s3" />
      {children}
    </View>
  );
}

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}): React.ReactElement {
  const t = useTheme();
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <View
        style={{
          paddingHorizontal: t.space.s4,
          paddingVertical: t.space.s2,
          borderRadius: t.radius.xs,
          borderWidth: 1,
          borderColor: selected ? t.colors.wayfind : t.colors.border,
          minHeight: 44,
          justifyContent: "center",
        }}
      >
        <Eyebrow tone={selected ? "wayfind" : "meta"}>{label}</Eyebrow>
      </View>
    </Touchable>
  );
}

function LinkRow({
  label,
  detail,
  onPress,
  destructive = false,
}: {
  label: string;
  detail: string;
  onPress: () => void;
  destructive?: boolean;
}): React.ReactElement {
  const t = useTheme();
  return (
    <Touchable onPress={onPress} accessibilityLabel={label} accessibilityHint={detail}>
      <View style={{ padding: t.space.s4, minHeight: 44 }}>
        <Row justify="space-between" align="center">
          <Body size="body" tone={destructive ? "alert" : "fg"}>
            {label}
          </Body>
          <Eyebrow tone="muted">{t.glyph.arrow}</Eyebrow>
        </Row>
        <Spacer size="s1" />
        <Body size="bodySm" tone="muted">
          {detail}
        </Body>
      </View>
    </Touchable>
  );
}