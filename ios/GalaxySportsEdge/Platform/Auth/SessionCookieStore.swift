import Foundation

/// One HTTP cookie, reduced to what a request needs.
struct SessionCookie: Codable, Hashable, Sendable {
    let name: String
    let value: String

    /// Domain/path/secure attributes are deliberately not persisted: the app
    /// only ever replays these back to the same origin, and storing a cookie's
    /// scope would imply we are a general-purpose cookie jar. We are not.
    var isSecureCookie: Bool { name.hasPrefix("__Secure-") || name.hasPrefix("__Host-") }
}

/// The NextAuth session, held as the cookie set the web flow produced.
///
/// The backend authenticates with a NextAuth **session cookie**, not a bearer
/// token, so a signed-in app replays `Cookie:` on every authenticated request.
/// `SignInWebView` harvests them after the OAuth redirect; this type is the
/// only place they are stored or rendered back into a header.
struct SessionCookieStore: Sendable, Equatable {

    private static let keychainKey = "gse.auth.cookies"

    private(set) var cookies: [SessionCookie]

    init(cookies: [SessionCookie] = []) {
        self.cookies = cookies
    }

    var isEmpty: Bool { cookies.isEmpty }

    /// The NextAuth session cookie is `next-auth.session-token` in dev and
    /// `__Secure-next-auth.session-token` in production over HTTPS. Either name
    /// counts as signed in.
    var hasSessionCookie: Bool {
        cookies.contains { $0.name.hasSuffix("next-auth.session-token") }
    }

    /// `Cookie:` header value, or nil when there is nothing to send.
    var headerValue: String? {
        guard !cookies.isEmpty else { return nil }
        return cookies
            .sorted { $0.name < $1.name }
            .map { "\($0.name)=\($0.value)" }
            .joined(separator: "; ")
    }

    /// Pulls the session cookies out of a web view's cookie jar, discarding
    /// everything else in it (theme preferences, consent banners) rather than
    /// persisting a general-purpose jar we have no use for.
    static func sessionCookies(from jar: [HTTPCookie]) -> [SessionCookie] {
        jar
            .filter { $0.name.hasSuffix("next-auth.session-token") }
            .map { SessionCookie(name: $0.name, value: $0.value) }
    }

    // MARK: - Mutating

    /// Merge a fresh set, replacing same-named cookies.
    mutating func absorb(_ incoming: [SessionCookie]) {
        var byName = Dictionary(uniqueKeysWithValues: cookies.map { ($0.name, $0) })
        for cookie in incoming {
            byName[cookie.name] = cookie
        }
        cookies = byName.values.sorted { $0.name < $1.name }
    }

    mutating func clear() {
        cookies = []
    }

    // MARK: - Persistence

    func persist() {
        guard !cookies.isEmpty else {
            Keychain.delete(Self.keychainKey)
            return
        }
        guard let data = try? JSONEncoder().encode(cookies),
              let raw = String(data: data, encoding: .utf8) else { return }
        Keychain.write(Self.keychainKey, raw)
    }

    static func restore() -> SessionCookieStore {
        guard let raw = Keychain.read(keychainKey),
              let data = raw.data(using: .utf8),
              let decoded = try? JSONDecoder().decode([SessionCookie].self, from: data)
        else { return SessionCookieStore() }
        return SessionCookieStore(cookies: decoded)
    }
}
