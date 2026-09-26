import Foundation
import SwiftUI
import WebKit

/// The NextAuth sign-in surface, hosted in a `WKWebView`.
///
/// Why a web view rather than a native OAuth client: the backend is NextAuth
/// with a Google provider and a Prisma adapter. There is no native token
/// endpoint to call, and minting a second auth path would be a new security
/// surface to own. The web flow is what the product already ships, and Sign in
/// with Google comes with it.
///
/// Why a `WKWebView` rather than `ASWebAuthenticationSession`: the credential
/// is an HTTP-only `next-auth.session-token` **cookie**, and there is no stable
/// public API for reading a cookie back out of a system authentication
/// session. A web view shares `WKWebsiteDataStore.default()`, whose cookie
/// store *is* stable public API, so the redirect can hand the app a
/// credential it can actually replay.
///
/// The web view is destroyed on completion and never persists; the only thing
/// that outlives it is the cookie set, which lives in the keychain.
struct SignInWebView: UIViewRepresentable {

    /// Called with the cookies NextAuth set, or nil if the reader backed out
    /// or the flow failed.
    let onFinish: ([HTTPCookie]?) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onFinish: onFinish)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator

        if let url = OAuthEndpoints.signInPageURL {
            webView.load(URLRequest(url: url))
        } else {
            context.coordinator.finish(with: nil)
        }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {

        private let onFinish: ([HTTPCookie]?) -> Void
        /// Guards against double-resume: a failing navigation can fire the
        /// delegate more than once, and a second resume on a continuation traps.
        private var settled = false

        init(onFinish: @escaping ([HTTPCookie]?) -> Void) {
            self.onFinish = onFinish
        }

        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            // The redirect back into the app is a custom scheme the web view
            // cannot load. Intercept it, refuse the navigation, and read the
            // cookies the flow just set.
            if OAuthEndpoints.isExpectedCallback(url) {
                decisionHandler(.cancel)
                harvest(from: webView)
            } else {
                decisionHandler(.allow)
            }
        }

        func webView(_ webView: WKWebView,
                     didFail navigation: WKNavigation!,
                     withError error: Error) {
            finish(with: nil)
        }

        func webView(_ webView: WKWebView,
                     didFailProvisionalNavigation navigation: WKNavigation!,
                     withError error: Error) {
            finish(with: nil)
        }

        private func harvest(from webView: WKWebView) {
            guard !settled else { return }
            settled = true
            webView.configuration.websiteDataStore.httpCookieStore.getAllCookies { [weak self] cookies in
                Task { @MainActor in
                    self?.onFinish(cookies)
                }
            }
        }

        private func finish(with cookies: [HTTPCookie]?) {
            guard !settled else { return }
            settled = true
            onFinish(cookies)
        }
    }
}

/// The sign-in contract, in one place so the web view, the session and any test
/// all agree on it.
enum OAuthEndpoints {

    /// Must match `CFBundleURLTypes` in Info.plist and the trusted-callback
    /// list configured on the NextAuth app.
    static let callbackScheme = "gse"
    static let callbackHost = "auth"

    static var callbackURL: URL {
        // Force-unwrappable: both components are compile-time literals, and a
        // crashing optional here would be a bug in this file, not the network.
        URL(string: "\(callbackScheme)://\(callbackHost)")!
    }

    /// NextAuth's sign-in *page*. Navigating directly at a provider path
    /// (`/api/auth/signin/google`) skips the CSRF handshake the web flow
    /// relies on and lands on an error page, so the page is the honest entry
    /// point for a native client.
    static var signInPageURL: URL? {
        var components = URLComponents(
            url: AppConfiguration.webOrigin.appendingPathComponent("api/auth/signin"),
            resolvingAgainstBaseURL: false)
        components?.queryItems = [URLQueryItem(name: "callbackUrl", value: callbackURL.absoluteString)]
        return components?.url
    }

    /// The redirect must be ours and nothing else — accepting an unvalidated
    /// callback URL is how a hostile app gets this one to carry its cookies.
    static func isExpectedCallback(_ url: URL) -> Bool {
        url.scheme?.lowercased() == callbackScheme.lowercased()
            && url.host?.lowercased() == callbackHost.lowercased()
    }
}
