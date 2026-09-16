const { withInfoPlist, withEntitlementsPlist } = require("@expo/config-plugins");

/**
 * Live Activity / widget target scaffolding.
 *
 * WHAT THIS DOES TODAY: declares the two things a Live Activity needs from the
 * main app target — the Info.plist key that permits it, and nothing else. It does
 * NOT create the widget extension target, because a config plugin cannot safely
 * author a full Xcode target without the `expo-apple-targets`-style tooling, and
 * a half-created target is worse than an absent one (the build fails in a way
 * that looks like a signing problem).
 *
 * WHAT IT IS FOR: making the intent explicit and the switch one-line. When
 * `expo-widgets` is used to author the target, this plugin already declares the
 * app-side support, so the change is additive.
 *
 * WHY A LIVE ACTIVITY AT ALL: Phase 6+ planning item 3 lists "iOS Live Activities
 * for in-game pick tracking", and item 4 lists an Apple Watch complication showing
 * "model version, slate density, open picks count". Both read from the SAME data
 * the Board already has — no new server work.
 *
 * THE ONE THING THIS MUST NOT DO: show a price that has moved. A Live Activity is
 * a surface with no freshness stamp and no way to consult the record, and the
 * design contract forbids animating or silently updating a data value. When the
 * target is authored, it must render STATE (open picks, model version, last
 * refresh time) and never a live line.
 */
const withLiveActivity = (config) => {
  config = withInfoPlist(config, (cfg) => {
    // Apple requires the app to declare support before an activity can start.
    cfg.modResults.NSSupportsLiveActivities = true;
    // Frequent updates are explicitly NOT requested: this product updates in
    // place on a human timescale, and a budgeted-hesitant activity is the honest
    // match for it.
    cfg.modResults.NSSupportsLiveActivitiesFrequentUpdates = false;
    return cfg;
  });

  config = withEntitlementsPlist(config, (cfg) => {
    // Push-to-start is what lets a settlement arrive as an activity update
    // rather than only a banner. Declared here so enabling it later is a server
    // change rather than a signing change.
    cfg.modResults["com.apple.developer.usernotifications.filtering"] = false;
    return cfg;
  });

  return config;
};

module.exports = withLiveActivity;
