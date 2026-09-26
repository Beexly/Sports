import SwiftUI

/// The full pick: the number, the trail behind it, and the question box.
struct PickDetailView: View {

    @Environment(AppEnvironment.self) private var env

    let pick: Pick

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.S.xl) {
                header
                priceBlock
                confidenceBlock
                reasoningBlock
                factorBlock
                provenanceBlock
                askBlock
            }
            .padding(Theme.S.lg)
            .padding(.bottom, Theme.S.xxl)
        }
        .scrollIndicators(.hidden)
        .background(Theme.bg)
        .navigationTitle(pick.selection)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    env.saved.toggle(pick.id)
                } label: {
                    Image(systemName: env.saved.isSaved(pick.id) ? "bookmark.fill" : "bookmark")
                }
                .tint(Theme.violet)
                .accessibilityLabel(env.saved.isSaved(pick.id) ? "Remove bookmark" : "Save pick")
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(alignment: .leading, spacing: Theme.S.md) {
            HStack(spacing: Theme.S.sm) {
                Pill(text: pick.league, tint: Theme.violet, icon: pick.sport.icon)
                Pill(text: pick.grade.display, tint: Theme.cyan,
                     filled: pick.grade == .elitePlay)
                Pill(text: pick.risk.display, tint: Theme.push)
                Spacer(minLength: 0)
            }

            Text(pick.eventName)
                .font(.display(26, .heavy))
                .foregroundStyle(Theme.text)
                .fixedSize(horizontal: false, vertical: true)

            HStack(spacing: Theme.S.md) {
                Text(Fmt.kickoffLabel(pick.commenceTime))
                Text("·")
                Text(pick.pickType.display)
                Spacer(minLength: 0)
            }
            .font(.system(size: 13, weight: .medium))
            .foregroundStyle(Theme.text2)
        }
    }

    // MARK: - Price

    private var priceBlock: some View {
        VStack(alignment: .leading, spacing: Theme.S.md) {
            HStack(alignment: .firstTextBaseline, spacing: Theme.S.lg) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("SELECTION")
                        .font(.system(size: 9, weight: .heavy))
                        .tracking(0.8)
                        .foregroundStyle(Theme.text3)
                    Text(pick.selection)
                        .font(.display(22, .heavy))
                        .foregroundStyle(Theme.text)
                }
                Spacer(minLength: 0)
                VStack(alignment: .trailing, spacing: 2) {
                    Text("PRICE")
                        .font(.system(size: 9, weight: .heavy))
                        .tracking(0.8)
                        .foregroundStyle(Theme.text3)
                    Text(pick.displayOdds)
                        .font(.num(22, .bold))
                        .foregroundStyle(pick.hasBookPrice ? Theme.text : Theme.text3)
                }
            }

            if pick.hasBookPrice {
                HStack(spacing: Theme.S.lg) {
                    if let books = pick.bookmakerCount {
                        StatTile(label: "Books", value: "\(books)")
                    }
                    if let winProbability = pick.winProbability {
                        StatTile(label: "Model win %",
                                 value: String(format: "%.1f%%", winProbability * 100),
                                 tint: Theme.cyan)
                    }
                    if let market = pick.marketImpliedProb {
                        StatTile(label: "Market %",
                                 value: String(format: "%.1f%%", market * 100),
                                 tint: Theme.text2)
                    }
                }
            } else {
                // A model-signal row is a real state on this surface. Saying
                // so beats showing a price the app made up.
                Text("No book price on this line — the model published a signal without a quote.")
                    .font(.system(size: 11))
                    .foregroundStyle(Theme.text3)
            }
        }
        .card()
    }

    // MARK: - Confidence

    @ViewBuilder
    private var confidenceBlock: some View {
        if let confidence = pick.confidence {
            VStack(alignment: .leading, spacing: Theme.S.md) {
                SectionHeader(title: "Confidence")
                ConfidenceMeter(value: confidence,
                                tint: pick.isPremium ? Theme.cyan : Theme.violet)
                if let edge = pick.edgeScore {
                    Text("Edge index \(String(format: "%+.1f", edge)) against the market's own price.")
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.text2)
                }
                if let winProbability = pick.winProbability, pick.odds != 0,
                   let points = OddsMath.edgePoints(fairProbability: winProbability,
                                                    american: pick.odds) {
                    // Labelled "vs market", never "edge %": this number ignores
                    // the vig, so calling it an edge would be a different and
                    // wrong claim.
                    Text(String(format: "Model sits %+.1f points vs the market on this price.", points))
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.text3)
                }
            }
            .card()
        } else {
            VStack(alignment: .leading, spacing: Theme.S.md) {
                SectionHeader(title: "Confidence")
                HStack(spacing: Theme.S.md) {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(Theme.violet)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("A paid signal")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(Theme.text)
                        Text("The model publishes a confidence on every pick. Pro and above see it.")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.text2)
                    }
                    Spacer(minLength: 0)
                }
            }
            .card()
        }
    }

    // MARK: - Reasoning

    private var reasoningBlock: some View {
        VStack(alignment: .leading, spacing: Theme.S.md) {
            SectionHeader(title: "The case")
            if let reasoning = pick.reasoning, !reasoning.isEmpty {
                Text(reasoning)
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.text2)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
            } else if let short = pick.reasoningShort, !short.isEmpty {
                Text(short)
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.text2)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
                Text("The full write-up is a Pro feature.")
                    .font(.system(size: 11))
                    .foregroundStyle(Theme.text3)
            } else {
                Text("No reasoning published for this pick.")
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.text3)
            }
        }
        .card()
    }

    // MARK: - Factors

    @ViewBuilder
    private var factorBlock: some View {
        if !pick.factors.isEmpty {
            VStack(alignment: .leading, spacing: Theme.S.md) {
                SectionHeader(title: "Factor trail")
                Text("Signed points against the pick — not percentages, and not a probability.")
                    .font(.system(size: 11))
                    .foregroundStyle(Theme.text3)
                VStack(spacing: Theme.S.sm) {
                    ForEach(pick.factors) { factor in
                        FactorRow(factor: factor)
                    }
                }
            }
            .card()
        }
    }

    // MARK: - Provenance

    private var provenanceBlock: some View {
        VStack(alignment: .leading, spacing: Theme.S.md) {
            SectionHeader(title: "Provenance")

            VStack(spacing: Theme.S.sm) {
                provenanceRow("Generated", Fmt.medium.string(from: pick.generatedAt))
                provenanceRow("Data fresh through",
                              pick.dataFreshnessAt.map { Fmt.medium.string(from: $0) } ?? "not recorded")
                if let movement = pick.lineMovement {
                    provenanceRow("Line",
                                  String(format: "%.1f → %.1f (%@)",
                                         movement.opening, movement.current, movement.label))
                }
                provenanceRow("Data quality", String(format: "%.0f / 100", pick.dataQualityScore))
                if let hash = pick.receiptHash {
                    provenanceRow("Receipt", String(hash.prefix(16)) + "…")
                }
                provenanceRow("Units", String(format: "%.1fu", pick.units))
            }

            if !pick.isAuditAvailable {
                Text("This pick carries no public audit trail.")
                    .font(.system(size: 11))
                    .foregroundStyle(Theme.text3)
            }

            Button {
                env.bets.add(UserBet(
                    eventName: pick.eventName,
                    selection: pick.selection,
                    odds: pick.odds,
                    stake: env.bets.unitSize,
                    sportsbook: "",
                    placedAt: .now,
                    status: .pending,
                    notes: pick.reasoningShort ?? "",
                    linkedPickID: pick.id))
            } label: {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("Log this in My Bets")
                }
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.black)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
                .background(Capsule().fill(Theme.nebula))
            }
            .buttonStyle(.plain)
            .padding(.top, Theme.S.sm)
        }
        .card()
    }

    private func provenanceRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(Theme.text3)
            Spacer(minLength: Theme.S.md)
            Text(value)
                .font(.num(12, .medium))
                .foregroundStyle(Theme.text2)
                .multilineTextAlignment(.trailing)
        }
    }

    // MARK: - Ask

    private var askBlock: some View {
        NavigationLink {
            AskTheEdgeView(pick: pick)
        } label: {
            HStack {
                Image(systemName: "bubble.left.and.text.bubble.right.fill")
                Text("Ask the model about this pick")
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 12, weight: .bold))
            }
            .font(.system(size: 14, weight: .semibold))
            .foregroundStyle(Theme.violet)
            .card(padding: Theme.S.md)
        }
        .buttonStyle(.plain)
    }
}

/// One factor row. The bar grows from the leading edge, and a penalty is
/// rendered in the loss colour so it cannot be mistaken for a small positive.
struct FactorRow: View {
    let factor: PickFactor

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack {
                Text(factor.label)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.text)
                Spacer()
                Text(String(format: "%+.1f", factor.value))
                    .font(.num(12, .bold))
                    .foregroundStyle(factor.value >= 0 ? Theme.win : Theme.loss)
            }

            GeometryReader { geo in
                let magnitude = min(1.0, abs(factor.value) / 30.0)
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.06))
                    Capsule()
                        .fill(factor.value >= 0 ? Theme.win : Theme.loss)
                        .frame(width: max(2, geo.size.width * magnitude))
                }
            }
            .frame(height: 5)

            Text(factor.detail)
                .font(.system(size: 10))
                .foregroundStyle(Theme.text3)
        }
        .padding(.vertical, 3)
    }
}
