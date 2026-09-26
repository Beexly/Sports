import Foundation
import Observation

@MainActor
@Observable
final class PicksViewModel {
    private let service: SportsService

    var state: LoadState<[Pick]> = .idle
    var selectedSport: Sport? = nil
    var selectedDate: Date = .now.startOfDay
    var savedPickIDs: Set<String> = []

    init(service: SportsService) { self.service = service }

    /// Seven-day strip: three days back through three days forward.
    var days: [Date] {
        (-3...3).map { Date.now.startOfDay.adding(days: $0) }
    }

    func load() async {
        state = .loading
        do {
            let picks = try await service.picks(sport: selectedSport, date: selectedDate)
            state = .loaded(picks)
        } catch {
            state = .failed(message(for: error))
        }
    }

    func select(sport: Sport?) async {
        guard sport != selectedSport else { return }
        selectedSport = sport
        await load()
    }

    func select(date: Date) async {
        guard date != selectedDate else { return }
        selectedDate = date
        await load()
    }

    func toggleSave(_ pick: Pick) async {
        let nowSaved = !savedPickIDs.contains(pick.id)
        if nowSaved { savedPickIDs.insert(pick.id) } else { savedPickIDs.remove(pick.id) }
        try? await service.toggleSave(pickID: pick.id, saved: nowSaved)
    }

    private func message(for error: Error) -> String {
        (error as? APIError)?.errorDescription ?? error.localizedDescription
    }
}
