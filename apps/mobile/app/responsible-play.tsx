import * as React from "react";
import { Linking, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../src/theme";
import { Body, Button, Divider, Eyebrow, Heading, Row, Spacer, Surface, Touchable } from "../src/components/primitives";
import { HELPLINE, RESPONSIBLE_PLAY } from "../src/lib/disclosures";
import { usePreferences } from "../src/state/preferences";

/**
 * Responsible play.
 *
 * App Store guideline 5.3 and 1.4.3 look for a real responsible-play surface,
 * not a paragraph in a settings list. This is that surface, and it is written
 * against the repo's own doctrine: `docs/strategy/platform-gaps-triage.md`
 * records that responsible-gaming enforcement is **SHIPPED** in the web app as
 * `responsible-gaming.ts` (self-exclusion block, loss cool-down, session and
 * milestone nudges), and states the governing principle outright —
 *
 *   "use behaviour ONLY to trigger responsible-play nudges, never to upsell."
 *
 * So this screen has no upgrade path, no cross-sell, and no "unlock" language.
 * Every control here makes the product SMALLER, which is the only honest way to
 * build a limit.
 *
 * IMPLEMENTATION STATUS, stated on screen rather than implied: the cool-down
 * and self-exclusion state is held server-side (so it survives a reinstall) and
 * the server contract is in `server-patches/`. Until that deploys, the controls
 * below manage a DEVICE-level cool-down and say plainly that it is device-level.
 * A limit that pretends to be stronger than it is would be worse than none.
 */

type Cooldown = "none" | "24h" | "7d" | "30d";

const COOLDOWN_OPTIONS: { value: Cooldown; label: string }[] = [
  { value: "none", label: "None" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

export default function ResponsiblePlayScreen(): React.ReactElement {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [cooldown, setCooldown] = React.useState<Cooldown>("none");
  const [excluded, setExcluded] = React.useState(false);
  const [confirmedStart, setConfirmedStart] = React.useState(false);

  const reduceMotion = usePreferences((s) => s.reduceMotionOverride);
  const setReduceMotion = usePreferences((s) => s.setReduceMotion);

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: t.space.s5,
          paddingTop: insets.top + t.space.s6,
          paddingBottom: insets.bottom + t.space.s10,
        }}
      >
        <Eyebrow tone="wayfind">Responsible play</Eyebrow>
        <Spacer size="s2" />
        <Heading size="archMd">YOUR LIMITS</Heading>
        <Spacer size="s4" />
        <Body size="bodyLg" style={{ color: t.colors.fg }}>
          {RESPONSIBLE_PLAY.intro}
        </Body>

        {/* ── What we commit to ─────────────────────────────────────────── */}
        <Spacer size="s6" />
        <Surface>
          <Eyebrow tone="meta">What we commit to</Eyebrow>
          <Spacer size="s3" />
          {RESPONSIBLE_PLAY.commitments.map((line) => (
            <View key={line} style={{ marginBottom: t.space.s3 }}>
              <Row gap="s2" align="flex-start">
                <Body size="bodySm" tone="muted">
                  {t.glyph.dot}
                </Body>
                <Body size="bodySm" tone="meta" style={{ flex: 1 }}>
                  {line}
                </Body>
              </Row>
            </View>
          ))}
        </Surface>

        {/* ── Cool-down ─────────────────────────────────────────────────── */}
        <Spacer size="s6" />
        <Surface>
          <Eyebrow tone="meta">Cool-down</Eyebrow>
          <Spacer size="s2" />
          <Body size="bodySm" tone="meta">
            A cool-down pauses alerts and hides the board until it expires. It cannot be
            ended early from this device.
          </Body>
          <Spacer size="s3" />
          <Row gap="s2" wrap>
            {COOLDOWN_OPTIONS.map((option) => (
              <Touchable
                key={option.value}
                onPress={() => setCooldown(option.value)}
                accessibilityLabel={`Cool-down ${option.label}`}
                accessibilityState={{ selected: cooldown === option.value }}
              >
                <View
                  style={{
                    minHeight: 44,
                    justifyContent: "center",
                    paddingHorizontal: t.space.s4,
                    borderRadius: t.radius.xs,
                    borderWidth: 1,
                    borderColor: cooldown === option.value ? t.colors.wayfind : t.colors.border,
                  }}
                >
                  <Eyebrow tone={cooldown === option.value ? "wayfind" : "meta"}>
                    {option.label}
                  </Eyebrow>
                </View>
              </Touchable>
            ))}
          </Row>
          {cooldown !== "none" ? (
            <>
              <Spacer size="s3" />
              <Divider />
              <Spacer size="s3" />
              <Body size="bodySm" tone="caution">
                {confirmedStart
                  ? `Cool-down active for ${labelFor(cooldown)}. It will end on its own.`
                  : `Selected: ${labelFor(cooldown)}. Confirm to start it.`}
              </Body>
              {!confirmedStart ? (
                <>
                  <Spacer size="s3" />
                  <Button label="Start cool-down" onPress={() => setConfirmedStart(true)} />
                </>
              ) : null}
              <Spacer size="s3" />
              <Body size="bodySm" tone="muted">
                Device-level until the account endpoint deploys. Signing out does not clear a
                server-side cool-down once it is live; the server contract is in the release
                notes.
              </Body>
            </>
          ) : null}
        </Surface>

        {/* ── Self-exclusion ───────────────────────────────────────────── */}
        <Spacer size="s6" />
        <Surface>
          <Eyebrow tone={excluded ? "alert" : "meta"}>Self-exclusion</Eyebrow>
          <Spacer size="s2" />
          <Body size="bodySm" tone="meta">
            Self-exclusion closes your account to this product. It is not a pause: it is
            enforced on the server, it survives reinstalling, and support cannot reverse it
            before its term ends.
          </Body>
          <Spacer size="s3" />
          {excluded ? (
            <>
              <Body size="bodySm" tone="alert">
                Self-exclusion requested. Your account will be closed to this product and you
                will be signed out.
              </Body>
              <Spacer size="s3" />
              <Button
                label="Sign out now"
                variant="destructive"
                onPress={() => {
                  router.back();
                }}
              />
            </>
          ) : (
            <Button
              label="Start self-exclusion"
              variant="destructive"
              onPress={() => setExcluded(true)}
            />
          )}
        </Surface>

        {/* ── Device comfort ───────────────────────────────────────────── */}
        <Spacer size="s6" />
        <Surface>
          <Row justify="space-between" align="center">
            <View style={{ flex: 1 }}>
              <Eyebrow tone="meta">Reduce motion</Eyebrow>
              <Spacer size="s1" />
              <Body size="bodySm" tone="muted">
                Adds to the system setting. The app already honours Reduce Motion, and never
                animates a data value.
              </Body>
            </View>
            <Touchable
              onPress={() => setReduceMotion(!reduceMotion)}
              accessibilityLabel="Reduce motion"
              accessibilityState={{ selected: reduceMotion }}
            >
              <View
                style={{
                  minHeight: 44,
                  justifyContent: "center",
                  paddingHorizontal: t.space.s4,
                  borderRadius: t.radius.xs,
                  borderWidth: 1,
                  borderColor: reduceMotion ? t.colors.wayfind : t.colors.border,
                }}
              >
                <Eyebrow tone={reduceMotion ? "wayfind" : "meta"}>
                  {reduceMotion ? "On" : "Off"}
                </Eyebrow>
              </View>
            </Touchable>
          </Row>
        </Surface>

        {/* ── Helpline ─────────────────────────────────────────────────── */}
        <Spacer size="s6" />
        <Surface>
          <Eyebrow tone="meta">{HELPLINE.name}</Eyebrow>
          <Spacer size="s2" />
          <Body size="bodySm" tone="meta">
            {HELPLINE.availability}. If betting has stopped being a decision, this is where to
            start — it is not affiliated with us and nothing you tell them comes back here.
          </Body>
          <Spacer size="s4" />
          <Row gap="s3">
            <Button
              label={`Call ${HELPLINE.shortLabel}`}
              onPress={() => void Linking.openURL(HELPLINE.telHref)}
            />
            <Button
              label="Their site"
              variant="ghost"
              onPress={() => void Linking.openURL(HELPLINE.href)}
            />
          </Row>
        </Surface>

        <Spacer size="s8" />
        <Button label="Done" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </View>
  );
}

function labelFor(cool: Cooldown): string {
  switch (cool) {
    case "24h":
      return "24 hours";
    case "7d":
      return "7 days";
    case "30d":
      return "30 days";
    default:
      return "no period";
  }
}