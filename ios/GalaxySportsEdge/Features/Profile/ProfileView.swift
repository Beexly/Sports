import SwiftUI
import UIKit

/// Profile: who you are, what your own log says, and every account action.
///
/// Replaces the scaffold's "Edge Pro / edgePro" fiction with the real
/// FREE / FANTASY / PRO / ELITE tiers, and adds the four things the App Store
/// actually requires of a signed-in app: sign-out, a manage-subscription path,
/// notification control, and account deletion.
struct ProfileView: View {

    @Environment(AppEnvironment.self) private var env

    @State private var showUnitSheet = false
    @State private var showSignIn = false
    @State private var showPaywall = false
    @State private var showDelete = false
    @State private var showBrowser = false
    @State private var browserURL: URL?
    @State private var isWorking = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Theme.S.lg) {
                        headerCard
                        performanceCard
                        unitSizeCard
                        notificationCard
                        accountList
                        footer
                    }
                    .padding(.horizontal, Theme.S.lg)
                    .padding(.bottom, Theme.S.xxl)
                }
                .scrollIndicators(.hidden)
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
            .task { await env.auth.restore() }
            .sheet(isPresented: $showUnitSheet) { unitSizeSheet }
            .sheet(isPresented: $showSignIn) { SignInView() }
            .sheet(isPresented: $showPaywall) { PaywallView() }
            .sheet(isPresented: $showDelete) { DeleteAccountView() }
            .sheet(isPresented: $showBrowser) {
                if let browserURL { BrowserSheet(url: browserURL) }
            }
        }
    }

    // MARK: - Header

    private var headerCard: some View {
        HStack(spacing: Theme.S.lg) {
            ZStack {
                Circle().fill(Theme.nebula)
                Text(profile?.initials ?? "?")
                    .font(.display(24, .heavy))
                    .foregroundStyle(.black)
            }
            .frame(width: 64, height: 64)

            VStack(alignment: .leading, spacing: 4) {
                Text(profile?.displayName ?? "Not signed in")
                    .font(.display(19, .bold))
                    .foregroundStyle(Theme.text)
                Text(profile?.email ?? "The public slate works without an account.")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.text3)
                    .lineLimit(2)

                if let profile {
                    Pill(text: profile.tier.label, tint: tierTint(profile.tier))
                }
            }

            Spacer(minLength: 0)
        }
        .card()
    }

    // MARK: - The reader's own record

    private var performanceCard: some View {
        VStack(alignment: .leading, spacing: Theme.S.md) {
            SectionHeader(title: "Your log")

            if env.bets.isEmpty {
                Text("Log a bet and this fills in. It is stored on this iPhone — the app has no book integration and never claims to.")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.text2)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                HStack(spacing: Theme.S.md) {
                    StatTile(label: "Record", value: env.bets.recordLabel, tint: Theme.text)
                    StatTile(label: "Net units",
                             value: env.bets.netUnits.signedUnits,
                             tint: env.bets.netUnits >= 0 ? Theme.win : Theme.loss)
                    StatTile(label: "ROI",
                             value: String(format: "%+.1f%%", env.bets.roi),
                             tint: env.bets.roi >= 0 ? Theme.win : Theme.loss)
                }

                // The number that actually grades a log: the win rate its
                // prices demand. A 60% record at -200 break-even is a losing
                // record, and without this line the screen would show "60%" and
                // imply otherwise.
                if let breakEven = env.bets.portfolioBreakEven {
                    HStack(spacing: 4) {
                        Image(systemName: "info.circle").font(.system(size: 10))
                        Text(String(format: "Your prices need a %.1f%% win rate to break even.", breakEven))
                            .font(.system(size: 11))
                    }
                    .foregroundStyle(Theme.text3)
                }
            }

            Text("\(env.bets.all.count) logged · \(env.bets.settled.count) settled · saved on this device")
                .font(.system(size: 11))
                .foregroundStyle(Theme.text3)
        }
        .card()
    }

    // MARK: - Unit size

    private var unitSizeCard: some View {
        Button { showUnitSheet = true } label: {
            HStack {
                StatTile(label: "Unit size",
                         value: "$\(String(format: "%.0f", env.bets.unitSize))",
                         tint: Theme.violet,
                         sub: "Tap to change")
                Spacer(minLength: 0)
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(Theme.text3)
            }
        }
        .buttonStyle(.plain)
        .card()
    }

    // MARK: - Notifications

    private var notificationCard: some View {
        VStack(alignment: .leading, spacing: Theme.S.md) {
            SectionHeader(title: "Notifications")

            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Graded picks")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.text)
                    Text(pushSubtitle)
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.text2)
                }
                Spacer(minLength: 0)
                notificationControl
            }
        }
        .card()
    }

    private var pushSubtitle: String {
        switch env.push.status {
        case .unknown: return "Not asked yet."
        case .unsupported: return "Not available on this device."
        case .notDetermined: return "Tap Enable to allow alerts for graded picks."
        case .denied: return "Blocked in Settings › Notifications."
        case .authorized: return "On. Graded picks arrive as they settle."
        case .failed: return "Registration failed: \(env.push.lastRegistrationError ?? "unknown")"
        }
    }

    @ViewBuilder
    private var notificationControl: some View {
        switch env.push.status {
        case .denied:
            // A denied prompt is final; the only honest action is Settings.
            Button("Settings") { openNotificationSettings() }
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Theme.violet)
        case .authorized:
            Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.win)
        case .unknown, .notDetermined:
            Button {
                Task { await env.push.requestAuthorization() }
            } label: {
                if isWorking {
                    ProgressView().tint(Theme.violet)
                } else {
                    Text("Enable").font(.system(size: 12, weight: .bold))
                }
            }
            .foregroundStyle(Theme.violet)
        case .unsupported, .failed:
            EmptyView()
        }
    }

    private func openNotificationSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }

    // MARK: - Account

    private var accountList: some View {
        VStack(spacing: 0) {
            if env.auth.status.isSignedIn {
                if env.auth.tier.isPaid {
                    row(icon: "creditcard.fill", title: "Manage subscription") {
                        Task { await openPortal() }
                    }
                } else {
                    row(icon: "sparkles", title: "See plans") { showPaywall = true }
                }

                divider
                row(icon: "rectangle.portrait.and.arrow.right", title: "Sign out") {
                    Task { await signOut() }
                }
                divider
                row(icon: "trash.fill", title: "Delete account", tint: Theme.loss) {
                    showDelete = true
                }
            } else {
                row(icon: "person.crop.circle.badge.plus", title: "Sign in") {
                    showSignIn = true
                }
                divider
                row(icon: "sparkles", title: "See plans") { showPaywall = true }
            }
        }
        .card(padding: 0)
    }

    private var divider: some View {
        Divider().overlay(Theme.stroke).padding(.leading, 44)
    }

    private func row(icon: String,
                     title: String,
                     tint: Color = Theme.text,
                     action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: Theme.S.md) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(tint)
                    .frame(width: 24)
                Text(title)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(tint)
                Spacer(minLength: 0)
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Theme.text3)
            }
            .padding(.horizontal, Theme.S.lg)
            .padding(.vertical, Theme.S.lg)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Actions

    private func signOut() async {
        isWorking = true
        defer { isWorking = false }
        // Unregister the push token *before* clearing the session, otherwise
        // there is no authenticated caller left to unregister it with.
        await env.push.unregister()
        await env.auth.signOut()
    }

    private func openPortal() async {
        isWorking = true
        defer { isWorking = false }
        browserURL = await env.subscription.startBillingPortal()
        showBrowser = browserURL != nil
    }

    // MARK: - Footer

    private var footer: some View {
        VStack(spacing: 4) {
            Text("Galaxy Sports Edge")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Theme.text3)
            Text("Informational and analytical. Not a sportsbook. No wagers are placed through this app.")
                .font(.system(size: 10))
                .foregroundStyle(Theme.text3)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, Theme.S.sm)
    }

    // MARK: - Unit sheet

    private var profile: UserProfile? { env.auth.status.profile }

    private func tierTint(_ tier: UserProfile.Tier) -> Color {
        switch tier {
        case .free: Theme.text2
        case .fantasy: Theme.indigo
        case .pro: Theme.violet
        case .elite: Theme.cyan
        }
    }

    private var unitSizeSheet: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()
                VStack(spacing: Theme.S.xl) {
                    Text(String(format: "$%.0f", env.bets.unitSize))
                        .font(.num(48, .heavy))
                        .foregroundStyle(Theme.text)
                    Slider(value: Binding(
                        get: { env.bets.unitSize },
                        set: { env.bets.unitSize = $0 }),
                           in: 10...2000, step: 10)
                        .tint(Theme.violet)
                    Text("One unit is the size of your standard bet. Everything in My Bets is measured against it.")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.text2)
                        .multilineTextAlignment(.center)
                    Spacer()
                }
                .padding(Theme.S.xl)
            }
            .navigationTitle("Unit size")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { showUnitSheet = false }
                        .font(.system(size: 14, weight: .bold))
                        .tint(Theme.violet)
                }
            }
        }
        .presentationDetents([.height(380)])
    }
}
