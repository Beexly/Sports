import Foundation
import Observation
import SwiftUI

@MainActor
@Observable
final class BetStore {
    private(set) var bets: [UserBet] = []

    /// Dollar value of one unit. Configurable in Settings.
    var unitSize: Double {
        didSet { UserDefaults.standard.set(unitSize, forKey: Self.unitKey) }
    }

    private static let unitKey = "gse.unitSize"
    private let fileURL: URL

    init() {
        let stored = UserDefaults.standard.double(forKey: Self.unitKey)
        unitSize = stored > 0 ? stored : 100

        let dir = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        fileURL = dir.appendingPathComponent("user_bets.json")
        load()
    }

    // MARK: Mutations

    func add(_ bet: UserBet) {
        bets.insert(bet, at: 0)
        save()
    }

    func update(_ bet: UserBet) {
        guard let i = bets.firstIndex(where: { $0.id == bet.id }) else { return }
        bets[i] = bet
        save()
    }

    func delete(_ bet: UserBet) {
        bets.removeAll { $0.id == bet.id }
        save()
    }

    func delete(at offsets: IndexSet) {
        bets.remove(atOffsets: offsets)
        save()
    }

    // MARK: Derived stats

    var settled: [UserBet] { bets.filter { $0.status != .pending } }
    var pending: [UserBet] { bets.filter { $0.status == .pending } }

    var wins: Int { settled.filter { $0.status == .won }.count }
    var losses: Int { settled.filter { $0.status == .lost }.count }
    var pushes: Int { settled.filter { $0.status == .push || $0.status == .void }.count }

    var recordLabel: String { "\(wins)-\(losses)\(pushes > 0 ? "-\(pushes)" : "")" }

    var netProfit: Double {
        settled.reduce(0) { $0 + $1.profit(unitSize: unitSize) }
    }

    var netUnits: Double { unitSize > 0 ? netProfit / unitSize : 0 }

    var totalWagered: Double { settled.reduce(0) { $0 + $1.stake } }

    var roi: Double {
        totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0
    }

    var winRate: Double {
        let decided = wins + losses
        return decided > 0 ? Double(wins) / Double(decided) * 100 : 0
    }

    var pendingStake: Double { pending.reduce(0) { $0 + $1.stake } }

    // MARK: Persistence

    private func load() {
        guard let data = try? Data(contentsOf: fileURL),
              let decoded = try? JSONDecoder().decode([UserBet].self, from: data) else {
            bets = []
            return
        }
        bets = decoded
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(bets) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }
}
