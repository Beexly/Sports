import Foundation

enum HTTPMethod: String, Sendable {
    case get = "GET"
    case post = "POST"
    case patch = "PATCH"
    case delete = "DELETE"
}

/// A route on the GSE backend, relative to `/api`.
///
/// A path may opt into the `/api/v1/*` engine namespace by starting with
/// `v1/` — that is the only versioned surface (raw signals and probabilities);
/// everything else is unversioned.
struct Endpoint: Sendable, Equatable {
    var path: String
    var method: HTTPMethod = .get
    var query: [String: String] = [:]
    var requiresAuth: Bool = false

    init(path: String,
         method: HTTPMethod = .get,
         query: [String: String] = [:],
         requiresAuth: Bool = false) {
        self.path = path
        self.method = method
        self.query = query
        self.requiresAuth = requiresAuth
    }

    /// Query items are emitted in a stable (sorted) order so a request is
    /// reproducible and cacheable, and so a test can assert on the URL.
    func url(base: URL = AppConfiguration.baseURL) -> URL? {
        // A path may already carry its own query (`blog?slug=...`).
        let split = path.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false)
        let routePath = String(split.first ?? "")
        let inlineQuery = split.count > 1 ? String(split[1]) : ""

        var merged = query
        if !inlineQuery.isEmpty {
            // Let explicit `query` win over an inline duplicate.
            for pair in inlineQuery.split(separator: "&") {
                let kv = pair.split(separator: "=", maxSplits: 1)
                guard let name = kv.first, !name.isEmpty else { continue }
                let key = String(name)
                if merged[key] != nil { continue }
                merged[key] = kv.count > 1
                    ? String(kv[1]).removingPercentEncoding ?? String(kv[1])
                    : ""
            }
        }

        let url = base
            .appendingPathComponent(AppConfiguration.apiPrefix)
            .appendingPathComponent(routePath)

        guard !merged.isEmpty else { return url }
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        components?.queryItems = merged
            .sorted { $0.key < $1.key }
            .map { URLQueryItem(name: $0.key, value: $0.value) }
        return components?.url
    }
}
