import Foundation

// MARK: - Sport

enum Sport: String, Codable, CaseIterable, Identifiable, Hashable {
    case nfl, nba, mlb, nhl, ncaaf, ncaab, soccer, ufc, tennis

    var id: String { rawValue }

    var display: String {
        switch self {
        case .nfl: "NFL";       case .nba: "NBA"
        case .mlb: "MLB";       case .nhl: "NHL"
        case .ncaaf: "NCAAF";   case .ncaab: "NCAAB"
        case .soccer: "Soccer"; case .ufc: "UFC"
        case .tennis: "Tennis"
        }
    }

    var icon: String {
        switch self {
        case .nfl, .ncaaf: "football.fill"
        case .nba, .ncaab: "basketball.fill"
        case .mlb: "baseball.fill"
        case .nhl: "hockey.puck.fill"
        case .soccer: "soccerball"
        case .ufc: "figure.boxing"
        case .tennis: "tennisball.fill"
        }
    }

    /// Sports surfaced as filter chips, in order.
    static var featured: [Sport] { [.nfl, .nba, .mlb, .nhl, .ncaaf, .ncaab, .soccer, .ufc] }
}

// MARK: - Team

struct Team: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let abbreviation: String
    let logoURL: URL?
    var record: String?      // "24-8"
    var ranking: Int?        // AP poll etc.
}

// MARK: - Analyst

struct Analyst: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let handle: String
    let avatarURL: URL?
    var title: String?       // "Lead NFL Analyst"

    var initials: String {
        name.split(separator: " ").prefix(2)
            .compactMap { $0.first.map(String.init) }
            .joined()
    }
}

// MARK: - Pick

enum PickStatus: String, Codable, Hashable {
    case upcoming, live, graded
}

enum PickResult: String, Codable, Hashable {
    case win, loss, push, void

    var label: String {
        switch self {
        case .win: "WIN"; case .loss: "LOSS"
        case .push: "PUSH"; case .void: "VOID"
        }
    }
}

struct Pick: Identifiable, Codable, Hashable {
    let id: String
    let sport: Sport
    let league: String
    let eventName: String        // "Lakers @ Celtics"
    let selection: String        // "Lakers -4.5"
    let odds: Int                // American, e.g. -110 / +145
    let confidence: Int          // 0...100
    let units: Double            // 1.5
    let analyst: Analyst
    let reasoning: String
    let commenceTime: Date
    let status: PickStatus
    let result: PickResult?
    let isPremium: Bool
    let homeAbbr: String
    let awayAbbr: String

    var isGraded: Bool { status == .graded && result != nil }
}

// MARK: - Game

/// NOTE (Motif fix): enums with associated values do not get automatic
/// Codable synthesis, so GameStatus carries a hand-written implementation
/// using a string discriminator.
enum GameStatus: Hashable {
    case scheduled
    case live(period: String, clock: String?)
    case final

    var isLive: Bool { if case .live = self { return true }; return false }

    var label: String {
        switch self {
        case .scheduled: "Scheduled"
        case .live(let p, let c): c.map { "\(p) · \($0)" } ?? p
        case .final: "Final"
        }
    }
}

extension GameStatus: Codable {
    private enum Kind: String, Codable { case scheduled, live, final }
    private enum CodingKeys: String, CodingKey { case kind, period, clock }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        switch try container.decode(Kind.self, forKey: .kind) {
        case .scheduled:
            self = .scheduled
        case .live:
            self = .live(
                period: try container.decode(String.self, forKey: .period),
                clock: try container.decodeIfPresent(String.self, forKey: .clock))
        case .final:
            self = .final
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .scheduled:
            try container.encode(Kind.scheduled, forKey: .kind)
        case .live(let period, let clock):
            try container.encode(Kind.live, forKey: .kind)
            try container.encode(period, forKey: .period)
            try container.encodeIfPresent(clock, forKey: .clock)
        case .final:
            try container.encode(Kind.final, forKey: .kind)
        }
    }
}

struct Game: Identifiable, Codable, Hashable {
    let id: String
    let sport: Sport
    let league: String
    let away: Team
    let home: Team
    let awayScore: Int?
    let homeScore: Int?
    let status: GameStatus
    let commenceTime: Date
    let awaySpread: Double?
    let total: Double?

    var isFinal: Bool { if case .final = status { return true }; return false }

    /// NOTE (Motif fix): the view layer references `homeSpread`; the model
    /// only stores the away line, so the home line is its inverse.
    var homeSpread: Double? { awaySpread.map { -$0 } }
}

// MARK: - Article

struct Article: Identifiable, Codable, Hashable {
    let id: String
    let title: String
    let dek: String
    let body: String
    let author: Analyst
    let publishedAt: Date
    let heroImageURL: URL?
    let tags: [String]
    let readMinutes: Int
    let isPremium: Bool
}

// MARK: - User

struct UserProfile: Identifiable, Codable, Hashable {
    enum Tier: String, Codable { case free, edgePro

        var label: String { self == .edgePro ? "Edge Pro" : "Free" }
    }

    let id: String
    let displayName: String
    let email: String
    let tier: Tier
    let memberSince: Date
    let avatarURL: URL?
}

// MARK: - User bet (locally tracked)

enum BetStatus: String, Codable, CaseIterable, Identifiable {
    case pending, won, lost, push, void
    var id: String { rawValue }

    var label: String {
        switch self {
        case .pending: "Pending"; case .won: "Won"
        case .lost: "Lost";       case .push: "Push"
        case .void: "Void"
        }
    }
}

struct UserBet: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var eventName: String
    var selection: String
    var odds: Int
    var stake: Double
    var sportsbook: String
    var placedAt: Date
    var status: BetStatus
    var notes: String = ""
    var linkedPickID: String? = nil

    /// Total returned including stake on a win; stake on push/void.
    func payout(unitSize: Double) -> Double {
        switch status {
        case .won:
            return odds > 0
                ? stake * (1 + Double(odds) / 100)
                : stake * (1 + 100 / Double(-odds))
        case .push, .void: return stake
        case .lost: return 0
        case .pending: return 0
        }
    }

    func profit(unitSize: Double) -> Double {
        switch status {
        case .won:  return payout(unitSize: unitSize) - stake
        case .lost: return -stake
        case .push, .void, .pending: return 0
        }
    }
}
