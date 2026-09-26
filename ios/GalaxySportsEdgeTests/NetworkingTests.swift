import Foundation
import XCTest
@testable import GalaxySportsEdge

/// Networking primitives: URL construction, envelope mapping and error
/// classification.
final class NetworkingTests: XCTestCase {

    private let base = URL(string: "https://example.test")!

    // MARK: - Endpoint

    func testEndpointJoinsTheApiPrefix() throws {
        let url = try XCTUnwrap(Endpoint(path: "picks").url(base: base))
        XCTAssertEqual(url.absoluteString, "https://example.test/api/picks")
    }

    func testEndpointNestsPaths() throws {
        let url = try XCTUnwrap(Endpoint(path: "picks/abc/explain").url(base: base))
        XCTAssertEqual(url.absoluteString, "https://example.test/api/picks/abc/explain")
    }

    func testEndpointCanOptIntoTheV1Namespace() throws {
        // The raw engine signals live under /api/v1/*, which is the one
        // versioned surface. A path starting "v1/" is where that is expressed.
        let url = try XCTUnwrap(Endpoint(path: AppConfiguration.Route.signals).url(base: base))
        XCTAssertEqual(url.absoluteString, "https://example.test/api/v1/signals")
    }

    func testQueryItemsAreSortedForReproducibleRequests() throws {
        let endpoint = Endpoint(path: "picks", query: ["sport": "nfl", "date": "2026-09-27"])
        let url = try XCTUnwrap(endpoint.url(base: base))
        // Sorted, so a cache key and a test assertion are both stable.
        XCTAssertEqual(url.absoluteString,
                       "https://example.test/api/picks?date=2026-09-27&sport=nfl")
    }

    func testInlineQueryIsMergedAndExplicitQueryWins() throws {
        // The blog route keys detail on `slug` in the query while the list
        // route uses a path. Both must produce the same URL shape.
        let endpoint = Endpoint(path: "blog?slug=how-we-grade", query: ["page": "2"])
        let url = try XCTUnwrap(endpoint.url(base: base))
        XCTAssertEqual(url.absoluteString,
                       "https://example.test/api/blog?page=2&slug=how-we-grade")
    }

    func testAnExplicitQueryOverridesAnInlineDuplicate() throws {
        let endpoint = Endpoint(path: "blog?slug=old", query: ["slug": "new"])
        let url = try XCTUnwrap(endpoint.url(base: base))
        XCTAssertTrue(url.absoluteString.contains("slug=new"))
        XCTAssertFalse(url.absoluteString.contains("old"))
    }

    func testTwoEndpointsWithTheSameInputsAreEqual() {
        // A cache or dedupe keyed on Endpoint must treat these as one request.
        let a = Endpoint(path: "picks", method: .post, query: ["a": "1"], requiresAuth: true)
        let b = Endpoint(path: "picks", method: .post, query: ["a": "1"], requiresAuth: true)
        XCTAssertEqual(a, b)
        XCTAssertNotEqual(a, Endpoint(path: "picks", method: .get, query: ["a": "1"]))
    }

    // MARK: - Error classification

    func testOnlyTransientErrorsAreRetryable() {
        // The retry list is the difference between a flaky network recovering
        // silently and a 404 hammering the server three times for nothing.
        XCTAssertTrue(APIError.offline.isRetryable)
        XCTAssertTrue(APIError.rateLimited(retryAfter: 30).isRetryable)
        XCTAssertTrue(APIError.server(status: 500, message: nil).isRetryable)
        XCTAssertTrue(APIError.transport("dropped").isRetryable)

        XCTAssertFalse(APIError.notFound.isRetryable)
        XCTAssertFalse(APIError.unauthorized.isRetryable)
        XCTAssertFalse(APIError.decoding("bad").isRetryable)
        XCTAssertFalse(APIError.invalidURL.isRetryable)
    }

    func testAGatedEngineIsNotAutoRetried() {
        // 503 "still collecting" is an expected state, not a fault. Retrying it
        // in a loop turns a warm-up into a denial-of-service against yourself.
        let gated = APIError.gated(reason: "Engine is still collecting.")
        XCTAssertTrue(gated.isGated)
        XCTAssertFalse(gated.shouldAutoRetry)
    }

    func testEveryErrorHasSomethingToShowTheReader() {
        // A nil errorDescription renders as an empty red box.
        let errors: [APIError] = [
            .invalidURL, .unauthorized, .notFound, .rateLimited(retryAfter: nil),
            .server(status: 500, message: nil), .server(status: 400, message: "Bad input"),
            .decoding("x"), .transport("x"), .offline, .gated(reason: "Collecting")
        ]
        for error in errors {
            XCTAssertNotNil(error.errorDescription, "\(error)")
            XCTAssertFalse((error.errorDescription ?? "").isEmpty)
        }
    }

    func testServerErrorPrefersTheServerMessage() {
        XCTAssertEqual(APIError.server(status: 500, message: "Upstream timeout").errorDescription,
                       "Upstream timeout")
        XCTAssertEqual(APIError.server(status: 500, message: nil).errorDescription,
                       "Server error (500).")
    }

    func testWrappingClassifiesURLFailures() {
        let offline = NSError(domain: NSURLErrorDomain, code: NSURLErrorNotConnectedToInternet)
        XCTAssertEqual(APIError.wrapping(offline), .offline)

        let timeout = NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut)
        if case .transport = APIError.wrapping(timeout) {} else {
            XCTFail("a timeout should be a transport error, not de-authentication")
        }
    }

    func testWrappingPassesAnAPIErrorThroughUnchanged() {
        let original = APIError.notFound
        XCTAssertEqual(APIError.wrapping(original), original)
    }

    // MARK: - Envelope meta

    func testMetaMappingReadsTheEntitlementFacts() throws {
        let json = """
        { "tier": "ELITE", "total": 6, "totalAvailableToday": 6,
          "hitDailyLimit": false, "date": "2026-09-27",
          "canSeeConfidence": true, "canSeeFactorBreakdown": true,
          "containsSeedData": false }
        """
        let envelope = try JSONDecoder().decode(Envelope<[PickDTO]>.self, from: Data(json.utf8))
        let meta = try XCTUnwrap(envelope.meta).toSlateMeta()
        XCTAssertEqual(meta.tier, .elite)
        XCTAssertEqual(meta.total, 6)
        XCTAssertEqual(meta.withheldCount, 0)
        XCTAssertTrue(meta.canSeeConfidence)
        XCTAssertFalse(meta.containsSeedData)
    }

    func testAbsentMetaBecomesTheConservativeDefault() throws {
        // No meta at all must mean "no entitlements assumed", not "everything
        // allowed". Assuming access is how a paywall renders itself open.
        let json = #"{ "success": true, "data": [] }"#
        let envelope = try JSONDecoder().decode(Envelope<[PickDTO]>.self, from: Data(json.utf8))
        XCTAssertNil(envelope.meta)
        let meta = SlateMeta()
        XCTAssertEqual(meta.tier, .free)
        XCTAssertFalse(meta.canSeeConfidence)
        XCTAssertFalse(meta.canSeeFactorBreakdown)
    }

    func testAnUnknownTierFallsBackToFree() throws {
        // An unrecognised tier must never sort above a known paid one.
        let json = #"{ "tier": "DIAMOND", "total": 1 }"#
        let envelope = try JSONDecoder().decode(Envelope<[PickDTO]>.self, from: Data(json.utf8))
        XCTAssertEqual(try XCTUnwrap(envelope.meta).toSlateMeta().tier, .free)
    }
}
