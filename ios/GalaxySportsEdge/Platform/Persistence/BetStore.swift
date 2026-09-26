import Foundation
import Observation

/// The reader's own bet log.
///
/// This is *their* record of what they placed at a sportsbook — the app has no
/// book integration and never claims to. It is local, on-device, and never
/// synced; a row here is a note, not a wager.
@MainActor
@Observable
final class BetStore {

    private let store: JSONFileStore<UserBet>

    /// Dollar value of one unit. Bankroll-relative sizing is the whole
    /// discipline; a flat $100 is the number people get wrong.
    var unitSize: Double {
        didSet { UserDefaults.standard.set(unitSize, forKey: Self.unitKey) }
    }

    private static let unitKey = "gse.betStore.unitSize"

    /// `directory` is injected so a test gets an isolated file; `unitSize` is
    /// injected so a test neither reads nor writes the real preference.
    init(directory: URL? = nil, unitSize overrideUnitSize: Double? = nil) {
        let stored = UserDefaults.standard.double(forKey: Self.unitKey)
        unitSize = overrideUnitSize ?? (stored > 0 ? stored : 100)
        store = JSONFileStore(fileName: "user_bets.json", key: { $0.id }, directory: directory)
    }

    /// Every logged bet, newest first. `settled` and `pending` partition this.
    var bets: [UserBet] { store.values }
    var all: [UserBet] { store.values }
    var isEmpty: Bool { store.isEmpty }

    // MARK: - Mutations

    func add(_ bet: UserBet) { store.upsert(bet) }
    func update(_ bet: UserBet) { store.upsert(bet) }
    func delete(_ bet: UserBet) { store.remove(bet) }
    func delete(at offsets: IndexSet) { store.remove(atOffsets: offsets) }

    // MARK: - Derived stats

    var settled: [UserBet] { bets.filter { $0.status != .pending } }
    var pending: [UserBet] { bets.filter { $0.status == .pending } }

    var wins: Int { settled.filter { $0.status == .won }.count }
    var losses: Int { settled.filter { $0.status == .lost }.count }
    /// Pushes and voids both count as "not a loss", and a record that hides
    /// them (reporting 8-2 for what was really 8-2-1) overstates the win rate.
    var pushes: Int { settled.filter { $0.status == .push || $0.status == .void }.count }

    var recordLabel: String { "\(wins)-\(losses)\(pushes > 0 ? "-\(pushes)" : "")" }

    /// Net profit across settled bets, in dollars.
    var netProfit: Double {
        settled.reduce(0) { $0 + $1.profit() }
    }

    /// Net profit in units — comparable across bankroll sizes, and the number
    /// the model publishes against.
    var netUnits: Double { unitSize > 0 ? netProfit / unitSize : 0 }

    /// Staked on settled bets only. Including pending stakes in the denominator
    /// would make ROI look better the less of the book has been graded.
    var totalWagered: Double { settled.reduce(0) { $0 + $1.stake } }

    /// Return on turnover, as a percentage.
    var roi: Double {
        totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0
    }

    /// Win rate over *decided* bets — pushes and voids are excluded from the
    /// denominator, because a push is not a bet you won or lost.
    var winRate: Double {
        let decided = wins + losses
        return decided > 0 ? Double(wins) / Double(decided) * 100 : 0
    }

    var pendingStake: Double { pending.reduce(0) { $0 + $1.stake } }

    /// Average net units per settled bet. Nil with nothing settled, rather than
    /// a confident-looking 0.00u that reads like a measured result.
    var averageUnits: Double? {
        guard !settled.isEmpty else { return nil }
        return netUnits / Double(settled.count)
    }

    /// The stake-weighted average break-even win rate this log actually demands.
    /// This is the number a claimed win rate should be compared against: 52.4%
    /// break-even over a 6-4 log is a losing record, not a breakeven one. Nil
    /// when nothing in the log carries a price.
    var portfolioBreakEven: Double? {
        let priced = settled.filter { $0.breakEvenWinRate != nil }
        let weightedStake = priced.reduce(0) { $0 + $1.stake }
        guard weightedStake > 0 else { return nil }
        return priced.reduce(0) { $0 + ($1.breakEvenWinRate ?? 0) * $1.stake } / weightedStake
    }
}
