# App Store submission packet — Galaxy Sports Edge for iOS

Everything in this document is copy-pasteable into App Store Connect. Where a field has a
non-obvious answer, the guideline that forces it is named, so a future reviewer can check the
answer rather than trust it.

---

## 1. Identity

| Field | Value |
|---|---|
| App name (30) | Galaxy Sports Edge |
| Subtitle (30) | Sports intelligence, auditable |
| Bundle ID | `com.galaxysportsedge.app` |
| SKU | `GSE-IOS-001` |
| Primary category | Sports |
| Secondary category | News |
| Price | Free (subscriptions via IAP) |
| Age rating | **17+** — see §4 |

**Why the subtitle is not "We're not AI. We're math you can read."**
That line is 44 characters and would be truncated to nonsense at 30. More importantly, the
positioning line is the *hypothesis*; the subtitle has to say what the product does. The line
appears in the first screenshot instead, where it has room to be read.

---

## 2. Description

```
Galaxy Sports Edge is a sports intelligence terminal. It publishes what a deterministic
factor model finds, and — the part nobody else shows you — what it passed on and why.

We're not AI. We're math you can read.

WHAT YOU GET

The board. Three lanes: what the engine is scoring right now, what it published, and what it
gated. "Gated" is not an error state. It is the product. Most days the model finds fewer than
five edges, and some days it finds none.

Every pick carries its reasoning. The factor breakdown, the market-implied probability computed
from the books' own quoted prices (arithmetic you can redo by hand), the edge estimate, the data
quality score, and when the numbers were last refreshed.

The record, published in full. Wins, losses, pushes and voids, with a calibration curve that
shows whether higher confidence actually wins more often. When it does not, the app says so on
the calibration screen.

Loss autopsies. Every losing pick gets one. The cause is named in the product's own voice, not
explained away.

WHAT IT DOES NOT DO

It does not take bets. It does not hold funds. It does not place wagers on your behalf. It does
not share revenue with a sportsbook for sending you to one. There is no "bet now" button and no
sportsbook checkout.

It is not a tout service. There is no lock of the day, no guaranteed winner, no win-rate banner
before that rate has been earned.

WHAT'S FREE

The board, the full published record, the calibration curve and the Edge Index are public and
stay public. A subscription adds the analysis behind them and the tooling that uses them.

SUBSCRIPTIONS
Pro and Elite are available as auto-renewing subscriptions. Payment is charged to your App Store
account. Manage or cancel any time in your App Store account settings.
```

**Copy rule compliance.** This description was written against
`docs/positioning.md` § "What Not To Say": no "AI-powered" or any variant, no "Mission Control",
no "unlock your", no certainty language, no competitor named. `scripts/lint-rules.js` covers the
same vocabulary in-app and the description is checked by the same list in review.

---

## 3. Keywords (100 char limit)

```
sports analytics,picks tracker,calibration,track record,closing line value,betting research
```

**Deliberately absent:** `bet`, `betting tips`, `lock`, `guaranteed`, `win rate`, `sportsbook`,
`odds bonus`. Two reasons: they attract the audience the product rejects, and several are
themselves a review risk on a 17+ app.

---

## 4. Age rating questionnaire — exact answers

| Question | Answer | Why |
|---|---|---|
| Cartoon or fantasy violence | None | — |
| Realistic violence | None | — |
| Profanity or crude humour | None | — |
| Alcohol, tobacco, drug references | None | — |
| Mature/suggestive themes | None | — |
| Horror/fear themes | None | — |
| Medical/treatment information | None | — |
| **Gambling** | **Frequent/Intense** (simulated) | The app discusses sports betting markets, references sportsbook odds, and reports on betting decisions. It does **not** offer real-money gambling. |
| Contests | None | No contests in v1. |
| Unrestricted web access | **No** | Every outbound link goes to an allow-listed URL from `src/lib/disclosures.ts`. There is no address bar and no arbitrary navigation. |
| User-generated content | None | No UGC in v1. |

**Resulting rating: 17+.** Declaring the Gambling descriptor is not optional here: the app
discusses markets and quotes odds, and the honest rating is what keeps the listing defensible.

**Why `LSApplicationQueriesSchemes` is empty in `app.json`** — the app opens no other app's
scheme. Specifically, it opens no sportsbook app and contains no deep link to one. An app that
can`canOpenURL` a sportsbook is a different review conversation, and this one deliberately is not.

---

## 5. App Privacy — "Data Not Collected"? No. Exact answers.

**The app does no cross-app or cross-site tracking. `NSPrivacyTracking` is `false` and
`NSPrivacyTrackingDomains` is empty. Because of that, the app never shows an ATT prompt — and
there is a test asserting that `expo-tracking-transparency` is not in the plugin list.**

| Data type | Collected | Linked to identity | Used for tracking | Purpose |
|---|---|---|---|---|
| Email address | Yes | Yes | **No** | App functionality — account and sign-in |
| User ID | Yes | Yes | **No** | App functionality — entitlements |
| Purchase history | Yes | Yes | **No** | App functionality — subscription state |
| Product interaction | Yes | **No** | **No** | Analytics + app functionality |
| Crash data | Yes | **No** | **No** | App functionality |
| Device ID | Yes | **No** | **No** | App functionality — push delivery |

**Deliberately absent:** precise or coarse location, contacts, photos, health, financial info,
browsing history, search history, advertising data, and any data used for third-party advertising.

**Required-reason API declarations** (in `app.json` → `ios.privacyManifests`):

| API category | Reason code | Justification |
|---|---|---|
| UserDefaults | `CA92.1` | Preferences: reading mode, sport filter, haptics. |
| File timestamp | `C617.1` | The response cache records when a payload arrived; the age is displayed on screen. |
| Disk space | `E174.1` | The cache checks available space before writing a board. |
| System boot time | `35F9.1` | Elapsed-time measurement for the freshness budget. |

---

## 6. App Review notes

```
Galaxy Sports Edge is a sports analytics and research app. It is NOT a sportsbook, and it does
not offer, enable or facilitate real-money gambling.

ACCESS FOR REVIEW

The board, the published pick record and the calibration curve are fully public and require no
account, no purchase and no promo code. Complete the age acknowledgement on first launch — it is
a statement, not a date-of-birth field, and it takes one tap — and the board loads immediately.

To exercise the subscription screens: any Pro or Elite button opens the standard StoreKit sheet
and can be cancelled without charge. The "Restore" button is present and functional.

DEMONSTRATION OF THE 3.1.1 REQUIREMENT
All digital content is unlocked through In-App Purchase. There is no external payment path
visible in a non-US storefront. In a US storefront a "purchasing outside the app" link may appear
under the subscriptions, which opens Safari; this is offered in addition to IAP, never instead
of it, and no content is gated on using it.

SIGN IN
Sign-in is optional and only two surfaces require it (watchlist and alerts). Apple sign-in is
offered alongside Google. The age gate and the board are reachable without any account.

ACCOUNT DELETION (5.1.1(v))
Settings → Delete account. The screen states what is deleted (account, email, subscription link,
watchlist, devices) and what survives the deletion (the published pick record, unlinked), before
the user confirms by typing their email address.

GAMBLING ADJACENCY (5.3 / 1.4.3)
No bet placement. No wagering. No funds held. No sportsbook affiliate revenue. No deep link to a
sportsbook app or site. The "How we make money" screen inside the app links to the same
disclosure published on the website. Responsible-play tooling (session reminders, a loss
cool-down, self-exclusion, and the National Problem Gambling Helpline at 1-800-GAMBLER) is
reachable from More → Responsible play and is present on the onboarding flow.

PRIVACY
No tracking, no third-party advertising SDKs, no ATT prompt. The privacy manifest declares no
tracking. The app stores appearance preferences and a labelled cache of the last board; both are
described in-app under More → Data and privacy.

FEEDBACK
This is our first release. If any surface is unclear, the fastest fix is a note in the review
feedback and we will ship an update rather than argue.
```

---

## 7. Screenshots

Required sizes: **6.9"** (iPhone 17 Pro Max class, 1320×2868) and **6.5"** (1242×2688). Optional
but recommended: iPad 13".

Six frames, each with one line of copy. Ordered so the first two carry the positioning:

| # | Frame | Overlay line |
|---|---|---|
| 1 | Board, showing the GATED lane prominently | "It says no more than it says yes." |
| 2 | Pick card, full anatomy | "Every pick carries its own evidence." |
| 3 | Calibration screen with the inverted verdict visible | "When it is wrong, it says so here." |
| 4 | Withheld notice | "We withhold rows we price worse than the book." |
| 5 | Honest empty state | "Some days there is nothing. We tell you that too." |
| 6 | Receipt / verify | "Every pick has a receipt you can check." |

**Frame 3 is the one that matters.** Showing the product declaring its own failure is the entire
positioning, and it is also the frame no competitor can copy without meaning it.

App preview video: 30s, per `hyperframes-cli`. Silent, captioned, no music bed that implies
urgency.

---

## 8. Export compliance

`ITSAppUsesNonExemptEncryption = false` in `app.json`.

**Justification:** the app uses HTTPS (exempt: standard encryption for data in transit) and
HMAC-SHA256 for its own session tokens. It implements no proprietary or non-standard
cryptography, and it does not provide cryptographic functionality to the user. That is the
`false` answer, and answering `true` would add a year of annual self-classification reports for
no benefit.

---

## 9. Submission commands (`asc`)

Run after an EAS build has uploaded and processed. `APP_ID` comes from
`asc apps list --output table`.

```sh
# 1. Confirm the binary is there and processed
asc builds list --app $APP_ID --output table | head -5

# 2. Stage the version: creates it, copies metadata forward, attaches the build
asc release stage \
  --app $APP_ID \
  --version "1.0.0" \
  --build $BUILD_ID \
  --copy-metadata-from "" \
  --confirm

# 3. Push the metadata (first release: fill each field)
asc localizations update \
  --version $VERSION_ID \
  --locale "en-US" \
  --description "$(cat docs/store/description.txt)" \
  --keywords "sports analytics,picks tracker,calibration,track record,closing line value,betting research" \
  --support-url "https://www.galaxysportsedge.com/contact" \
  --whats-new "First release."

# 4. Validate before submitting — this catches the missing-icons and
#    missing-privacy-policy class of rejection before a human sees it
asc validate --app $APP_ID --version "1.0.0"

# 5. TestFlight first. Always TestFlight first.
asc publish testflight \
  --app $APP_ID \
  --build $BUILD_ID \
  --group "$BETA_GROUP_ID" \
  --test-notes "First build. Exercise the board, the pick detail, and the account-deletion flow." \
  --locale "en-US" \
  --submit --confirm

# 6. Only then, review
asc review submit --app $APP_ID --version "1.0.0" --build $BUILD_ID --confirm
```

**Auth is not set up on this host.** The `asc` CLI is installed, but no App Store Connect API key
exists here and one cannot be created autonomously — it is bound to the owner's Apple account.
See `asc-cli` skill § Auth Setup and produce a key at
App Store Connect → Users and Access → Integrations → API Keys (App Manager role is sufficient
for everything above).

---

## 10. Likely rejection risks, and what is already done about each

| Risk | Guideline | Mitigation already in the build |
|---|---|---|
| "Repackaged website" | 4.2 | Native navigation, haptics, offline cache with a labelled age, Live Activity scaffold, push. Not a WebView. |
| Selling digital content outside IAP | 3.1.1 | StoreKit is the only in-app path; the US external link is additive and storefront-gated. |
| No Sign in with Apple | 4.8 | `usesAppleSignIn: true`, Apple offered alongside Google. |
| No in-app account deletion | 5.1.1(v) | `app/settings.tsx`, typed-email confirmation, server route in `server-patches/`. |
| Gambling without licensing | 5.3 | No wagering, no funds, no affiliate revenue share, no sportsbook deep link. |
| Missing privacy manifest | 5.1.2 | `ios.privacyManifests` in `app.json`, with the four required-reason APIs declared. |
| Placeholder metadata | 2.3 | Every field in this document is final copy, not lorem. |
| Broken demo path | 2.1 | The reviewer path in §6 is a real, unauthenticated path to every screen. |
