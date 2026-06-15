# Build Gate Fix

## Original failure

`npm run build` failed in Codex because `next/font/google` attempted to fetch Google Fonts from the network during compile.

## Cause

`apps/web/app/layout.tsx` imported `Big_Shoulders_Display`, `Instrument_Serif`, `Inter`, `JetBrains_Mono`, and `Syne` from `next/font/google`. The environment could not fetch `fonts.googleapis.com`, so webpack failed before completing the build.

## Fix

Removed the `next/font/google` dependency and Google preconnect links from `layout.tsx`. The design-token file already defines the doctrine stacks for `--f-arch`, `--f-display`, `--f-body`, `--f-mono`, `--f-numerals`, and `--f-editorial`, so the app now uses self-contained CSS font-family stacks with system fallbacks.

## Safety

No font files were downloaded or committed. Visual parity is fallback-based, not exact self-hosted font parity. The typography intent is preserved via existing design-token stacks; exact custom-font rendering should be revisited only if permitted font assets are added.

## Final result

`npm run build` passes. It still emits an existing Sentry/OpenTelemetry dynamic require warning, but no font-network failure remains.
