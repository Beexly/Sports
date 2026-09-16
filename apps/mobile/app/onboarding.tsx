import * as React from "react";
import { Linking, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../src/theme";
import { usePreferences, SUPPORTED_SPORTS } from "../src/state/preferences";
import { Body, Button, Divider, Eyebrow, Heading, Row, Spacer, Surface, Touchable } from "../src/components/primitives";
import { GalaxyMark, BRAND_POSITIONING_LINE } from "../src/components/brand";
import { AGE_GATE, NOT_A_SPORTSBOOK, HELPLINE } from "../src/lib/disclosures";
import { tapSelection } from "../src/lib/haptics";

/**
 * Onboarding — the age gate, what this is, and one preference.
 *
 * THREE STEPS, AND NO MORE. The product's own claim is that it is legible; an
 * eight-screen onboarding carousel would be the first thing it does that is not.
 *
 * The AGE GATE is step one and cannot be skipped, because the app is rated 17+
 * for sportsbook adjacency (guideline 1.4.3 / 5.3). It is a STATEMENT rather
 * than a birthdate field: collecting a date of birth would collect personal data
 * the product has no use for, and Apple does not require it. Declining leaves
 * the app closed and says why — it does not silently let the user through.
 *
 * Step two is the only place in the app where the positioning line leads. After
 * this it is never repeated as a slogan; it is executed instead.
 */

type Step = "age" | "position" | "sports";

export default function OnboardingScreen(): React.ReactElement {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const acknowledgeAge = usePreferences((s) => s.acknowledgeAge);
  const completeOnboarding = usePreferences((s) => s.completeOnboarding);

  const [step, setStep] = React.useState<Step>("age");
  const [sports, setSports] = React.useState<string[]>([]);
  const [declined, setDeclined] = React.useState(false);

  const toggle = (sport: string): void => {
    tapSelection();
    setSports((current) =>
      current.includes(sport) ? current.filter((s) => s !== sport) : [...current, sport],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: t.space.s5,
          paddingTop: insets.top + t.space.s10,
          paddingBottom: insets.bottom + t.space.s8,
          flexGrow: 1,
        }}
      >
        <Row gap="s3" align="center">
          <GalaxyMark size={34} accent />
          <Eyebrow tone="wayfind">Galaxy Sports Edge</Eyebrow>
        </Row>

        <Spacer size="s8" />

        {step === "age" ? (
          <>
            <Heading size="archMd">BEFORE WE START</Heading>
            <Spacer size="s4" />
            <Body size="bodyLg" style={{ color: t.colors.fg }}>
              {AGE_GATE.body}
            </Body>
            <Spacer size="s4" />
            <Surface>
              <Body size="bodySm" tone="meta">
                {AGE_GATE.confirm}
              </Body>
            </Surface>

            {declined ? (
              <>
                <Spacer size="s4" />
                <Surface>
                  <Eyebrow tone="alert">Closed</Eyebrow>
                  <Spacer size="s2" />
                  <Body size="bodySm" tone="meta">
                    You need to be of legal age in your jurisdiction to use this app. If
                    betting has become difficult, help is free and confidential.
                  </Body>
                  <Spacer size="s3" />
                  <Button
                    label={`Call ${HELPLINE.shortLabel}`}
                    variant="secondary"
                    onPress={() => void Linking.openURL(HELPLINE.telHref)}
                  />
                </Surface>
              </>
            ) : null}

            <Spacer size="s8" />
            <Button
              label={AGE_GATE.action}
              onPress={() => {
                acknowledgeAge();
                setStep("position");
              }}
            />
            <Spacer size="s3" />
            <Button label={AGE_GATE.decline} variant="ghost" onPress={() => setDeclined(true)} />
          </>
        ) : null}

        {step === "position" ? (
          <>
            <Heading size="archMd">WHAT THIS IS</Heading>
            <Spacer size="s4" />
            <Body size="bodyLg" style={{ color: t.colors.fg }}>
              {BRAND_POSITIONING_LINE}
            </Body>
            <Spacer size="s4" />
            <Body tone="meta">
              The model reads market movement, price, timing and volatility, and it publishes
              what it finds with the reasoning attached. It says no far more often than it
              says yes. When it is wrong, it says so and shows you the autopsy.
            </Body>

            <Spacer size="s5" />
            <Surface>
              <Eyebrow tone="meta">What this is not</Eyebrow>
              <Spacer size="s3" />
              {NOT_A_SPORTSBOOK.map((line) => (
                <View key={line} style={{ marginBottom: t.space.s2 }}>
                  <Body size="bodySm" tone="meta">
                    {line}
                  </Body>
                </View>
              ))}
            </Surface>

            <Spacer size="s8" />
            <Button label="Continue" onPress={() => setStep("sports")} />
          </>
        ) : null}

        {step === "sports" ? (
          <>
            <Heading size="archMd">WHAT YOU FOLLOW</Heading>
            <Spacer size="s3" />
            <Body tone="meta">
              Optional, and changeable later. Leave everything off to see every sport we
              cover.
            </Body>
            <Spacer size="s5" />
            <Row gap="s2" wrap>
              {SUPPORTED_SPORTS.map((sport) => {
                const selected = sports.includes(sport);
                return (
                  <Touchable
                    key={sport}
                    onPress={() => toggle(sport)}
                    accessibilityLabel={sport}
                    accessibilityState={{ selected }}
                  >
                    <View
                      style={{
                        minHeight: 44,
                        justifyContent: "center",
                        paddingHorizontal: t.space.s5,
                        borderRadius: t.radius.xs,
                        borderWidth: 1,
                        borderColor: selected ? t.colors.wayfind : t.colors.border,
                      }}
                    >
                      <Eyebrow tone={selected ? "wayfind" : "meta"}>{sport}</Eyebrow>
                    </View>
                  </Touchable>
                );
              })}
            </Row>

            <Spacer size="s8" />
            <Button
              label="Open the board"
              onPress={() => {
                completeOnboarding(sports);
                router.replace("/(tabs)");
              }}
            />
            <Spacer size="s3" />
            <Divider />
            <Spacer size="s3" />
            <Body size="bodySm" tone="muted">
              The board, the published record and the calibration curve are public. No account
              is needed to read them.
            </Body>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}