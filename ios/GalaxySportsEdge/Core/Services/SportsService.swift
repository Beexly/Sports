import Foundation

/// The single seam between the app and your backend.
/// Swap `MockSportsService` for `LiveSportsService` by flipping
/// `AppConfiguration.useMockData`.
protocol SportsService: Sendable {
    func picks(sport: Sport?, date: Date) async throws -> [Pick]
    func games(sport: Sport?, date: Date) async throws -> [Game]
    func articles(page: Int, limit: Int) async throws -> [Article]
    func article(id: String) async throws -> Article
    func profile() async throws -> UserProfile
    func toggleSave(pickID: String, saved: Bool) async throws
}
