/**
 * Babel configuration — Expo SDK 57 / RN 0.86 / React 19.
 *
 * Notes that matter:
 *  - `react-native-worklets/plugin` must be LAST. It is the Reanimated 4
 *    worklets compiler hook; an earlier position silently drops worklet
 *    transforms and animations fail at RUNTIME rather than at build time.
 *  - The React Compiler is enabled here AND in app.json (`experiments`).
 *    Both must agree or the prebuild/bundle paths diverge.
 *  - Path aliases (`@/`, `@app/`, `@assets/`) are resolved by Metro from
 *    tsconfig `paths` (Expo SDK 50+ `experiments.tsconfigPaths`, on by
 *    default). No babel module-resolver is used — two resolvers for one
 *    alias map is how aliases drift between the bundler and the typechecker.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "react", reactCompiler: true }],
    ],
    plugins: ["react-native-worklets/plugin"],
  };
};
