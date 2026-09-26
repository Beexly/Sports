import SwiftUI
import WebKit

/// A web sheet for the Stripe-hosted surfaces (checkout, billing portal).
///
/// `SFSafariViewController` is not used deliberately: it does not reliably
/// return a completion callback on iOS, and the billing portal needs to know
/// when the reader is done. A `WKWebView` in a sheet does.
struct BrowserSheet: View {

    let url: URL
    @Environment(\.dismiss) private var dismiss
    @State private var progress: Double = 0

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                WebView(url: url, progress: $progress)
                    .ignoresSafeArea(edges: .bottom)
                ProgressView(value: progress)
                    .progressViewStyle(.linear)
                    .tint(Theme.violet)
            }
            .navigationTitle("Checkout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .font(.system(size: 14, weight: .bold))
                        .tint(Theme.violet)
                }
            }
        }
    }
}

struct WebView: UIViewRepresentable {
    let url: URL
    @Binding var progress: Double

    func makeCoordinator() -> Coordinator { Coordinator(progress: $progress) }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        private let progress: Binding<Double>
        private var observer: NSKeyValueObservation?

        init(progress: Binding<Double>) {
            self.progress = progress
        }

        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            progress.wrappedValue = 1
        }

        func webView(_ webView: WKWebView,
                     didFail navigation: WKNavigation!,
                     withError error: Error) {
            progress.wrappedValue = 1
        }
    }
}
