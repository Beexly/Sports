import Foundation
import XCTest
@testable import GalaxySportsEdge

/// Domain-level rules a view depends on but that are not really "view"
/// questions: tier ordering, abbreviation derivation, the paywall signal, and
/// the session cookie jar.
final class DomainTests: XCTestCase {

    // MARK: - Team abbreviations

    func testMultiWordNamesTakeInitials() {
        XCTAssertEqual(Team.abbreviation(for: "Kansas City Chiefs"), "KC")
        XCTAssertEqual(Team.abbreviation(for: "Buffalo Bills"), "BUF")
        XCTAssertEqual(Team.abbreviation(for: "New England Patriots"), "NEP")
    }

    func testASingleWordNameIsTruncatedNotEmptied() {
        // Taking the first character of each word gives "" for a one-word name,
        // which renders as a blank chip on the scoreboard.
        XCTAssertEqual(Team.abbreviation(for: "Chiefs"), "CHI")
        XCTAssertEqual(Team.abbreviation(for: "Heat"), "HEA")
    }

    func testAnAlreadyAbbreviatedNameSurvives() {
        XCTAssertEqual(Team.abbreviation(for: "KC"), "KC")
        XCTAssertEqual(Team.abbreviation(for: "nyj"), "NYJ")
    }

    // MARK: - Sport mapping

    func testBackendSportNamesMapToTheChipFilter() {
        XCTAssertEqual(Sport.matchingBackendName("NFL"), .nfl)
        XCTAssertEqual(Sport.matchingBackendName("NBA"), .nba)
        XCTAssertEqual(Sport.matchingBackendName("NCAAF"), .ncaaf)
        XCTAssertEqual(Sport.matchingBackendName("College Football"), .ncaaf)
        XCTAssertEqual(Sport.matchingBackendName("  nfl  "), .nfl)
    }

    func testAnUnknownSportDegradesInsteadOfDroppingTheRow() {
        // Mislabeling one game is better than hiding it from a scoreboard.
        XCTAssertEqual(Sport.matchingBackendName("WNBA"), .nfl)
        XCTAssertEqual(Sport.matchingBackendName(""), .nfl)
    }

    // MARK: - Grades and tiers

    func testGradeOrderingIsBestFirst() {
        XCTAssertLessThan(PickGrade.elitePlay.rank, PickGrade.strongPlay.rank)
        XCTAssertLessThan(PickGrade.strongPlay.rank, PickGrade.solidPlay.rank)
        XCTAssertLessThan(PickGrade.solidPlay.rank, PickGrade.lean.rank)
    }

    func testTierOrderingMatchesTheEntitlementTable() {
        // FREE < FANTASY < PRO < ELITE. An "is this an upgrade" check that gets
        // this order wrong shows a paywall to a subscriber.
        XCTAssertLessThan(UserProfile.Tier.free.rank, UserProfile.Tier.fantasy.rank)
        XCTAssertLessThan(UserProfile.Tier.fantasy.rank, UserProfile.Tier.pro.rank)
        XCTAssertLessThan(UserProfile.Tier.pro.rank, UserProfile.Tier.elite.rank)
        XCTAssertFalse(UserProfile.Tier.free.isPaid)
        XCTAssertTrue(UserProfile.Tier.elite.isPaid)
    }

    func testAnUnknownTierIsNotAValidTier() {
        XCTAssertNil(UserProfile.Tier(rawValue: "DIAMOND"))
        XCTAssertEqual(UserProfile.Tier(rawValue: "PRO"), .pro)
    }

    // MARK: - Pick status

    func testAnUngradedPickIsUpcomingNotGraded() {
        XCTAssertFalse(PickResult.pending.isGraded)
        XCTAssertTrue(PickResult.win.isGraded)
        XCTAssertTrue(PickResult.void.isGraded)
    }

    func testStatusFollowsTheResult() {
        XCTAssertEqual(Fixtures.makePick(result: nil).status, .upcoming)
        XCTAssertEqual(Fixtures.makePick(result: .win).status, .graded)
        XCTAssertEqual(Fixtures.makePick(result: .pending).status, .upcoming)
    }

    func testAnUngradedPickDoesNotClaimToBeGraded() {
        let pick = Fixtures.makePick(result: nil)
        XCTAssertFalse(pick.isGraded)
        XCTAssertEqual(pick.result?.label ?? "OPEN", "OPEN")
    }

    // MARK: - Gated display

    func testGatedFieldsRenderAsDashesNotZeros() {
        // A gated confidence shown as 0 is a claim that the model has no
        // opinion. A dash is a claim that you are not allowed to see it.
        let pick = Fixtures.makePick(hasBookPrice: false, confidence: nil)
        XCTAssertNil(pick.confidence)
        XCTAssertEqual(pick.displayConfidence, "—")
        XCTAssertEqual(pick.displayOdds, "—")
    }

    // MARK: - Article paywall

    func testANullBodyIsALockedArticleNotAnEmptyOne() throws {
        // `/api/blog` sends `content: null` to a FREE viewer. Decoding that as
        // an empty article renders a blank read instead of a paywall.
        let json = """
        { "success": true, "data": {
            "id": "1", "title": "The case", "slug": "the-case",
            "excerpt": "A dek.", "content": null,
            "sport": "NFL", "tags": ["Methodology"],
            "publishedAt": "2026-09-26T12:00:00.000Z", "isFeatured": false } }
        """
        let envelope = try APIClient.makeDecoder().decode(Envelope<ArticleDTO>.self, from: Data(json.utf8))
        let article = try envelope.payload().toDomain()
        XCTAssertTrue(article.isLocked)
        XCTAssertTrue(article.isPremium)
        XCTAssertEqual(article.readMinutes, 0, "a locked post has no length to measure")
        XCTAssertEqual(article.dek, "A dek.")
    }

    func testAnUnlockedArticleEstimatesItsReadTime() throws {
        let body = String(repeating: "word ", count: 660)
        let json = """
        { "success": true, "data": {
            "id": "1", "title": "The case", "slug": "the-case",
            "excerpt": "A dek.", "content": "\(body)",
            "sport": "NFL", "tags": [], "publishedAt": "2026-09-26T12:00:00.000Z",
            "isFeatured": false } }
        """
        let envelope = try APIClient.makeDecoder().decode(Envelope<ArticleDTO>.self, from: Data(json.utf8))
        let article = try envelope.payload().toDomain()
        XCTAssertFalse(article.isLocked)
        XCTAssertEqual(article.readMinutes, 3, "660 words at 220 wpm")
    }

    func testSEOFieldsFallBackToTheEditorialOnes() throws {
        // The blog route carries both. Falling back rather than blanking is
        // what makes a headline render at all.
        let json = """
        { "success": true, "data": {
            "id": "1", "title": "Editorial title", "slug": "s",
            "excerpt": "Editorial dek", "content": "Body",
            "seoTitle": "SEO title", "seoDescription": "SEO dek",
            "publishedAt": "2026-09-26T12:00:00.000Z", "isFeatured": false } }
        """
        let envelope = try APIClient.makeDecoder().decode(Envelope<ArticleDTO>.self, from: Data(json.utf8))
        let article = try envelope.payload().toDomain()
        XCTAssertEqual(article.title, "SEO title")
        XCTAssertEqual(article.dek, "SEO dek")
    }

    // MARK: - Game

    func testHomeSpreadIsTheInverseOfTheAwayLine() {
        // The model stores only the away line; the home line is its inverse.
        let game = Fixtures.game(id: "g", status: .scheduled, commence: .now)
        XCTAssertEqual(game.homeSpread ?? 0, -3.5, accuracy: 0.0001)
    }

    // MARK: - Session cookies

    func testTheNextAuthCookieIsRecognisedInBothEnvironments() {
        // Dev is `next-auth.session-token`; production over HTTPS prefixes it.
        // Recognising only one means "signed in" silently fails in production.
        let dev = SessionCookieStore(cookies: [
            SessionCookie(name: "next-auth.session-token", value: "a")
        ])
        let prod = SessionCookieStore(cookies: [
            SessionCookie(name: "__Secure-next-auth.session-token", value: "b")
        ])
        XCTAssertTrue(dev.hasSessionCookie)
        XCTAssertTrue(prod.hasSessionCookie)
    }

    func testAJarOfIrrelevantCookiesIsNotASession() {
        let store = SessionCookieStore(cookies: [
            SessionCookie(name: "theme", value: "dark"),
            SessionCookie(name: "consent", value: "yes")
        ])
        XCTAssertFalse(store.hasSessionCookie)
        XCTAssertNotNil(store.headerValue, "the jar still replays; it is just not a session")
    }

    func testHeaderIsSortedAndJoined() {
        let store = SessionCookieStore(cookies: [
            SessionCookie(name: "b-cookie", value: "2"),
            SessionCookie(name: "a-cookie", value: "1")
        ])
        XCTAssertEqual(store.headerValue, "a-cookie=1; b-cookie=2")
    }

    func testAnEmptyJarHasNoHeader() {
        // Sending `Cookie:` with an empty value is not the same as sending no
        // header, and some servers read it as a malformed credential.
        XCTAssertNil(SessionCookieStore().headerValue)
    }

    func testAbsorbingReplacesSameNamedCookies() {
        var store = SessionCookieStore(cookies: [
            SessionCookie(name: "next-auth.session-token", value: "old")
        ])
        store.absorb([SessionCookie(name: "next-auth.session-token", value: "new")])
        XCTAssertEqual(store.cookies.count, 1)
        XCTAssertTrue(store.headerValue?.contains("new") ?? false)
    }

    func testAbsorbingAddsNewNamesWithoutDroppingOldOnes() {
        var store = SessionCookieStore(cookies: [
            SessionCookie(name: "next-auth.session-token", value: "a")
        ])
        store.absorb([SessionCookie(name: "csrf-token", value: "b")])
        XCTAssertEqual(store.cookies.count, 2)
    }

    func testOnlySessionCookiesAreTakenOutOfAWebViewJar() throws {
        // The web view's cookie store also holds theme and consent cookies.
        // Persisting those would make the app a general-purpose jar it has no
        // use for.
        //
        // Built with a domain and unwrapped with XCTUnwrap rather than `!`.
        // `HTTPCookie(properties:)` returns nil for a dictionary without a
        // domain, and force-unwrapping that nil kills the entire test runner:
        // the suite then reports zero failures while xcodebuild names this one
        // test as failing, which is the least useful failure mode there is. A
        // failed unwrap says which cookie was malformed.
        func cookie(_ name: String, _ value: String) throws -> HTTPCookie {
            try XCTUnwrap(HTTPCookie(properties: [
                .name: name,
                .value: value,
                .domain: "galaxysportsedge.app",
                .path: "/"
            ]), "could not build a \(name) cookie")
        }

        let jar = [
            try cookie("next-auth.session-token", "keep"),
            try cookie("theme", "drop")
        ]
        let taken = SessionCookieStore.sessionCookies(from: jar)
        XCTAssertEqual(taken.count, 1)
        XCTAssertEqual(taken.first?.name, "next-auth.session-token")
    }

    func testCookiesRoundTripThroughDisk() {
        // An injected backend, not the keychain: CI builds unsigned, so it has
        // no entitlements and no keychain, and a test that ran against one
        // would be asserting the runner's signing configuration.
        let storage = MemoryCookieStorage()
        var store = SessionCookieStore(cookies: [
            SessionCookie(name: "next-auth.session-token", value: "abc")
        ], storage: storage)
        // Assert the write first: without it a failed write and a decoding bug
        // are indistinguishable from the outside.
        XCTAssertTrue(store.persist(), "the backend must accept the write for this to mean anything")
        let restored = SessionCookieStore.restore(from: storage)
        XCTAssertEqual(restored.cookies, store.cookies)
        XCTAssertTrue(restored.hasSessionCookie)
        store.clear()
        XCTAssertTrue(store.persist())
        XCTAssertTrue(SessionCookieStore.restore(from: storage).cookies.isEmpty)
    }

    // MARK: - Plugging in a dataset

    func testALaunchArgumentWinsOverThePlist() {
        // The whole point of the override: the same binary, pointed somewhere
        // else, with no rebuild.
        XCTAssertEqual(
            AppConfiguration.override("GSEBaseURL", in: ["app", "-GSEBaseURL", "https://data.example.com"]),
            "https://data.example.com")
    }

    func testAnEmptyPlistEntryDoesNotShadowTheDefault() {
        XCTAssertNil(AppConfiguration.override("GSEBaseURL", in: ["app"]))
    }

    func testATrailingFlagWithNoValueIsIgnored() {
        // `-GSEBaseURL` at the end of the list has no value. Reading past it
        // would swallow the next argument.
        XCTAssertNil(AppConfiguration.override("GSEBaseURL", in: ["app", "-GSEBaseURL"]))
    }

    func testTheDataSourceSwitchAcceptsWhatPeopleActuallyType() {
        for raw in ["1", "true", "TRUE", "yes", "on"] {
            XCTAssertEqual(AppConfiguration.booleanOverride("GSEUseMockData", in: ["-GSEUseMockData", raw]),
                           true, "\(raw) should read as true")
        }
        for raw in ["0", "false", "FALSE", "no", "off"] {
            XCTAssertEqual(AppConfiguration.booleanOverride("GSEUseMockData", in: ["-GSEUseMockData", raw]),
                           false, "\(raw) should read as false")
        }
        // Nonsense falls back to the product's default rather than guessing.
        XCTAssertNil(AppConfiguration.booleanOverride("GSEUseMockData", in: ["-GSEUseMockData", "maybe"]))
        XCTAssertNil(AppConfiguration.booleanOverride("GSEUseMockData", in: ["app"]))
    }

    func testADataSourceThatIsNotAnAbsoluteURLIsRejected() {
        // A typo here would otherwise be indistinguishable from an outage.
        XCTAssertNotNil(AppConfiguration.url(from: "https://data.example.com"))
        XCTAssertNotNil(AppConfiguration.url(from: "http://10.0.0.5:3000"))
        XCTAssertNil(AppConfiguration.url(from: "data.example.com"))
        XCTAssertNil(AppConfiguration.url(from: "/api"))
        XCTAssertNil(AppConfiguration.url(from: ""))
    }

    // MARK: - Sign-in callback validation

    func testOnlyOurOwnCallbackIsAccepted() {
        // Accepting an unvalidated callback URL is how a hostile app gets this
        // one to carry its cookies.
        XCTAssertTrue(OAuthEndpoints.isExpectedCallback(URL(string: "gse://auth")!))
        XCTAssertTrue(OAuthEndpoints.isExpectedCallback(URL(string: "GSE://AUTH")!))
        XCTAssertFalse(OAuthEndpoints.isExpectedCallback(URL(string: "https://evil.test/auth")!))
        XCTAssertFalse(OAuthEndpoints.isExpectedCallback(URL(string: "gse://elsewhere")!))
        XCTAssertFalse(OAuthEndpoints.isExpectedCallback(URL(string: "otherapp://auth")!))
    }

    func testTheSignInPageCarriesTheCallbackURL() throws {
        let url = try XCTUnwrap(OAuthEndpoints.signInPageURL)
        let components = try XCTUnwrap(URLComponents(url: url, resolvingAgainstBaseURL: false))
        XCTAssertTrue(url.absoluteString.contains("/api/auth/signin"))
        let callback = components.queryItems?.first { $0.name == "callbackUrl" }
        XCTAssertEqual(callback?.value, "gse://auth")
    }
}
