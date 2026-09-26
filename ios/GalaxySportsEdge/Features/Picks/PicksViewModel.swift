import Foundation
import Observation

/// State for The Edge: the slate, the date and sport filters, and the
/// entitlement metadata that explains what is missing.
@MainActor
@Observable
final class PicksViewModel {

    private let service: SportsService
    private let saved: SavedPicksStore

    var state: LoadState<SlatePage> = .idle
    var selectedSport: Sport?
    var selectedDate: Date = .now.startOfDay

    init(service: SportsService, saved: SavedPicksStore) {
        self.service = service
        self.saved = saved
    }

    // MARK: - Derived

    private var page: SlatePage? {
        if case .loaded(let page) = state { return page }
        return nil
    }

    var picks: [Pick] { page?.picks ?? [] }
    var meta: SlateMeta { page?.meta ?? SlateMeta() }

    /// Picks the server graded, best first. The server's order is by its own
    /// sort key; the app only reshuffles once a pick is actually settled,
    /// because a settled pick is worth more to a reader than a marginally
    /// higher-ranked unsettled one.
    var gradedFirst: [Pick] {
        let rows = picks
        guard rows.contains(where: \.isGraded) else { return rows }
        return rows.sorted { lhs, rhs in
            if lhs.isGraded != rhs.isGraded { return lhs.isGraded }
            return lhs.grade.rank < rhs.grade.rank
        }
    }

    var savedPickIDs: Set<String> { saved.ids }
    var savedCount: Int { saved.count }

    /// Seven-day strip: three days back through three days forward.
    var days: [Date] {
        (-3...3).map { Date.now.startOfDay.adding(days: $0) }
    }

    /// Pairs a date with the label the strip shows. A `Date` in a `ForEach`
    /// compares by instant, which two dates in the same day do not — the pair
    /// gives identity without a String id.
    struct DayOption: Identifiable, Hashable {
        let date: Date
        let title: String
        let number: String
        var id: Date { date }
    }

    var dayOptions: [DayOption] {
        days.map { date in
            DayOption(date: date, title: Self.dayLabel(date), number: Fmt.dayNum.string(from: date))
        }
    }

    static func dayLabel(_ day: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(day) { return "TODAY" }
        if calendar.isDateInTomorrow(day) { return "TMRW" }
        if calendar.isDateInYesterday(day) { return "YEST" }
        return Fmt.dayShort.string(from: day).uppercased()
    }

    // MARK: - Loading

    func load() async {
        state = .loading
        do {
            state = .loaded(try await service.slate(sport: selectedSport, date: selectedDate))
        } catch {
            // A gated 503 is an expected state, not a failure: it carries its
            // own explanation and should not read like a failure banner.
            state = .failed(Self.message(for: error))
        }
    }

    /// Re-loads, but only if something actually changed. Without this guard,
    /// re-selecting the chip that is already active fires a request that
    /// returns the same rows and makes the reader think the refresh did nothing.
    func select(sport: Sport?) async {
        guard sport != selectedSport else { return }
        selectedSport = sport
        await load()
    }

    func select(date: Date) async {
        guard !Calendar.current.isDate(date, inSameDayAs: selectedDate) else { return }
        selectedDate = date
        await load()
    }

    func toggleSave(_ pick: Pick) {
        saved.toggle(pick.id)
    }

    func isSaved(_ pick: Pick) -> Bool {
        saved.isSaved(pick.id)
    }

    // MARK: - Errors

    static func message(for error: Error) -> String {
        if let apiError = error as? APIError { return apiError.errorDescription ?? "Something went wrong." }
        return error.localizedDescription
    }
}
