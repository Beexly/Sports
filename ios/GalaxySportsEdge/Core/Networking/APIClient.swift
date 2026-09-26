import Foundation
import Security // NOTE (Motif fix): Keychain APIs live in the Security framework.

// MARK: - Configuration

enum AppConfiguration {
    /// Set to `false` once your backend is live and `baseURL` is correct.
    static let useMockData = true

    static let baseURL = URL(string: "https://api.galaxysportsedge.com")!
    static let apiVersion = "v1"

    /// Seconds before a request times out.
    static let timeout: TimeInterval = 20
}

// MARK: - Errors

enum APIError: LocalizedError {
    case invalidURL
    case unauthorized
    case notFound
    case rateLimited
    case server(status: Int, message: String?)
    case decoding(Error)
    case transport(Error)
    case offline

    var errorDescription: String? {
        switch self {
        case .invalidURL:               "That request couldn't be built."
        case .unauthorized:             "Your session expired. Please sign in again."
        case .notFound:                 "We couldn't find what you were looking for."
        case .rateLimited:              "Too many requests — slow down a moment."
        case .server(let s, let m):     m ?? "Server error (\(s))."
        case .decoding:                 "We got an unexpected response from the server."
        case .transport(let e):         (e as NSError).localizedDescription
        case .offline:                  "You appear to be offline."
        }
    }

    var isRetryable: Bool {
        switch self {
        case .rateLimited, .server, .transport, .offline: true
        default: false
        }
    }
}

// MARK: - Endpoint

enum HTTPMethod: String { case get = "GET", post = "POST", delete = "DELETE" }

struct Endpoint {
    var path: String
    var method: HTTPMethod = .get
    var query: [String: String] = [:]
    var requiresAuth: Bool = false

    func url(base: URL) -> URL? {
        var comps = URLComponents(
            url: base.appendingPathComponent("\(AppConfiguration.apiVersion)/\(path)"),
            resolvingAgainstBaseURL: false)
        if !query.isEmpty {
            comps?.queryItems = query
                .sorted { $0.key < $1.key }
                .map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        return comps?.url
    }
}

// MARK: - Token storage

enum AuthTokenStore {
    private static let key = "gse.auth.token"

    static var token: String? {
        get { Keychain.read(key) }
        set {
            if let newValue { Keychain.write(key, newValue) }
            else { Keychain.delete(key) }
        }
    }

    static func clear() { Keychain.delete(key) }
}

enum Keychain {
    static func write(_ key: String, _ value: String) {
        let data = Data(value.utf8)
        let q: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(q as CFDictionary)
        var add = q
        add[kSecValueData as String] = data
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(add as CFDictionary, nil)
    }

    static func read(_ key: String) -> String? {
        let q: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var out: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess,
              let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func delete(_ key: String) {
        let q: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(q as CFDictionary)
    }
}

// MARK: - Client

actor APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    init() {
        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest = AppConfiguration.timeout
        cfg.waitsForConnectivity = true
        cfg.requestCachePolicy = .reloadRevalidatingCacheData
        session = URLSession(configuration: cfg)

        decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601

        encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
    }

    // MARK: Public

    func get<T: Decodable>(_ endpoint: Endpoint, as type: T.Type) async throws -> T {
        try await send(endpoint, body: Optional<Empty>.none, as: T.self)
    }

    func post<B: Encodable, T: Decodable>(_ endpoint: Endpoint,
                                          body: B,
                                          as type: T.Type) async throws -> T {
        try await send(endpoint, body: body, as: T.self)
    }

    func sendVoid<B: Encodable>(_ endpoint: Endpoint, body: B) async throws {
        _ = try await raw(endpoint, bodyData: try encoder.encode(body))
    }

    // MARK: Private

    private struct Empty: Codable {}

    private func send<B: Encodable, T: Decodable>(_ endpoint: Endpoint,
                                                  body: B?,
                                                  as _: T.Type) async throws -> T {
        let bodyData = try body.map { try encoder.encode($0) }
        let data = try await raw(endpoint, bodyData: bodyData)

        if T.self == Empty.self { return Empty() as! T }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            #if DEBUG
            print("🛰️ Decode failure for \(endpoint.path): \(error)")
            print(String(data: data, encoding: .utf8) ?? "<binary>")
            #endif
            throw APIError.decoding(error)
        }
    }

    private func raw(_ endpoint: Endpoint, bodyData: Data?) async throws -> Data {
        guard let url = endpoint.url(base: AppConfiguration.baseURL) else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("GalaxySportsEdge-iOS/1.0", forHTTPHeaderField: "User-Agent")

        if let bodyData {
            request.httpBody = bodyData
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        if endpoint.requiresAuth, let token = AuthTokenStore.token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch let urlError as URLError {
            throw urlError.code == .notConnectedToInternet ? APIError.offline
                                                           : APIError.transport(urlError)
        } catch {
            throw APIError.transport(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.transport(URLError(.badServerResponse))
        }

        switch http.statusCode {
        case 200..<300:
            return data
        case 401, 403:
            AuthTokenStore.clear()
            throw APIError.unauthorized
        case 404:
            throw APIError.notFound
        case 429:
            throw APIError.rateLimited
        default:
            let message = (try? JSONDecoder().decode(ServerError.self, from: data))?.message
            throw APIError.server(status: http.statusCode, message: message)
        }
    }

    private struct ServerError: Decodable { let message: String? }
}
