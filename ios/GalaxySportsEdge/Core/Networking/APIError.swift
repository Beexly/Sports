import Foundation

/// Every failure the app can surface to a person.
///
/// `retryable` is the single source of truth for whether `APIClient` should
/// re-issue a request: a 404 or a decoding bug will fail identically forever,
/// while a 429 or a dropped socket will not.
enum APIError: LocalizedError, Sendable {
    case invalidURL
    case unauthorized
    case notFound
    case rateLimited(retryAfter: TimeInterval?)
    case server(status: Int, message: String?)
    case decoding(String)
    case transport(String)
    case offline
    case gated(reason: String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            "That request couldn't be built."
        case .unauthorized:
            "Your session expired. Please sign in again."
        case .notFound:
            "We couldn't find what you were looking for."
        case .rateLimited:
            "Too many requests — slow down a moment."
        case .server(let status, let message):
            message ?? "Server error (\(status))."
        case .decoding:
            "We got an unexpected response from the server."
        case .transport(let description):
            description
        case .offline:
            "You appear to be offline."
        case .gated(let reason):
            reason
        }
    }

    /// True when re-issuing the same request could plausibly succeed.
    var isRetryable: Bool {
        switch self {
        case .rateLimited, .server, .transport, .offline: true
        case .invalidURL, .unauthorized, .notFound, .decoding, .gated: false
        }
    }

    /// The backend uses a handful of distinct 503 bodies to mean "the engine
    /// is not ready yet" rather than "broken". Those are honest, expected
    /// states on a cold start, not failures worth a red error screen — the UI
    /// shows a "still collecting" state instead.
    var isGated: Bool {
        if case .gated = self { return true }
        return false
    }

    /// `isRetryable` is what the client acts on; a gated surface is retryable
    /// by the engine but should not be retried in a tight loop by the app.
    var shouldAutoRetry: Bool { isRetryable && !isGated }
}

/// Wraps an error that did not originate in `APIClient` so the UI can still
/// classify it.
extension APIError {
    static func wrapping(_ error: Error) -> APIError {
        if let apiError = error as? APIError { return apiError }
        let urlError = error as? URLError
        if urlError?.code == .notConnectedToInternet { return .offline }
        if urlError?.code == .timedOut { return .transport("The request timed out.") }
        return .transport(error.localizedDescription)
    }
}
