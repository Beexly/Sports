import Foundation
import Observation

/// State for the scoreboard: a day's games, a sport filter, and a live-only
/// toggle.
@MainActor
@Observable
final class ScoresViewModel {

    /// The order a reader expects: what is happening now, then what is coming,
    /// then what is over. A board sorted by kickoff time puts finished games
    /// first all night, which is the opposite of useful.
    enum Section: String, CaseIterable, Hashable {
        case live, upcoming, final

        var title: String {
            switch self {
            case .live: "Live"
            case .upcoming: "Upcoming"
            case .final: "Final"
            }
        }
    }

    private let service: SportsService

    var state: LoadState<[Game]> = .idle
    var selectedSport: Sport?
    var liveOnly = false
    var selectedDate: Date = .now.startOfDay

    init(service: SportsService) {
        self.service = service
    }

    private var allGames: [Game] {
        if case .loaded(let games) = state { return games }
        return []
    }

    /// Groups and orders the board. Within a section, kickoff order — ascending
    /// for live and upcoming, descending for final, because the most recent
    /// result is the one a reader wants to see.
    var sections: [Section] {
        Section.allCases.filter { !games(in: $0).isEmpty }
    }

    func games(in section: Section) -> [Game] {
        let rows = allGames.filter { $0.status.belongs(to: section) }
        switch section {
        case .live, .upcoming:
            return rows.sorted { $0.commenceTime < $1.commenceTime }
        case .final:
            return rows.sorted { $0.commenceTime > $1.commenceTime }
        }
    }

    var liveCount: Int { allGames.filter { $0.status.isLive }.count }

    // MARK: - Loading

    func load() async {
        state = .loading
        do {
            let fetched = try await service.games(sport: selectedSport, date: selectedDate)
            state = .loaded(liveOnly ? fetched.filter { $0.status.isLive } : fetched)
        } catch {
            state = .failed(PicksViewModel.message(for: error))
        }
    }

    func select(_ sport: Sport?) async {
        guard sport != selectedSport else { return }
        selectedSport = sport
        await load()
    }
}

extension GameStatus {
    func belongs(to section: ScoresViewModel.Section) -> Bool {
        switch section {
        case .live: return isLive
        case .upcoming: return isPlayable && !isLive
        case .final: return isFinal
        }
    }
}
