import * as React from "react";
import { Linking, ScrollView, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../src/theme";
import { useSession } from "../src/state/session";
import { useGseClient } from "../src/api/context";
import { deleteAccount } from "../src/api/endpoints";
import { Body, Button, Divider, Eyebrow, Heading, Row, Spacer, Surface } from "../src/components/primitives";
import { LEGAL_URLS } from "../src/lib/disclosures";
import { tapWarning } from "../src/lib/haptics";

/**
 * Account settings.
 *
 * This screen exists principally for ONE reason: App Store Review guideline
 * 5.1.1(v) requires that an app offering account creation must let the user
 * delete the account from inside the app. Not a link to a web form — in the
 * app. Reviewers test this, and its absence is a routine rejection.
 *
 * The flow is a typed confirmation rather than a single tap:
 *
 *   · It states exactly what is destroyed and what is kept. The published record
 *     is NOT deleted — those picks were published and they settled, and removing
 *     them would flatter the product's results. That is a real distinction and a
 *     user deserves to know it before they act, not after.
 *   · The confirmation string is the account's email address, so a mistap cannot
 *     delete an account.
 *   · It is the only destructive action in the app, and it takes the alert tone.
 *
 * ON THE UNAVAILABLE STATE: the mobile account endpoint ships as a patch in
 * `server-patches/`. Until it deploys, the destructive action reports that it
 * could not complete and says why. It does NOT delete locally and imply success
 * — a user who believes their account is gone when it is not has been lied to
 * by the screen, which is worse than the screen being unavailable.
 */

export default function SettingsScreen(): React.ReactElement {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const client = useGseClient();

  const user = useSession((s) => s.user);
  const token = useSession((s) => s.token);
  const signOut = useSession((s) => s.signOut);

  const [confirmText, setConfirmText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<"idle" | "done" | "failed" | "unavailable">("idle");
  const [detail, setDetail] = React.useState<string | null>(null);

  const expected = user?.email ?? "";
  const match = expected.length > 0 && confirmText.trim().toLowerCase() === expected.toLowerCase();

  const onDelete = async (): Promise<void> => {
    if (!match || busy) return;
    setBusy(true);
    tapWarning();
    const response = await deleteAccount({ client, token }, confirmText.trim());
    setBusy(false);

    if (response.ok) {
      setResult("done");
      await signOut();
      return;
    }
    if (response.kind === "not_found") {
      setResult("unavailable");
      setDetail(
        "The account endpoint is not deployed on the server yet, so we cannot delete the " +
          "account from here. Nothing has been changed.",
      );
      return;
    }
    setResult("failed");
    setDetail(response.message);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: t.space.s4,
          paddingTop: insets.top + t.space.s4,
          paddingBottom: insets.bottom + t.space.s10,
        }}
      >
        <Eyebrow tone="wayfind">Account</Eyebrow>
        <Spacer size="s2" />
        <Heading size="archMd">YOUR DATA</Heading>
        <Spacer size="s4" />

        <Surface>
          <Row justify="space-between" align="center">
            <View style={{ flex: 1 }}>
              <Eyebrow tone="meta">Signed in as</Eyebrow>
              <Spacer size="s1" />
              <Body size="bodySm" numberOfLines={1}>
                {user?.email ?? "Not signed in"}
              </Body>
            </View>
          </Row>
          <Spacer size="s4" />
          <Divider />
          <Spacer size="s3" />
          <Body size="bodySm" tone="muted">
            Signing out clears the session from this device&apos;s Keychain and clears the
            cached board. It does not delete anything on the server.
          </Body>
          <Spacer size="s3" />
          <Button
            label="Sign out"
            variant="secondary"
            onPress={() => {
              void signOut().then(() => router.back());
            }}
          />
        </Surface>

        {/* ── Deletion ─────────────────────────────────────────────────── */}
        <Spacer size="s6" />
        <Surface>
          <Eyebrow tone="alert">Delete account</Eyebrow>
          <Spacer size="s2" />
          <Body size="bodySm" tone="meta">
            This closes your account and removes the personal data attached to it. It cannot be
            undone.
          </Body>

          <Spacer size="s4" />
          <Eyebrow tone="meta">What is deleted</Eyebrow>
          <Spacer size="s2" />
          <Body size="bodySm" tone="muted">
            Your account, your email, your subscription link, your watchlist, your sessions.
          </Body>

          <Spacer size="s4" />
          <Eyebrow tone="meta">What is kept, and why</Eyebrow>
          <Spacer size="s2" />
          <Body size="bodySm" tone="muted">
            The published record. Those picks were published and they settled; deleting them
            would remove results from a track record that is meant to be checkable. They are
            kept without any link to you.
          </Body>

          {result === "done" ? (
            <>
              <Spacer size="s4" />
              <Divider />
              <Spacer size="s3" />
              <Body size="bodySm" tone="verify">
                Account deleted. You have been signed out.
              </Body>
            </>
          ) : (
            <>
              <Spacer size="s4" />
              <Divider />
              <Spacer size="s3" />
              {user ? (
                <>
                  <Eyebrow tone="meta">Type your email to confirm</Eyebrow>
                  <Spacer size="s2" />
                  <TextInput
                    value={confirmText}
                    onChangeText={setConfirmText}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    placeholder={expected}
                    placeholderTextColor={t.colors.fgMuted}
                    accessibilityLabel="Type your email address to confirm account deletion"
                    style={{
                      minHeight: 44,
                      borderWidth: 1,
                      borderColor: match ? t.colors.alert : t.colors.border,
                      borderRadius: t.radius.sm,
                      paddingHorizontal: t.space.s3,
                      color: t.colors.fg,
                      fontFamily: t.type.body.fontFamily,
                      fontSize: t.type.body.fontSize,
                    }}
                  />
                  <Spacer size="s3" />
                  <Button
                    label={busy ? "Deleting" : "Delete my account"}
                    variant="destructive"
                    disabled={!match || busy}
                    onPress={() => {
                      void onDelete();
                    }}
                  />
                </>
              ) : (
                <Body size="bodySm" tone="muted">
                  There is no account on this device to delete. Nothing is stored server-side
                  for a signed-out reader.
                </Body>
              )}

              {result === "failed" || result === "unavailable" ? (
                <>
                  <Spacer size="s3" />
                  <Body size="bodySm" tone="alert">
                    {detail ?? "The deletion did not complete. Your account is unchanged."}
                  </Body>
                  {result === "unavailable" ? (
                    <>
                      <Spacer size="s3" />
                      <Body size="bodySm" tone="muted">
                        You can still ask us to delete it by email, and we will treat that as
                        the same request.
                      </Body>
                      <Spacer size="s3" />
                      <Button
                        label="Open the deletion request page"
                        variant="ghost"
                        onPress={() => void Linking.openURL(`${LEGAL_URLS.privacy}`)}
                      />
                    </>
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </Surface>

        <Spacer size="s6" />
        <Surface>
          <Eyebrow tone="meta">Your rights</Eyebrow>
          <Spacer size="s2" />
          <Body size="bodySm" tone="muted">
            You can ask for a copy of your data, correct it, or have it deleted. The privacy
            policy sets out how, and what we are obliged to keep.
          </Body>
          <Spacer size="s3" />
          <Button
            label="Privacy policy"
            variant="ghost"
            onPress={() => void Linking.openURL(LEGAL_URLS.privacy)}
          />
        </Surface>

        <Spacer size="s8" />
        <Button label="Done" variant="secondary" onPress={() => router.back()} />
      </ScrollView>
    </View>
  );
}