import SwiftUI

struct ProfileView: View {
    @Environment(AppEnvironment.self) private var env

    @State private var profile: UserProfile?
    @State private var showUnitSheet = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Theme.S.lg) {
                        headerCard
                        performanceCard
                        unitSizeCard
                        settingsList
                        footer
                    }
                    .padding(.horizontal, Theme.S.lg)
                    .padding(.bottom, Theme.S.xxl)
                }
                .scrollIndicators(.hidden)
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
            .task {
                if profile == nil {
                    profile = try? await env.service.profile()
                }
            }
            .sheet(isPresented: $showUnitSheet) { unitSizeSheet }
        }
    }

    // MARK: Header

    private var headerCard: some View {
        HStack(spacing: Theme.S.lg) {
            ZStack {
                Circle().fill(Theme.nebula)
                Text(initials)
                    .font(.display(24, .heavy))
                    .foregroundStyle(.black)
            }
            .frame(width: 64, height: 64)

            VStack(alignment: .leading, spacing: 4) {
                Text(profile?.displayName ?? "Edge Member")
                    .font(.display(19, .bold))
                    .foregroundStyle(Theme.text)
                Text(profile?.email ?? "—")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.text3)
                    .lineLimit(1)

                if let tier = profile?.tier {
                    Pill(text: tier.label,
                         tint: tier == .edgePro ? Theme.cyan : Theme.text3,
                         icon: tier == .edgePro ? "crown.fill" : nil)
                        .padding(.top, 2)
                }
            }

            Spacer()
        }
        .card()
    }

    private var initials: String {
        guard let name = profile?.displayName else { return "GS" }
        return name.split(separator: " ").prefix(2)
            .compactMap { $0.first.map(String.init) }
            .joined()
            .uppercased()
    }

    // MARK: Performance

    private var performanceCard: some View {
        VStack(alignment: .leading, spacing: Theme.S.lg) {
            SectionHeader(title: "Your Numbers")

            HStack(spacing: Theme.S.md) {
                StatTile(label: "Record", value: env.bets.recordLabel, tint: Theme.text)
                StatTile(label: "Units",
                         value: env.bets.netUnits.signedUnits,
                         tint: env.bets.netUnits >= 0 ? Theme.win : Theme.loss)
                StatTile(label: "ROI",
                         value: String(format: "%+.1f%%", env.bets.roi),
                         tint: env.bets.roi >= 0 ? Theme.win : Theme.loss)
            }

            HStack(spacing: Theme.S.sm) {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.violet)
                Text("\(env.bets.bets.count) bets tracked · \(env.bets.settled.count) settled")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.text2)
                Spacer()
            }
        }
        .card()
    }

    // MARK: Unit size

    private var unitSizeCard: some View {
        Button {
            showUnitSheet = true
        } label: {
            HStack {
                Image(systemName: "dollarsign.circle.fill")
                    .font(.system(size: 18))
                    .foregroundStyle(Theme.violet)
                VStack(alignment: .leading, spacing: 1) {
                    Text("Unit Size")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Theme.text)
                    Text("Used for unit & ROI math")
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.text3)
                }
                Spacer()
                Text("$\(env.bets.unitSize, specifier: "%.0f")")
                    .font(.num(16, .bold))
                    .foregroundStyle(Theme.violet)
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Theme.text3)
            }
            .card()
        }
        .buttonStyle(.plain)
    }

    private var unitSizeSheet: some View {
        @Bindable var bets = env.bets
        return NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()
                VStack(spacing: Theme.S.xl) {
                    VStack(spacing: Theme.S.sm) {
                        Text("$\(bets.unitSize, specifier: "%.0f")")
                            .font(.num(44, .heavy))
                            .foregroundStyle(Theme.text)
                        Text("One unit equals this dollar amount.")
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.text2)
                    }
                    .padding(.top, Theme.S.xxl)

                    Slider(value: $bets.unitSize, in: 10...1000, step: 10)
                        .tint(Theme.violet)
                        .padding(.horizontal, Theme.S.lg)

                    Spacer()
                }
            }
            .navigationTitle("Unit Size")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { showUnitSheet = false }
                        .font(.system(size: 15, weight: .semibold))
                        .tint(Theme.violet)
                }
            }
        }
        .presentationDetents([.height(280)])
    }

    // MARK: Settings

    private var settingsList: some View {
        VStack(spacing: 0) {
            row(icon: "bell.fill", title: "Notifications",
                subtitle: "Picks, results, and line moves", tint: Theme.violet)
            divider
            row(icon: "crown.fill", title: "Subscription",
                subtitle: profile?.tier == .edgePro ? "Edge Pro — active" : "Upgrade to Edge Pro",
                tint: Theme.cyan)
            divider
            row(icon: "chart.bar.fill", title: "Performance History",
                subtitle: "Full graded record", tint: Theme.win)
            divider
            row(icon: "questionmark.circle.fill", title: "Support",
                subtitle: "help@galaxysportsedge.com", tint: Theme.text2)
            divider
            row(icon: "doc.text.fill", title: "Terms & Privacy",
                subtitle: nil, tint: Theme.text2)
        }
        .card(padding: 0)
    }

    private var divider: some View {
        Rectangle().fill(Theme.stroke).frame(height: 1).padding(.leading, 56)
    }

    private func row(icon: String, title: String,
                     subtitle: String?, tint: Color) -> some View {
        HStack(spacing: Theme.S.md) {
            ZStack {
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .fill(tint.opacity(0.15))
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(tint)
            }
            .frame(width: 34, height: 34)

            VStack(alignment: .leading, spacing: 1) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Theme.text)
                if let subtitle {
                    Text(subtitle)
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.text3)
                        .lineLimit(1)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(Theme.text3)
        }
        .padding(Theme.S.lg)
    }

    private var footer: some View {
        VStack(spacing: Theme.S.sm) {
            Text("Galaxy Sports Edge")
                .font(.display(13, .bold))
                .foregroundStyle(Theme.text3)
            Text("Version 1.0 (1)")
                .font(.system(size: 11))
                .foregroundStyle(Theme.text3)

            Text("For entertainment and informational purposes only. Not gambling advice. If you or someone you know has a gambling problem, call 1-800-GAMBLER.")
                .font(.system(size: 10))
                .foregroundStyle(Theme.text3)
                .multilineTextAlignment(.center)
                .padding(.top, Theme.S.sm)
                .padding(.horizontal, Theme.S.lg)
        }
        .padding(.top, Theme.S.lg)
    }
}
