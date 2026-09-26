import Foundation
import Observation

/// Bookmarked picks, stored on the device.
///
/// The backend has no "saved picks" route — `/api/watchlist` follows *teams
/// and players*, not picks — so a bookmark here is explicitly local. The UI
/// says "saved on this iPhone" for exactly that reason. If a picks-save route
/// is ever added, this is the one class that changes; nothing else needs to
/// know where a bookmark lives.
@MainActor
@Observable
final class SavedPicksStore {

    struct Saved: Codable, Identifiable, Hashable, Sendable {
        let pickID: String
        let savedAt: Date
        var id: String { pickID }
    }

    /// Cap the bookmark list. A reader with 500 saved picks is not using this
    /// as a library, and an unbounded list is an unbounded file.
    static let capacity = 200

    private let store: JSONFileStore<Saved>

    init(directory: URL? = nil) {
        store = JSONFileStore(fileName: "saved_picks.json", key: { $0.id }, directory: directory)
    }

    private var saved: [Saved] { store.values }

    var ids: Set<String> { Set(saved.map(\.pickID)) }
    var count: Int { store.count }
    var isEmpty: Bool { store.isEmpty }
    /// Most-recent-first, so "Saved" reads as a timeline.
    var ordered: [Saved] { saved }

    func isSaved(_ pickID: String) -> Bool { store.contains(pickID) }

    func toggle(_ pickID: String) {
        if store.contains(pickID) {
            store.removeAll { $0.pickID == pickID }
        } else {
            store.upsert(Saved(pickID: pickID, savedAt: .now))
            store.trim(to: Self.capacity)
        }
    }

    func savedAt(_ pickID: String) -> Date? {
        store.first { $0.pickID == pickID }?.savedAt
    }
}
