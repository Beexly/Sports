import Foundation

/// The app's single HTTP door.
///
/// An actor because it owns mutable state (the replayed session cookies) and
/// is reached from every screen. Responsibilities kept deliberately narrow:
/// build the request, attach credentials, retry what is worth retrying, and
/// turn a non-2xx into a typed `APIError`. It knows nothing about picks or
/// games — that is `LiveSportsService`'s job.
actor APIClient {

    static let shared = APIClient()

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    private var cookies: SessionCookieStore

    /// Test seam: a stubbed protocol lets tests assert on requests without a
    /// network. `APIClient` is a concrete type, so the seam is a closure.
    private let transportOverride: (@Sendable (URLRequest) async throws -> (Data, URLResponse))?

    init(cookies: SessionCookieStore = SessionCookieStore(),
         transport: (@Sendable (URLRequest) async throws -> (Data, URLResponse))? = nil) {
        self.cookies = cookies
        self.transportOverride = transport

        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = AppConfiguration.timeout
        configuration.timeoutIntervalForResource = AppConfiguration.timeout * 2
        configuration.waitsForConnectivity = true
        configuration.requestCachePolicy = .reloadRevalidatingCacheData
        session = URLSession(configuration: configuration)

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601
        self.decoder = decoder

        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601
        self.encoder = encoder
    }

    // MARK: - Session cookies

    func adopt(cookies incoming: [SessionCookie]) {
        cookies.absorb(incoming)
        cookies.persist()
    }

    func currentCookies() -> [SessionCookie] { cookies.cookies }

    func clearSession() {
        cookies.clear()
        cookies.persist()
    }

    var isSignedIn: Bool { cookies.hasSessionCookie }

    // MARK: - Requests

    func get<T: Decodable>(_ endpoint: Endpoint, as type: T.Type) async throws -> T {
        try await send(endpoint, body: Optional<NoPayload>.none, as: T.self)
    }

    func getEnvelope<T: Decodable>(_ endpoint: Endpoint,
                                   as type: T.Type) async throws -> Envelope<T> {
        try await send(endpoint, body: Optional<NoPayload>.none, as: Envelope<T>.self)
    }

    func post<B: Encodable, T: Decodable>(_ endpoint: Endpoint,
                                          body: B,
                                          as type: T.Type) async throws -> T {
        try await send(endpoint, body: body, as: T.self)
    }

    func postVoid<B: Encodable>(_ endpoint: Endpoint, body: B) async throws {
        _ = try await raw(endpoint, bodyData: try encoder.encode(body))
    }

    /// DELETE. Used by account deletion, which must report a real 200/204
    /// rather than pretending a 404 meant the account was already gone.
    @discardableResult
    func delete<T: Decodable>(_ endpoint: Endpoint, as type: T.Type) async throws -> T {
        try await send(endpoint, body: Optional<NoPayload>.none, as: T.self)
    }

    /// DELETE that expects no body back.
    func deleteVoid(_ endpoint: Endpoint) async throws {
        _ = try await raw(endpoint, bodyData: nil)
    }

    // MARK: - Internals

    private struct NoPayload: Encodable {}

    private func send<B: Encodable, T: Decodable>(_ endpoint: Endpoint,
                                                  body: B?,
                                                  as _: T.Type) async throws -> T {
        let bodyData: Data?
        if let body {
            bodyData = try encoder.encode(body)
        } else {
            bodyData = nil
        }
        let data = try await raw(endpoint, bodyData: bodyData)
        guard !data.isEmpty else {
            // A 204/empty body decoded as `NoBody` succeeds; anything else
            // asked for a payload the server did not send.
            if T.self == NoBody.self { return NoBody() as! T }
            throw APIError.decoding("empty response body")
        }
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            #if DEBUG
            print("🛰️ decode failure for \(endpoint.method.rawValue) \(endpoint.path): \(error)")
            if let text = String(data: data, encoding: .utf8) {
                print(String(text.prefix(600)))
            }
            #endif
            throw APIError.decoding(String(describing: error))
        }
    }

    /// Issues the request, retrying only what `APIError.isRetryable` allows.
    private func raw(_ endpoint: Endpoint, bodyData: Data?) async throws -> Data {
        var attempt = 0
        var delay = AppConfiguration.retryBaseDelay

        while true {
            do {
                return try await perform(endpoint, bodyData: bodyData)
            } catch let error as APIError where error.shouldAutoRetry && attempt < AppConfiguration.maxRetries {
                attempt += 1
                try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                delay *= 2
            }
        }
    }

    private func perform(_ endpoint: Endpoint, bodyData: Data?) async throws -> Data {
        guard let url = endpoint.url() else { throw APIError.invalidURL }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("GalaxySportsEdge-iOS/1.0", forHTTPHeaderField: "User-Agent")

        if let bodyData {
            request.httpBody = bodyData
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        if endpoint.requiresAuth, let header = cookies.headerValue {
            request.setValue(header, forHTTPHeaderField: "Cookie")
        }

        let data: Data
        let response: URLResponse
        do {
            if let transportOverride {
                (data, response) = try await transportOverride(request)
            } else {
                (data, response) = try await session.data(for: request)
            }
        } catch let urlError as URLError {
            throw urlError.code == .notConnectedToInternet
                ? APIError.offline
                : APIError.transport(urlError.localizedDescription)
        } catch {
            throw APIError.transport(error.localizedDescription)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.transport("Malformed response.")
        }

        switch http.statusCode {
        case 200..<300:
            return data

        case 401, 403:
            clearSession()
            throw APIError.unauthorized

        case 404:
            throw APIError.notFound

        case 429:
            let retryAfter = (http.value(forHTTPHeaderField: "Retry-After")).flatMap(TimeInterval.init)
            throw APIError.rateLimited(retryAfter: retryAfter)

        case 503:
            // The engine answers 503 for "still collecting" and for the
            // stale-data kill switch. Both are honest states, not bugs, and
            // both carry a reason string — surface that instead of a red
            // "server error".
            let reason = Self.serverMessage(in: data)
                ?? "The engine is still collecting data for this slate. Try again shortly."
            throw APIError.gated(reason: reason)

        default:
            throw APIError.server(status: http.statusCode, message: Self.serverMessage(in: data))
        }
    }

    private static func serverMessage(in data: Data) -> String? {
        guard !data.isEmpty else { return nil }
        struct Failure: Decodable { let error: String?; let message: String? }
        let failure = try? JSONDecoder().decode(Failure.self, from: data)
        return failure?.error ?? failure?.message
    }
}
