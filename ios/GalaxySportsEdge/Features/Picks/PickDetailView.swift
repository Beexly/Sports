import SwiftUI

struct PickDetailView: View {
    let pick: Pick

    @Environment(AppEnvironment.self) private var env
    @State private var didAddBet = false

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    hero
                    VStack(alignment: .leading, spacing: Theme.S.xl) {
                        selectionBlock
                        metricsBlock
                        reasoningBlock
                        analystBlock
                    }
                    .padding(Theme.S.lg)
                    .padding(.bottom, 96)
                }
            }
            .scrollIndicators(.hidden)
        }
        .safeAreaInset(edge: .bottom) { actionBar }
        .navigationTitle(pick.league)
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: Hero

    private var hero: some View {
        ZStack {
            Theme.aurora
            RadialGradient(colors: [Theme.violet.opacity(0.35), .clear],
                           center: .topTrailing, startRadius: 10, endRadius: 320)

            VStack(spacing: Theme.S.md) {
                HStack(spacing: Theme.S.sm) {
                    Pill(text: pick.league, tint: Theme.cyan, icon: pick.sport.icon)
                    if pick.isPremium { Pill(text: "Premium", tint: Theme.cyan, icon: "lock.fill") }
                    if pick.isGraded, let r = pick.result {
                        Pill(text: r.label, tint: r.tint, filled: true)
                    }
                    Spacer()
                }

                Spacer(minLength: Theme.S.xl)

                HStack(spacing: Theme.S.lg) {
                    teamColumn(pick.awayAbbr, "Away")
                    Text("@")
                        .font(.display(15, .bold))
                        .foregroundStyle(Theme.text3)
                    teamColumn(pick.homeAbbr, "Home")
                }

                Text(pick.eventName)
                    .font(.display(20, .bold))
                    .foregroundStyle(Theme.text)
                    .multilineTextAlignment(.center)

                Text(Fmt.kickoffLabel(pick.commenceTime))
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Theme.text2)

                Spacer(minLength: Theme.S.lg)
            }
            .padding(Theme.S.lg)
        }
        .frame(height: 290)
        .clipped()
    }

    private func teamColumn(_ abbr: String, _ label: String) -> some View {
        VStack(spacing: 8) {
            AsyncLogo(url: nil, text: abbr, size: 58, tint: Theme.cyan)
            Text(label.uppercased())
                .font(.system(size: 9, weight: .heavy))
                .tracking(0.8)
                .foregroundStyle(Theme.text3)
        }
    }

    // MARK: Blocks

    private var selectionBlock: some View {
        VStack(alignment: .leading, spacing: Theme.S.sm) {
            Text("THE PLAY")
                .font(.system(size: 10, weight: .heavy))
                .tracking(1)
                .foregroundStyle(Theme.text3)

            HStack(alignment: .firstTextBaseline) {
                Text(pick.selection)
                    .font(.display(28, .heavy))
                    .foregroundStyle(Theme.text)
                Spacer()
                Text(pick.odds.americanOdds)
                    .font(.num(20, .bold))
                    .foregroundStyle(pick.odds > 0 ? Theme.win : Theme.text)
            }

            ConfidenceMeter(value: pick.confidence,
                            tint: pick.isPremium ? Theme.cyan : Theme.violet)
                .padding(.top, Theme.S.xs)
        }
        .card()
    }

    private var metricsBlock: some View {
        HStack(spacing: Theme.S.lg) {
            StatTile(label: "Units", value: String(format: "%.1f", pick.units),
                     tint: Theme.violet, sub: "recommended")
            StatTile(label: "Implied", value: impliedProbability,
                     tint: Theme.text2, sub: "win chance")
            StatTile(label: "Edge", value: edgeLabel,
                     tint: Theme.win, sub: "vs implied")
        }
        .card()
    }

    private var reasoningBlock: some View {
        VStack(alignment: .leading, spacing: Theme.S.md) {
            Text("THE BREAKDOWN")
                .font(.system(size: 10, weight: .heavy))
                .tracking(1)
                .foregroundStyle(Theme.text3)

            Text(pick.reasoning)
                .font(.system(size: 15))
                .foregroundStyle(Theme.text2)
                .lineSpacing(6)
                .fixedSize(horizontal: false, vertical: true)
        }
        .card()
    }

    private var analystBlock: some View {
        HStack(spacing: Theme.S.md) {
            AsyncLogo(url: pick.analyst.avatarURL,
                      text: pick.analyst.initials, size: 46, tint: Theme.cyan)
            VStack(alignment: .leading, spacing: 2) {
                Text(pick.analyst.name)
                    .font(.display(15, .bold))
                    .foregroundStyle(Theme.text)
                Text(pick.analyst.title ?? pick.analyst.handle)
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.text3)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Theme.text3)
        }
        .card()
    }

    // MARK: Action bar

    private var actionBar: some View {
        HStack(spacing: Theme.S.md) {
            Button {
                addToMyBets()
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: didAddBet ? "checkmark.circle.fill" : "plus.circle.fill")
                    Text(didAddBet ? "Added" : "Track This Bet")
                }
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(.black)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(
                    RoundedRectangle(cornerRadius: Theme.R.md, style: .continuous)
                        .fill(didAddBet ? AnyShapeStyle(Theme.win) : AnyShapeStyle(Theme.nebula))
                )
            }
            .buttonStyle(.plain)
            .disabled(didAddBet)

            ShareLink(item: shareText) {
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(Theme.text)
                    .frame(width: 52, height: 52)
                    .background(
                        RoundedRectangle(cornerRadius: Theme.R.md, style: .continuous)
                            .fill(Theme.surfaceHi)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: Theme.R.md, style: .continuous)
                            .strokeBorder(Theme.stroke, lineWidth: 1)
                    )
            }
        }
        .padding(.horizontal, Theme.S.lg)
        .padding(.top, Theme.S.md)
        .padding(.bottom, Theme.S.sm)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) {
            Rectangle().fill(Theme.stroke).frame(height: 1)
        }
    }

    // MARK: Helpers

    private var impliedProbability: String {
        let p = pick.odds > 0
            ? 100.0 / (Double(pick.odds) + 100)
            : Double(-pick.odds) / (Double(-pick.odds) + 100)
        return "\(Int(p.rounded() * 100))%"
    }

    private var edgeLabel: String {
        let implied = pick.odds > 0
            ? 100.0 / (Double(pick.odds) + 100)
            : Double(-pick.odds) / (Double(-pick.odds) + 100)
        let model = Double(pick.confidence) / 100
        let edge = (model - implied) * 100
        return String(format: "%+.1f%%", edge)
    }

    private var shareText: String {
        """
        \(pick.selection) (\(pick.odds.americanOdds))
        \(pick.eventName) · \(pick.league)
        \(pick.units, specifier: "%.1f")u · \(pick.confidence)% confidence

        via Galaxy Sports Edge
        """
    }

    private func addToMyBets() {
        let bet = UserBet(
            eventName: pick.eventName,
            selection: pick.selection,
            odds: pick.odds,
            stake: pick.units * env.bets.unitSize,
            sportsbook: "—",
            placedAt: .now,
            status: pick.status == .graded
                ? (pick.result == .win ? .won : pick.result == .loss ? .lost : .push)
                : .pending,
            linkedPickID: pick.id)
        env.bets.add(bet)
        withAnimation(.spring(response: 0.3)) { didAddBet = true }
    }
}
