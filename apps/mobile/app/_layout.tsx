import * as React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { useFonts } from "expo-font";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppProviders } from "../src/providers/AppProviders";
import { useTheme } from "../src/theme";
import { useNotificationRouter } from "../src/hooks/useNotificationRouter";

/**
 * Root layout.
 *
 * Two things here are load-bearing and easy to get wrong:
 *
 * 1. **Splash is held until fonts resolve.** The design contract puts one
 *    family behind every figure and caption, and Law 1 explicitly says a figure
 *    and its sample size must render at the same optical size. Revealing the
 *    app before the family loads guarantees one frame of system-font figures,
 *    which on a calibration curve is the exact failure the Law names.
 *
 *    The hold is BOUNDED (`MAX_FONT_HOLD_MS`). A font that fails to load must
 *    not become a black screen; the app proceeds on the system stack, which the
 *    token file names as its own fallback.
 *
 * 2. **Notification routing happens at the root, not in a screen.** A push
 *    arrives whether or not a screen is mounted, and a deep link handled inside
 *    a tab would be lost if the user was elsewhere.
 */

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden (a fast reload), or the platform does not support it.
});

const MAX_FONT_HOLD_MS = 1200;

/**
 * Notification presentation while the app is foregrounded.
 *
 * Settlements and line-movement alerts are the only two notification classes
 * the server sends, and both are worth an interruption when the user is
 * already looking at the app — a settlement they are waiting on is the whole
 * reason they opened it. Anything that is not one of those two is suppressed.
 */
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const kind = String(notification.request.content.data?.["kind"] ?? "");
    const worthwhile = kind === "settlement" || kind === "line_movement";
    return {
      shouldShowBanner: worthwhile,
      shouldShowList: worthwhile,
      shouldPlaySound: false,
      shouldSetBadge: false,
    };
  },
});

export default function RootLayout(): React.ReactElement | null {
  const [fontsLoaded, fontError] = useFonts(FONT_MAP);
  const [holdExpired, setHoldExpired] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setHoldExpired(true), MAX_FONT_HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (fontsLoaded || fontError || holdExpired) {
      SplashScreen.hideAsync().catch(() => {
        // Nothing to do: the splash hides itself on the next frame.
      });
    }
  }, [fontsLoaded, fontError, holdExpired]);

  if (!fontsLoaded && !fontError && !holdExpired) {
    // The splash is still up; render nothing rather than a flash of unstyled
    // content under it.
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppProviders>
        <ThemedNavigation />
      </AppProviders>
    </SafeAreaProvider>
  );
}

function ThemedNavigation(): React.ReactElement {
  const t = useTheme();
  useNotificationRouter();

  return (
    <View style={[styles.root, { backgroundColor: t.colors.bg }]}>
      <StatusBar style={t.isPaper ? "dark" : "light"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.colors.bg },
          // Page transitions are fade-only in this design language: "Never
          // translate the entire page."
          animation: "fade",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="pick/[id]"
          options={{
            // The pick detail is the one surface that earns a slide, because
            // it is a drill-in with a back gesture, not a page change.
            animation: "slide_from_right",
            presentation: "card",
          }}
        />
        <Stack.Screen name="onboarding" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="paywall" options={{ animation: "slide_from_bottom", presentation: "modal" }} />
        <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
        <Stack.Screen
          name="responsible-play"
          options={{ animation: "slide_from_bottom", presentation: "modal" }}
        />
      </Stack>
    </View>
  );
}

/**
 * The font map.
 *
 * The token stack names exactly two families:
 *   Inter            → body, numerals, mono, display
 *   Barlow Condensed → arch headlines and the monogram
 *
 * If the files are absent the app falls back to the system stack, which the
 * token file declares as its own terminal fallback. It does NOT silently
 * substitute a third family.
 */
const FONT_MAP = {
  Inter: require("../assets/fonts/Inter-Regular.ttf"),
  "Inter-Medium": require("../assets/fonts/Inter-Medium.ttf"),
  "Inter-SemiBold": require("../assets/fonts/Inter-SemiBold.ttf"),
  "Inter-Bold": require("../assets/fonts/Inter-Bold.ttf"),
  "BarlowCondensed-ExtraBold": require("../assets/fonts/BarlowCondensed-ExtraBold.ttf"),
  "BarlowCondensed-Black": require("../assets/fonts/BarlowCondensed-Black.ttf"),
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});