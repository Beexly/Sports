import SwiftUI

struct MyBetsView: View {
    @Environment(AppEnvironment.self) private var env
    @State private var showAdd = false
    @State private var filter: BetFilter = .all

    enum BetFilter: String, CaseIterable, Identifiable {
        case all, pending, settled
        var id: String { rawValue }
        var label: String { rawValue.capitalized }
    }

    private var bets: BetStore { env.bets }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()

                if bets.all.isEmpty {
                    EmptyStateView(
                        icon: "list.bullet.rectangle.portrait",
                        title: "No bets tracked",
                        message: "Add a bet to track your record, units, and ROI automatically.",
                        action: ("Add a Bet", { showAdd = true }))
                } else {
                    ScrollView {
                        LazyVStack(spacing: Theme.S.lg) {
                            summaryCard
                            filterPicker

                            ForEach(visibleBets) { bet in
                                BetRow(bet: bet, unitSize: bets.unitSize)
                                    .contextMenu {
                                        ForEach(BetStatus.allCases) { status in
                                            Button(status.label) {
                                                var copy = bet
                                                copy.status = status
                                                bets.update(copy)
                                            }
                                        }
                                        Divider()
                                        Button("Delete", role: .destructive) { bets.delete(bet) }
                                    }
                            }
                        }
                        .padding(.horizontal, Theme.S.lg)
                        .padding(.bottom, Theme.S.xxl)
                    }
                    .scrollIndicators(.hidden)
                }
            }
            .navigationTitle("My Bets")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showAdd = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 18))
                            .tint(Theme.violet)
                    }
                }
            }
            .sheet(isPresented: $showAdd) {
                AddBetView()
                    .environment(env)
            }
        }
    }

    private var visibleBets: [UserBet] {
        switch filter {
        case .all: bets.all
        case .pending: bets.all.filter { $0.status == .pending }
        case .settled: bets.all.filter { $0.status != .pending }
        }
    }

    private var summaryCard: some View {
        VStack(spacing: Theme.S.lg) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("NET RESULT")
                        .font(.system(size: 10, weight: .heavy))
                        .tracking(1)
                        .foregroundStyle(Theme.text3)
                    Text(bets.netProfit.signedCurrency)
                        .font(.num(30, .heavy))
                        .foregroundStyle(bets.netProfit >= 0 ? Theme.win : Theme.loss)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("UNITS")
                        .font(.system(size: 10, weight: .heavy))
                        .tracking(1)
                        .foregroundStyle(Theme.text3)
                    Text(bets.netUnits.signedUnits)
                        .font(.num(20, .bold))
                        .foregroundStyle(bets.netUnits >= 0 ? Theme.win : Theme.loss)
                }
            }

            Divider().overlay(Theme.stroke)

            HStack(spacing: Theme.S.md) {
                StatTile(label: "Record", value: bets.recordLabel, tint: Theme.text)
                StatTile(label: "Win Rate",
                         value: String(format: "%.0f%%", bets.winRate), tint: Theme.text)
                StatTile(label: "ROI",
                         value: String(format: "%+.1f%%", bets.roi),
                         tint: bets.roi >= 0 ? Theme.win : Theme.loss)
            }

            if bets.pendingStake > 0 {
                HStack {
                    Image(systemName: "clock.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(Theme.push)
                    Text("\(bets.pending.count) pending · \(bets.pendingStake, specifier: "%.0f") at risk")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Theme.text2)
                    Spacer()
                }
            }
        }
        .card()
    }

    private var filterPicker: some View {
        HStack(spacing: Theme.S.sm) {
            ForEach(BetFilter.allCases) { f in
                Button {
                    withAnimation(.snappy) { filter = f }
                } label: {
                    Text(f.label)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(filter == f ? .black : Theme.text2)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 9)
                        .background(
                            RoundedRectangle(cornerRadius: Theme.R.sm, style: .continuous)
                                .fill(filter == f ? AnyShapeStyle(Theme.nebula)
                                                  : AnyShapeStyle(Theme.surface))
                        )
                }
                .buttonStyle(.plain)
            }
        }
    }
}

struct BetRow: View {
    let bet: UserBet
    let unitSize: Double

    var body: some View {
        HStack(spacing: Theme.S.md) {
            RoundedRectangle(cornerRadius: 3, style: .continuous)
                .fill(statusColor)
                .frame(width: 3)

            VStack(alignment: .leading, spacing: 5) {
                Text(bet.eventName)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Theme.text3)
                    .lineLimit(1)

                Text(bet.selection)
                    .font(.display(16, .bold))
                    .foregroundStyle(Theme.text)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    Text(bet.odds.americanOdds)
                        .font(.num(11, .bold))
                        .foregroundStyle(bet.odds > 0 ? Theme.win : Theme.text2)
                    Text("·").foregroundStyle(Theme.text3)
                    Text("$\(bet.stake, specifier: "%.0f")")
                        .font(.num(11, .semibold))
                        .foregroundStyle(Theme.text2)
                    Text("·").foregroundStyle(Theme.text3)
                    Text(bet.sportsbook)
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.text3)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(bet.status.label.uppercased())
                    .font(.system(size: 9, weight: .heavy))
                    .tracking(0.6)
                    .foregroundStyle(statusColor)

                if bet.status == .pending {
                    Text("at risk")
                        .font(.num(13, .bold))
                        .foregroundStyle(Theme.text2)
                } else {
                    Text(bet.profit().signedCurrency)
                        .font(.num(14, .bold))
                        .foregroundStyle(bet.profit() >= 0
                                         ? Theme.win : Theme.loss)
                }
            }
        }
        .padding(.vertical, Theme.S.md)
        .padding(.trailing, Theme.S.md)
        .padding(.leading, Theme.S.md - 3)
        .background(
            RoundedRectangle(cornerRadius: Theme.R.md, style: .continuous)
                .fill(Theme.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: Theme.R.md, style: .continuous)
                .strokeBorder(Theme.stroke, lineWidth: 1)
        )
    }

    private var statusColor: Color {
        switch bet.status {
        case .pending: Theme.push
        case .won: Theme.win
        case .lost: Theme.loss
        case .push, .void: Theme.text3
        }
    }
}
