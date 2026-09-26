import Foundation
import Observation

/// A small, file-backed collection of `Codable` values.
///
/// Deliberately not a database: the app's local state is a few hundred rows of
/// JSON at most, and a dependency-free store is one fewer thing to keep
/// working on a device. Writes are atomic so a crash mid-save cannot leave a
/// truncated file that silently reads back as "no data" — losing the reader's
/// log is the one failure mode worth spending code on here.
@MainActor
@Observable
final class JSONFileStore<Value: Codable & Sendable> {

    private(set) var values: [Value] = []
    private let fileURL: URL
    private let key: (Value) -> Value.ID

    private let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.sortedKeys]
        return encoder
    }()

    private let decoder: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }()

    /// `directory` is injected so a test gets a scratch file instead of the
    /// simulator's real data.
    init(fileName: String,
         key: @escaping (Value) -> Value.ID,
         directory: URL? = nil) {
        self.key = key
        self.fileURL = (directory ?? JSONFileStore.defaultDirectory())
            .appendingPathComponent(fileName)
        load()
    }

    static func defaultDirectory() -> URL {
        let directory = FileManager.default
            .urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory
    }

    // MARK: - Queries

    var count: Int { values.count }
    var isEmpty: Bool { values.isEmpty }

    func contains(_ id: Value.ID) -> Bool {
        values.contains { key($0) == id }
    }

    func first(where predicate: (Value) -> Bool) -> Value? {
        values.first(where: predicate)
    }

    // MARK: - Mutations

    /// Inserts at the top (newest first) or replaces in place if the key
    /// already exists, then persists.
    func upsert(_ value: Value) {
        let id = key(value)
        if let index = values.firstIndex(where: { key($0) == id }) {
            values[index] = value
        } else {
            values.insert(value, at: 0)
        }
        save()
    }

    func remove(_ value: Value) {
        values.removeAll { key($0) == key(value) }
        save()
    }

    func removeAll(where predicate: (Value) -> Bool) {
        values.removeAll(where: predicate)
        save()
    }

    func remove(atOffsets offsets: IndexSet) {
        values.remove(atOffsets: offsets)
        save()
    }

    /// Restricts the store to the newest `limit` rows and persists the trim.
    func trim(to limit: Int) {
        guard values.count > limit else { return }
        values = Array(values.prefix(limit))
        save()
    }

    // MARK: - Persistence

    private func load() {
        guard let data = try? Data(contentsOf: fileURL),
              let decoded = try? decoder.decode([Value].self, from: data) else {
            // Absent or unreadable is "no data yet" — an empty store, not an
            // error state the reader has to see.
            values = []
            return
        }
        values = decoded
    }

    private func save() {
        guard let data = try? encoder.encode(values) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }
}
