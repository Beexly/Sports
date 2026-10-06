import * as React from "react";
import { Tabs } from "expo-router";
import { StyleSheet, Text, View, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../src/theme";
import { tapSelection } from "../../src/lib/haptics";

/**
 * The tab bar.
 *
 * WAYFINDING, NOT ACCENTS. The active tab takes IRIS (#9AA8E8) — the token
 * file is explicit: "IRIS — the wayfinding accent. Active nav, current-section
 * markers, wayfinding only. Never CTAs, never body, never data." Ember is the
 * action colour and must not appear in navigation, or the app tells the user
 * two different things about what is actionable.
 *
 * Five destinations, and the fifth is "More" rather than a sixth tab. The
 * measurement that drives the list: a tab bar beyond five items loses its
 * labels on smaller devices, and an unlabelled icon-only tab is a guess.
 *
 * The bar is deliberately opaque rather than a heavy blur. The design contract
 * permits blur only where a panel "needs to feel above the card layer", and a
 * persistent nav bar is not that — a frosted nav over a data surface is the
 * "shallow glassmorphism" the doctrine rejects.
 */

export default function TabsLayout(): React.ReactElement {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      // Haptics ride the tabPress event rather than a custom button.
      // Overriding `tabBarButton` means re-implementing React Navigation's own
      // Pressable contract, and getting its prop union wrong silently drops the
      // accessibility role from every tab.
      screenListeners={{ tabPress: () => tapSelection() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.wayfind,
        tabBarInactiveTintColor: t.colors.fgMuted,
        tabBarStyle: {
          backgroundColor: t.colors.raised,
          borderTopColor: t.colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 52 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          ...t.type.numXs,
          fontSize: 10,
          letterSpacing: 0.6,
          textTransform: "uppercase",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Board",
          tabBarAccessibilityLabel: "Board: live gate lanes and published picks",
          tabBarIcon: ({ color }) => <TabGlyph label="B" color={color} />,
        }}
      />
      <Tabs.Screen
        name="picks"
        options={{
          title: "Picks",
          tabBarAccessibilityLabel: "Picks: every published pick for the slate",
          tabBarIcon: ({ color }) => <TabGlyph label="P" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calibration"
        options={{
          title: "Calibration",
          tabBarAccessibilityLabel: "Calibration: does higher confidence win more",
          tabBarIcon: ({ color }) => <TabGlyph label="C" color={color} />,
        }}
      />
      <Tabs.Screen
        name="brief"
        options={{
          title: "Brief",
          tabBarAccessibilityLabel: "Brief: the daily brief",
          tabBarIcon: ({ color }) => <TabGlyph label="D" color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarAccessibilityLabel: "More: account, appearance, responsible play",
          tabBarIcon: ({ color }) => <TabGlyph label="M" color={color} />,
        }}
      />
    </Tabs>
  );
}

/**
 * Tab glyphs are letters, not icons.
 *
 * Reason: an icon set is a second visual language to keep on-brand, and the
 * existing brand glyph inventory is deliberately tiny (↑ ↓ − · →). A single
 * uppercase letter at the eyebrow weight reads as an index mark, matches the
 * "intel file" register the design language already uses, and cannot drift
 * into an off-brand icon.
 */
function TabGlyph({ label, color }: { label: string; color: ColorValue }): React.ReactElement {
  const t = useTheme();
  return (
    <View style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center" }}>
      <Text
        style={{
          fontFamily: t.type.eyebrow.fontFamily,
          fontSize: 13,
          fontWeight: "600",
          letterSpacing: 0.5,
          color,
        }}
      >
        {label}
      </Text>
    </View>
  );
}


