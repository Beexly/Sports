import SwiftUI
import Observation

@MainActor
@Observable
final class ScoresViewModel {
    private let service: SportsService
    var state: LoadState<[Game]> = .idle
    var selectedSport: Sport? = nil
    var showLiveOnly = false

    init(service: SportsService) { self.service = service }

    func load() async {
        state = .loading
        do {
            state = .loaded(try await service.games(sport: selectedSport, date: .now))
        } catch {
            state = .failed((error as? APIError)?.errorDescription ?? error.localizedDescription)
        }
    }

    func select(_ sport: Sport?) async {
        selectedSport = sport
        await load()
    }
}

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
        VStack(spacing: 0) {
            sportStrip(vm)

            AsyncContent(state: vm.state, retry: { await vm.load() }) { games in
                let visible = vm.showLiveOnly ? games.filter { $0.status.isLive } : games
                if visible.isEmpty {
                    EmptyStateView(
                        icon: "sportscourt",
                        title: "No games",
                        message: vm.showLiveOnly
                            ? "Nothing is live right now."
                            : "No games scheduled for this filter.")
                } else {
                    ScrollView {
                        LazyVStack(spacing: Theme.S.md, pinnedViews: [.sectionHeaders]) {
                            ForEach(leagues(in: visible), id: \.self) { league in
                                Section {
                                    ForEach(visible.filter { $0.league == league }) { game in
                                        GameRow(game: game)
                                    }
                                } header: {
                                    // NOTE (Motif fix): `vm` was referenced here
                                    // but was not in scope — it is now passed in.
                                    leagueHeader(league, vm: vm)
                                }
                            }
                        }
                        .padding(.horizontal, Theme.S.lg)
                        .padding(.bottom, Theme.S.xxl)
                    }
                    .scrollIndicators(.hidden)
                    .refreshable { await vm.load() }
                }
            }
        }
        .background(Theme.bg)
    }

    private func leagues(in games: [Game]) -> [String] {
        var seen = Set<String>()
        return games.compactMap { seen.insert($0.league).inserted ? $0.league : nil }
    }

    private func leagueHeader(_ league: String, vm: ScoresViewModel) -> some View {
        HStack {
            Text(league)
                .font(.system(size: 11, weight: .heavy))
                .tracking(1)
                .foregroundStyle(Theme.text3)
            Spacer()
            Button {
                Task { await vm.load() }
            } label: {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(Theme.text3)
            }
        }
        .padding(.vertical, Theme.S.sm)
        .padding(.horizontal, 4)
        .background(Theme.bg)
    }

    private func sportStrip(_ vm: ScoresViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.S.sm) {
                liveToggle(vm)

                chip("All", "flame.fill", vm.selectedSport == nil) {
                    Task { await vm.select(nil) }
                }
                ForEach(Sport.featured) { sport in
                    chip(sport.display, sport.icon, vm.selectedSport == sport) {
                        Task { await vm.select(sport) }
                    }
                }
            }
            .padding(.horizontal, Theme.S.lg)
            .padding(.vertical, Theme.S.md)
        }
        .overlay(alignment: .bottom) {
            Rectangle().fill(Theme.stroke).frame(height: 1)
        }
    }

    private func liveToggle(_ vm: ScoresViewModel) -> some View {
        Button {
            withAnimation(.snappy) { vm.showLiveOnly.toggle() }
        } label: {
            HStack(spacing: 5) {
                Circle().fill(Theme.loss).frame(width: 6, height: 6)
                Text("Live").font(.system(size: 13, weight: .semibold))
            }
            .foregroundStyle(vm.showLiveOnly ? .black : Theme.loss)
            .padding(.horizontal, 13)
            .padding(.vertical, 9)
            .background(
                Capsule().fill(vm.showLiveOnly ? AnyShapeStyle(Theme.loss)
                                               : AnyShapeStyle(Theme.surface))
            )
            .overlay(Capsule().strokeBorder(
                vm.showLiveOnly ? .clear : Theme.loss.opacity(0.3), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private func chip(_ title: String, _ icon: String,
                      _ active: Bool, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 5) {
                Image(systemName: icon).font(.system(size: 11, weight: .bold))
                Text(title).font(.system(size: 13, weight: .semibold))
            }
            .foregroundStyle(active ? .black : Theme.text2)
            .padding(.horizontal, 13)
            .padding(.vertical, 9)
            .background(Capsule().fill(active ? AnyShapeStyle(Theme.nebula)
                                              : AnyShapeStyle(Theme.surface)))
            .overlay(Capsule().strokeBorder(active ? .clear : Theme.stroke, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Game row

struct GameRow: View {
    let game: Game

    var body: some View {
        VStack(spacing: Theme.S.md) {
            HStack {
                statusLabel
                Spacer()
                if let total = game.total {
                    Text("O/U \(total, specifier: "%.1f")")
                        .font(.num(11, .semibold))
                        .foregroundStyle(Theme.text3)
                }
            }

            VStack(spacing: Theme.S.sm) {
                teamLine(team: game.away, score: game.awayScore,
                         spread: game.awaySpread, isWinner: winner == .away)
                teamLine(team: game.home, score: game.homeScore,
                         spread: game.homeSpread, isWinner: winner == .home)
            }
        }
        .card()
    }

    private var winner: Side? {
        guard game.isFinal,
              let a = game.awayScore, let h = game.homeScore else { return nil }
        if a == h { return nil }
        return a > h ? .away : .home
    }

    private enum Side { case away, home }

    @ViewBuilder
    private var statusLabel: some View {
        if game.status.isLive {
            HStack(spacing: 5) {
                Circle().fill(Theme.loss).frame(width: 6, height: 6)
                Text(game.status.label.uppercased())
                    .font(.system(size: 10, weight: .heavy))
                    .tracking(0.5)
                    .foregroundStyle(Theme.loss)
            }
        } else if game.isFinal {
            Text("FINAL")
                .font(.system(size: 10, weight: .heavy))
                .tracking(0.5)
                .foregroundStyle(Theme.text3)
        } else {
            Text(Fmt.kickoffLabel(game.commenceTime).uppercased())
                .font(.system(size: 10, weight: .heavy))
                .tracking(0.5)
                .foregroundStyle(Theme.violet)
        }
    }

    private func teamLine(team: Team, score: Int?,
                          spread: Double?, isWinner: Bool) -> some View {
        HStack(spacing: Theme.S.md) {
            AsyncLogo(url: team.logoURL, text: team.abbreviation,
                      size: 32, tint: isWinner ? Theme.win : Theme.text2)

            VStack(alignment: .leading, spacing: 1) {
                Text(team.name)
                    .font(.system(size: 15, weight: isWinner ? .bold : .medium))
                    .foregroundStyle(isWinner ? Theme.text : Theme.text2)
                    .lineLimit(1)
                if let record = team.record {
                    Text(record)
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.text3)
                }
            }

            Spacer()

            if let spread, !game.isFinal {
                Text(spread > 0 ? "+\(spread, specifier: "%.1f")"
                                : "\(spread, specifier: "%.1f")")
                    .font(.num(12, .semibold))
                    .foregroundStyle(Theme.text3)
            }

            if let score {
                Text("\(score)")
                    .font(.num(22, .bold))
                    .foregroundStyle(isWinner ? Theme.text : Theme.text2)
                    .frame(minWidth: 34, alignment: .trailing)
            }
        }
    }
}
