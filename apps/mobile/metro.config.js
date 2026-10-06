const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// SVG is consumed as components (react-native-svg), never as a static asset.
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== "svg");
config.resolver.sourceExts = [...config.resolver.sourceExts, "svg"];

// Package-exports resolution keeps `exports` maps (used by expo-router,
// @tanstack/react-query v5, and expo-iap v3) authoritative.
config.resolver.unstable_enablePackageExports = true;

// Single shared copy of three libraries that blow up on duplication:
// react (hooks identity), react-native (NativeModules registry), and
// @tanstack/query-core (cache identity across the two entry points).
config.resolver.resolveRequest = (() => {
  const defaultResolve = require("metro-resolver").resolve;
  const SINGLETONS = ["react", "react-native", "react-native-reanimated", "@tanstack/query-core"];
  return (context, moduleName, platform) => {
    const isSingleton = SINGLETONS.some(
      (name) => moduleName === name || moduleName.startsWith(`${name}/`),
    );
    return defaultResolve(
      isSingleton ? { ...context, nodeModulesPaths: [__dirname + "/node_modules"] } : context,
      moduleName,
      platform,
    );
  };
})();

module.exports = config;
