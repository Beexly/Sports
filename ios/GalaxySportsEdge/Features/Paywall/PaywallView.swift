import SwiftUI
import StoreKit

/// The paywall.
///
/// Billing is Stripe-hosted checkout today, so the purchase button opens
/// `checkout.stripe.com` in a web sheet. That is the *working* path, and it is
/// the one the button uses.
///
/// The StoreKit 2 path is implemented in `SubscriptionStore` but gated behind
/// `AppConfiguration.usesAppStoreIAP`, which is `false` until the products
/// exist in App Store Connect and the server can redeem a signed transaction.
/// The screen says which mode it is in rather than rendering a StoreKit
/// button that would fail.
struct PaywallView: View {

    @Environment(AppEnvironment.self) private var env
    @Environment(\.dismiss) private var dismiss

    @State private var interval: BillingInterval = .month
    @State private var isWorking = false
    @State private var browserURL: URL?
    @State private var showBrowser = false

    private let tiers: [UserProfile.Tier] = [.pro, .elite]

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()
                content
            }
            .navigationTitle("Plans")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                        .font(.system(size: 14, weight: .medium))
                        .tint(Theme.text2)
                }
            }
            .sheet(isPresented: $showBrowser) {
                if let browserURL { BrowserSheet(url: browserURL) }
            }
        }
        .task { await env.subscription.load() }
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: Theme.S.xl) {
                header

                Picker("Interval", selection: $interval) {
                    ForEach(BillingInterval.allCases) { option in
                        Text(option.display).tag(option)
                    }
                }
                .pickerStyle(.segmented)

                ForEach(tiers, id: \.self) { tier in
                    tierCard(tier)
                }

                purchaseButton
                storeKitNotice
                legal
            }
            .padding(Theme.S.lg)
            .padding(.bottom, Theme.S.xxl)
        }
    }

    private var header: some View {
        VStack(spacing: Theme.S.sm) {
            Image(systemName: "sparkles")
                .font(.system(size: 34, weight: .ultraLight))
                .foregroundStyle(Theme.violet)
            Text("Every number, explained")
                .font(.display(24, .heavy))
                .foregroundStyle(Theme.text)
            Text("Confidence, the factor trail, line movement, and the ask-the-model box — on every pick.")
                .font(.system(size: 14))
                .foregroundStyle(Theme.text2)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func tierCard(_ tier: UserProfile.Tier) -> some View {
        let isCurrent = env.auth.tier == tier
        return VStack(alignment: .leading, spacing: Theme.S.md) {
            HStack {
                Text(tier.label)
                    .font(.display(19, .heavy))
                    .foregroundStyle(Theme.text)
                Spacer()
                if isCurrent {
                    Pill(text: "Current", tint: Theme.win, filled: true)
                }
            }
            bulletList(tier)
        }
        .card(fill: isCurrent ? Theme.surfaceHi : Theme.surface)
        .opacity(isCurrent ? 0.8 : 1)
    }

    private func bulletList(_ tier: UserProfile.Tier) -> some View {
        VStack(alignment: .leading, spacing: Theme.S.sm) {
            bullet("Confidence on every pick")
            bullet("The full factor trail, signed and itemised")
            bullet("Opening → current line movement")
            if tier == .elite {
                bullet("Ask the model about any pick")
                bullet("Real-time alerts on teams you follow")
            } else {
                bullet("Weekly graded record")
            }
        }
    }

    private func bullet(_ text: String) -> some View {
        HStack(spacing: Theme.S.sm) {
            Image(systemName: "checkmark")
                .font(.system(size: 10, weight: .black))
                .foregroundStyle(Theme.win)
            Text(text)
                .font(.system(size: 13))
                .foregroundStyle(Theme.text2)
            Spacer(minLength: 0)
        }
    }

    @ViewBuilder
    private var purchaseButton: some View {
        switch env.subscription.state {
        case .purchasing:
            ProgressView().tint(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(Capsule().fill(Theme.violet.opacity(0.5)))

        case .available:
            // StoreKit is configured and the products loaded. Purchase through
            // StoreKit, which is the correct channel for App Store IAP.
            if let product = env.subscription.products.first {
                Button {
                    Task { await env.subscription.purchase(product) }
                } label: {
                    Text("Subscribe · \(product.displayPrice)")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                        .background(Capsule().fill(Theme.nebula))
                }
                .buttonStyle(.plain)
            }

        case .loading, .idle, .notConfigured, .unavailable:
            // The Stripe-hosted path, which is what works today.
            Button {
                Task { await startCheckout() }
            } label: {
                HStack {
                    if isWorking {
                        ProgressView().tint(.black)
                    } else {
                        Text("Continue to checkout")
                    }
                }
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(.black)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(Capsule().fill(Theme.nebula))
            }
            .buttonStyle(.plain)
            .disabled(isWorking || !env.auth.status.isSignedIn)
        }
    }

    @ViewBuilder
    private var storeKitNotice: some View {
        switch env.subscription.state {
        case .notConfigured:
            Text("In-app purchase is not enabled in this build; checkout runs on our secure Stripe page instead.")
                .font(.system(size: 11))
                .foregroundStyle(Theme.text3)
                .multilineTextAlignment(.center)
        case .unavailable(let reason):
            Text("The App Store could not be reached (\(reason)). Checkout is still available.")
                .font(.system(size: 11))
                .foregroundStyle(Theme.text3)
                .multilineTextAlignment(.center)
        case .purchasing, .available, .loading, .idle:
            EmptyView()
        }
    }

    private var legal: some View {
        VStack(spacing: 4) {
            if !env.auth.status.isSignedIn {
                Text("Sign in from your profile before subscribing.")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Theme.push)
            }
            Text("Subscriptions renew automatically until cancelled. You can cancel at any time from your subscription settings. This app is informational and analytical — it is not a sportsbook and does not accept wagers.")
                .font(.system(size: 10))
                .foregroundStyle(Theme.text3)
                .multilineTextAlignment(.center)
        }
    }

    private func startCheckout() async {
        isWorking = true
        defer { isWorking = false }
        let target: UserProfile.Tier = env.auth.tier.rank < UserProfile.Tier.pro.rank ? .pro : .elite
        browserURL = await env.subscription.startCheckout(tier: target, interval: interval)
        showBrowser = browserURL != nil
    }
}
