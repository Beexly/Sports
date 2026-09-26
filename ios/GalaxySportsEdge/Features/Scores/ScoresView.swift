import SwiftUI
import Observation

/// The scoreboard.
///
/// The `games` route returns the real `Game` rows, so this tab carries live
/// status, the engine's public Edge Index, and the scheduling context
/// (rest days, back-to-back flags) the engine already computes. Rest is the
/// most actionable non-score fact on a board and most apps omit it.
struct ScoresView: View {

    @Environment(AppEnvironment.self) private var env
    @State private var vm: ScoresViewModel?

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()
                if let vm { content(vm) } else { LoadingView() }
            }
            .navigationTitle("Scoreboard")
            .navigationBarTitleDisplayMode(.large)
            .task {
                if vm == nil {
                    let created = ScoresViewModel(service: env.service)
                    vm = created
                    await created.load()
                }
            }
        }
    }

    @ViewBuilder
    private func content(_ vm: ScoresViewModel) -> some View {
        ScrollView {
            LazyVStack(spacing: Theme.S.lg, pinnedViews: [.sectionHeaders]) {

                Section {
                    AsyncContent(state: vm.state, retry: { await vm.load() }) { games in
                        if games.isEmpty {
                            EmptyStateView(
                                icon: "sportscourt",
                                title: "No games found",
                                message: "The engine is not tracking any games for this day yet.")
                                .frame(height: 320)
                        } else {
                            LazyVStack(spacing: Theme.S.md) {
                                ForEach(vm.sections, id: \.self) { section in
                                    SectionHeaderRow(section: section, count: vm.games(in: section).count)
                                    ForEach(vm.games(in: section)) { game in
                                        GameRow(game: game)
                                    }
                                }
                            }
                            .padding(.horizontal, Theme.S.lg)
                            .padding(.bottom, Theme.S.xxl)
                        }
                    }
                } header: {
                    filterBar(vm)
                }
            }
        }
        .scrollIndicators(.hidden)
        .refreshable { await vm.load() }
        .background(Theme.bg)
    }

    private func filterBar(_ vm: ScoresViewModel) -> some View {
        HStack(spacing: Theme.S.sm) {
            Button {
                vm.liveOnly.toggle()
                Task { await vm.load() }
            } label: {
                HStack(spacing: 5) {
                    Image(systemName: "bolt.fill").font(.system(size: 11, weight: .bold))
                    Text("Live").font(.system(size: 13, weight: .semibold))
                }
                .foregroundStyle(vm.liveOnly ? Color.black : Theme.text2)
                .padding(.horizontal, 13)
                .padding(.vertical, 9)
                .background(
                    Capsule().fill(vm.liveOnly ? AnyShapeStyle(Theme.nebula) : AnyShapeStyle(Theme.surface))
                )
                .overlay(Capsule().strokeBorder(vm.liveOnly ? Color.clear : Theme.stroke, lineWidth: 1))
            }
            .buttonStyle(.plain)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Theme.S.sm) {
                    ForEach(Sport.featured) { sport in
                        Button {
                            Task { await vm.select(sport) }
                        } label: {
                            HStack(spacing: 5) {
                                Image(systemName: sport.icon).font(.system(size: 11, weight: .bold))
                                Text(sport.display).font(.system(size: 13, weight: .semibold))
                            }
                            .foregroundStyle(vm.selectedSport == sport ? Color.black : Theme.text2)
                            .padding(.horizontal, 13)
                            .padding(.vertical, 9)
                            .background(
                                Capsule().fill(vm.selectedSport == sport
                                               ? AnyShapeStyle(Theme.nebula)
                                               : AnyShapeStyle(Theme.surface))
                            )
                            .overlay(Capsule().strokeBorder(vm.selectedSport == sport
                                                           ? Color.clear : Theme.stroke, lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .padding(.horizontal, Theme.S.lg)
        .padding(.vertical, Theme.S.md)
        .background(Theme.bg)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Theme.stroke).frame(height: 1)
        }
    }
}

struct SectionHeaderRow: View {
    let section: ScoresViewModel.Section
    let count: Int

    var body: some View {
        HStack {
            Text(section.title.uppercased())
                .font(.system(size: 10, weight: .heavy))
                .tracking(1)
                .foregroundStyle(Theme.text3)
            Spacer()
            Text("\(count)")
                .font(.num(10, .bold))
                .foregroundStyle(Theme.text3)
        }
        .padding(.top, Theme.S.sm)
        .padding(.bottom, 2)
    }
}

// MARK: - Row

struct GameRow: View {
    let game: Game

    var body: some View {
        VStack(spacing: Theme.S.sm) {
            HStack(spacing: Theme.S.md) {
                statusBlock
                teamsBlock
                scoreBlock
            }

            if game.hasFatigueRisk || (game.edgeIndex ?? 0) >= 60 {
                contextStrip
            }
        }
        .card(padding: Theme.S.md)
    }

    // MARK: Pieces

    private var statusBlock: some View {
        VStack(spacing: 3) {
            Text(game.status == .live ? "LIVE" : game.status.label.uppercased())
                .font(.system(size: 9, weight: .heavy))
                .tracking(0.6)
                .foregroundStyle(game.status.isLive ? Theme.loss : Theme.text3)
            if game.status == .scheduled {
                Text(Fmt.kickoff.string(from: game.commenceTime))
                    .font(.num(11, .medium))
                    .foregroundStyle(Theme.text3)
            }
            if let edge = game.edgeIndex {
                Text(String(format: "%.0f", edge))
                    .font(.num(13, .heavy))
                    .foregroundStyle(Theme.violet)
            }
        }
        .frame(width: 40, alignment: .leading)
    }

    private var teamsBlock: some View {
        VStack(alignment: .leading, spacing: 5) {
            teamRow(game.away, score: game.awayScore, spread: game.awaySpread)
            Divider().overlay(Theme.stroke).frame(height: 1)
            teamRow(game.home, score: game.homeScore, spread: game.homeSpread)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func teamRow(_ team: Team, score: Int?, spread: Double?) -> some View {
        HStack(spacing: Theme.S.sm) {
            Text(team.abbreviation)
                .font(.num(13, .bold))
                .foregroundStyle(Theme.text2)
                .frame(width: 34, alignment: .leading)

            Text(team.name)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(Theme.text)
                .lineLimit(1)

            Spacer(minLength: 0)

            if let spread {
                Text(String(format: "%+.1f", spread))
                    .font(.num(12, .medium))
                    .foregroundStyle(Theme.text3)
            }

            Text(score.map(String.init) ?? "–")
                .font(.num(15, .heavy))
                .foregroundStyle(Theme.text)
                .frame(width: 30, alignment: .trailing)
        }
    }

    private var scoreBlock: some View {
        VStack(spacing: 3) {
            if let total = game.total {
                Text("O/U \(String(format: "%.1f", total))")
                    .font(.num(10, .medium))
                    .foregroundStyle(Theme.text3)
            }
            if let edge = game.edgeIndex, edge >= 60 {
                Text("high edge")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(Theme.violet)
            }
        }
        .frame(width: 54, alignment: .trailing)
    }

    /// Rest and back-to-back context, straight from the engine's own columns.
    private var contextStrip: some View {
        HStack(spacing: Theme.S.sm) {
            if game.isBackToBackAway {
                contextChip("Away on a back-to-back", Theme.push)
            }
            if game.isBackToBackHome {
                contextChip("Home on a back-to-back", Theme.push)
            }
            if let rest = game.restDaysAway, rest <= 3, !game.isBackToBackAway {
                contextChip("Away \(rest)d rest", Theme.text3)
            }
            if let rest = game.restDaysHome, rest <= 3, !game.isBackToBackHome {
                contextChip("Home \(rest)d rest", Theme.text3)
            }
            Spacer(minLength: 0)
        }
    }

    private func contextChip(_ text: String, _ tint: Color) -> some View {
        Text(text)
            .font(.system(size: 9, weight: .semibold))
            .foregroundStyle(tint)
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(Capsule().fill(tint.opacity(0.12)))
    }
}
