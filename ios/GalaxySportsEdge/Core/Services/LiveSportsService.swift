import Foundation

/// Talks to galaxysportsedge.com's API.
/// Adjust `Endpoint` paths to match your actual routes.
struct LiveSportsService: SportsService {
    private let client = APIClient.shared

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "America/New_York")
        return f
    }()

    func picks(sport: Sport?, date: Date) async throws -> [Pick] {
        var q = ["date": Self.dateFormatter.string(from: date)]
        if let sport { q["sport"] = sport.rawValue }
        let endpoint = Endpoint(path: "picks", query: q, requiresAuth: true)
        return try await client.get(endpoint, as: [Pick].self)
    }

    func games(sport: Sport?, date: Date) async throws -> [Game] {
        var q = ["date": Self.dateFormatter.string(from: date)]
        if let sport { q["sport"] = sport.rawValue }
        let endpoint = Endpoint(path: "games", query: q)
        return try await client.get(endpoint, as: [Game].self)
    }

    func articles(page: Int, limit: Int) async throws -> [Article] {
        let endpoint = Endpoint(
            path: "articles",
            query: ["page": "\(page)", "limit": "\(limit)"])
        return try await client.get(endpoint, as: [Article].self)
    }

    func article(id: String) async throws -> Article {
        try await client.get(Endpoint(path: "articles/\(id)"), as: Article.self)
    }

    func profile() async throws -> UserProfile {
        try await client.get(Endpoint(path: "me", requiresAuth: true), as: UserProfile.self)
    }

    func toggleSave(pickID: String, saved: Bool) async throws {
        struct Body: Encodable { let pickId: String; let saved: Bool }
        try await client.sendVoid(
            Endpoint(path: "picks/save", method: .post, requiresAuth: true),
            body: Body(pickId: pickID, saved: saved))
    }
}
