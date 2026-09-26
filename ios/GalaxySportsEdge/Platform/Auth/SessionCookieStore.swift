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

/// Where the cookie jar is kept.
///
/// The keychain is the only correct answer for a credential on a real device,
/// but an unsigned build — which is exactly what CI compiles and tests — has no
/// entitlements and therefore no keychain at all, so a test written against it
/// would be testing the runner's signing configuration rather than the store.
/// The protocol exists so that test can supply its own backend; nothing else
/// should ever pass one.
protocol CookieStorage: AnyObject, Sendable {
    /// Returns whether the value was actually accepted. A silently dropped
    /// credential write is indistinguishable from a sign-out.
    @discardableResult func write(_ value: String, for key: String) -> Bool
    func read(_ key: String) -> String?
    @discardableResult func delete(_ key: String) -> Bool
}

final class KeychainCookieStorage: CookieStorage, @unchecked Sendable {
    func write(_ value: String, for key: String) -> Bool { Keychain.write(key, value) }
    func read(_ key: String) -> String? { Keychain.read(key) }
    func delete(_ key: String) -> Bool { Keychain.delete(key) }
}

/// A backend that lives only as long as the test that made it.
final class MemoryCookieStorage: CookieStorage, @unchecked Sendable {
    private let lock = NSLock()
    private var items: [String: String] = [:]

    func write(_ value: String, for key: String) -> Bool {
        lock.lock(); defer { lock.unlock() }
        items[key] = value
        return true
    }

    func read(_ key: String) -> String? {
        lock.lock(); defer { lock.unlock() }
        return items[key]
    }

    func delete(_ key: String) -> Bool {
        lock.lock(); defer { lock.unlock() }
        items.removeValue(forKey: key)
        return true
    }
}

/// The NextAuth session, held as the cookie set the web flow produced.
///
/// The backend authenticates with a NextAuth **session cookie**, not a bearer
/// token, so a signed-in app replays `Cookie:` on every authenticated request.
/// `SignInWebView` harvests them after the OAuth redirect; this type is the
/// only place they are stored or rendered back into a header.
struct SessionCookieStore: Sendable, Equatable {

    private static let keychainKey = "gse.auth.cookies"

    private let storage: any CookieStorage
    private(set) var cookies: [SessionCookie]

    init(cookies: [SessionCookie] = [], storage: any CookieStorage = KeychainCookieStorage()) {
        self.cookies = cookies
        self.storage = storage
    }

    /// Compares the jar, not the backend: two stores holding the same cookies
    /// are the same session wherever they happen to be kept.
    static func == (lhs: SessionCookieStore, rhs: SessionCookieStore) -> Bool {
        lhs.cookies == rhs.cookies
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

    /// Writes the jar to the keychain, or clears it when empty.
    ///
    /// Returns whether the keychain accepted the write. The credential is the
    /// only thing this app stores here, and a write that silently fails looks
    /// exactly like a sign-out: the reader is asked to log in again with no
    /// explanation. Returning the result is what lets a test say "the keychain
    /// refused this" instead of "the cookies came back empty".
    @discardableResult
    func persist() -> Bool {
        guard !cookies.isEmpty else {
            return storage.delete(Self.keychainKey)
        }
        guard let data = try? JSONEncoder().encode(cookies),
              let raw = String(data: data, encoding: .utf8) else { return false }
        return storage.write(raw, for: Self.keychainKey)
    }

    static func restore(from storage: any CookieStorage = KeychainCookieStorage()) -> SessionCookieStore {
        guard let raw = storage.read(keychainKey),
              let data = raw.data(using: .utf8),
              let decoded = try? JSONDecoder().decode([SessionCookie].self, from: data)
        else { return SessionCookieStore(storage: storage) }
        return SessionCookieStore(cookies: decoded, storage: storage)
    }
}
