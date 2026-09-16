# Design review harness

**What this is.** A single-file HTML mirror of the app's screens, built from the
same FIELD tokens, so the UI can be *looked at* on a host that has no iOS
simulator.

**What this is not.** It is not the app. It is a review instrument. It cannot
verify React Native behaviour, gestures, haptics, navigation, or anything
native. It exists because "we reviewed the code" and "we looked at the screen"
are different claims, and only one of them catches a card whose metadata row
collides at 393pt.

**How to use it.**

```sh
open preview/screens.html          # or navigate to minis://workspace/gse-ios/preview/screens.html
```

**Drift policy.** The harness duplicates component markup, which is the thing
this codebase spends effort avoiding elsewhere. It is accepted here for one
reason: there is no way to render React Native on this host, and a harness that
drifts is still more useful than no visual check at all — *provided the drift is
visible*. So each frame states which source file it mirrors, and the audit
ledger records that the harness is a mirror rather than a build target.

**What to look for when reviewing a frame.**

1. Does anything collide at 393pt? (the narrowest supported iPhone)
2. Is the freshness stamp present on every frame that shows data? (rule 5)
3. Does any colour appear alone, with no glyph or label carrying the meaning?
4. Is the ember accent on an action, and *only* on an action?
5. Does the empty state read as deliberate rather than broken?
