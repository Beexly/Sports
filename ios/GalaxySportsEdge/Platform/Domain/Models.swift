import Foundation

// MARK: - Sport

enum Sport: String, Codable, CaseIterable, Identifiable, Hashable, Sendable {
    case nfl, nba, mlb, nhl, ncaaf, ncaab, soccer, ufc, tennis

    var id: String { rawValue }

    /// The backend's `Sport.name` column ("NFL", "NCAAF", …). An unrecognised
    /// sport degrades to `.nfl` rather than dropping a row: the iOS sport
    /// filter is a *view* of a slate that is mostly NFL anyway, and silently
    /// hiding a game is worse than mislabelling one.
    static func matchingBackendName(_ name: String) -> Sport {
        let normalized = name.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if let direct = Sport(rawValue: normalized) { return direct }
        switch normalized {
        case "ncaa football", "college football", "ncaaf": return .ncaaf
        case "ncaa basketball", "college basketball", "ncaab": return .ncaab
        case "football": return .nfl
        case "basketball": return .nba
        case "hockey": return .nhl
        case "baseball": return .mlb
        case "soccer", "football (soccer)": return .soccer
        case "mma", "mixed martial arts": return .ufc
        default: return .nfl
        }
    }

    var display: String {
        switch self {
        case .nfl: "NFL";       case .nba: "NBA"
        case .mlb: "MLB";       case .nhl: "NHL"
        case .ncaaf: "NCAAF";   case .ncaab: "NCAAAB"
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

// MARK: - Analyst

struct Analyst: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let name: String
    let handle: String
    let avatarURL: URL?
    var title: String?

    var initials: String {
        name.split(separator: " ").prefix(2)
            .compactMap { $0.first.map(String.init) }
            .joined()
    }

    /// Picks are model output, not bylines — the API attaches no author. Naming
    /// the desk keeps the card honest (nobody's name is on it) instead of
    /// inventing a different person per pick.
    static let desk = Analyst(
        id: "gse-desk",
        name: "The Edge Desk",
        handle: "@galaxysportsedge",
        avatarURL: nil,
        title: "Galaxy Sports Edge model output")
}

// MARK: - Pick

enum PickType: String, Codable, Hashable, Sendable {
    case spread = "SPREAD"
    case moneyline = "MONEYLINE"
    case total = "TOTAL"

    var display: String {
        switch self {
        case .spread: "Spread"
        case .moneyline: "Moneyline"
        case .total: "Total"
        }
    }
}

enum PickTier: String, Codable, Hashable, Sendable {
    case free = "FREE"
    case premium = "PREMIUM"
}

enum PickGrade: String, Codable, Hashable, Sendable {
    case elitePlay = "ELITE_PLAY"
    case strongPlay = "STRONG_PLAY"
    case solidPlay = "SOLID_PLAY"
    case lean = "LEAN"

    /// Ordered best → worst, for sorting and for the "top play" badge.
    var rank: Int {
        switch self {
        case .elitePlay: 0
        case .strongPlay: 1
        case .solidPlay: 2
        case .lean: 3
        }
    }

    var display: String {
        switch self {
        case .elitePlay: "Elite Play"
        case .strongPlay: "Strong Play"
        case .solidPlay: "Solid Play"
        case .lean: "Lean"
        }
    }
}

enum RiskLevel: String, Codable, Hashable, Sendable {
    case lowRisk = "LOW_RISK"
    case moderate = "MODERATE"
    case highVariance = "HIGH_VARIANCE"
    case injuryRisk = "INJURY_RISK"
    case lineSteam = "LINE_STEAM"

    var display: String {
        switch self {
        case .lowRisk: "Low Risk"
        case .moderate: "Moderate"
        case .highVariance: "High Variance"
        case .injuryRisk: "Injury Risk"
        case .lineSteam: "Line Steam"
        }
    }
}

enum PickResult: String, Codable, Hashable, Sendable {
    case pending = "PENDING"
    case win = "WIN"
    case loss = "LOSS"
    case push = "PUSH"
    case void = "VOID"

    /// The API sends PENDING for an ungraded row and omits the field entirely
    /// on some shapes; both mean "not graded yet".
    var isGraded: Bool { self != .pending }

    var label: String {
        switch self {
        case .win: "WIN"; case .loss: "LOSS"
        case .push: "PUSH"; case .void: "VOID"
        case .pending: "OPEN"
        }
    }
}

enum PickStatus: String, Codable, Hashable, Sendable {
    case upcoming, live, graded

    var label: String {
        switch self {
        case .upcoming: "Upcoming"
        case .live: "Live"
        case .graded: "Graded"
        }
    }
}

/// Opening → current line, the Pro-tier market read.
struct LineMovement: Hashable, Sendable {
    let opening: Double
    let current: Double

    /// Signed point delta. The view renders the raw number, not this sign.
    var delta: Double { current - opening }

    var label: String { String(format: "%+.1f", delta) }
}

/// One scored factor from the engine's factor breakdown. Rendered as signed
/// points against the pick's edge, never as a percentage.
struct PickFactor: Identifiable, Hashable, Sendable {
    let key: String
    let label: String
    let value: Double
    let detail: String

    var id: String { key }
}

struct Pick: Identifiable, Hashable, Sendable {
    let id: String
    let sport: Sport
    let league: String
    let eventName: String
    let homeTeam: String
    let awayTeam: String
    let homeAbbr: String
    let awayAbbr: String
    let selection: String
    let pickType: PickType
    let line: Double?
    let odds: Int
    let hasBookPrice: Bool
    let units: Double
    let analyst: Analyst
    let confidence: Int?
    let edgeScore: Double?
    let dataQualityScore: Double
    let tier: PickTier
    let grade: PickGrade
    let risk: RiskLevel
    let reasoning: String?
    let reasoningShort: String?
    let consensusPct: Double?
    let bookmakerCount: Int?
    let marketImpliedProb: Double?
    let winProbability: Double?
    let lineMovement: LineMovement?
    let factors: [PickFactor]
    let isFeatured: Bool
    let isAuditAvailable: Bool
    let commenceTime: Date
    let generatedAt: Date
    let dataFreshnessAt: Date?
    let result: PickResult?
    let receiptHash: String?

    /// Confidence is entitlement-gated server-side; absent means "your tier
    /// does not see it", never "the model has no opinion".
    var isPremium: Bool { tier == .premium }
    var status: PickStatus { isGraded ? .graded : .upcoming }
    var isGraded: Bool { result?.isGraded == true }

    /// The price a reader can act on. Zero means the row carries no book price
    /// (a model-signal pick) — a real state on this surface that must never
    /// render as "+0".
    var displayOdds: String { odds == 0 ? "—" : odds.americanOdds }
    var displayConfidence: String { confidence.map { "\($0)/100" } ?? "—" }
}

// MARK: - Game

enum GameStatus: String, Codable, Hashable, Sendable {
    case scheduled = "SCHEDULED"
    case live = "LIVE"
    case final = "FINAL"
    case postponed = "POSTPONED"
    case canceled = "CANCELED"

    var isLive: Bool { self == .live }
    var isFinal: Bool { self == .final }
    var isPlayable: Bool { self == .scheduled || self == .live }

    var label: String {
        switch self {
        case .scheduled: "Scheduled"
        case .live: "Live"
        case .final: "Final"
        case .postponed: "Postponed"
        case .canceled: "Canceled"
        }
    }
}

struct Team: Identifiable, Codable, Hashable, Sendable {
    let id: String
    let name: String
    var abbreviation: String
    var logoURL: URL?
    var record: String?

    init(id: String,
         name: String,
         abbreviation: String? = nil,
         logoURL: URL? = nil,
         record: String? = nil) {
        self.id = id
        self.name = name
        self.abbreviation = abbreviation ?? Team.abbreviation(for: name)
        self.logoURL = logoURL
        self.record = record
    }

    /// "Kansas City Chiefs" → "KC". A single-word name is already an
    /// abbreviation when short, and is truncated to three characters when not
    /// — never reduced to an empty string, which is what taking the first
    /// character of each word produces for a one-word name like "Chiefs".
    static func abbreviation(for name: String) -> String {
        let words = name
            .split(whereSeparator: { $0 == " " || $0 == "-" || $0 == "." })
            .filter { !$0.isEmpty }
        guard words.count > 1 else {
            let trimmed = name.trimmingCharacters(in: .whitespaces)
            return trimmed.count <= 3
                ? trimmed.uppercased()
                : String(trimmed.prefix(3)).uppercased()
        }
        let initials = words
            .filter { $0.first.map { $0.isLetter || $0.isNumber } == true }
            .compactMap { $0.first.map(String.init) }
        return initials.isEmpty
            ? String(name.prefix(3)).uppercased()
            : initials.joined().uppercased()
    }
}

struct Game: Identifiable, Hashable, Sendable {
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
    /// Public 0–100 Edge Index the engine computes for every tracked game.
    let edgeIndex: Double?
    /// Scheduling context the engine already stores: rest days, back-to-back
    /// flags and 7-day game density, per side.
    let restDaysHome: Int?
    let restDaysAway: Int?
    let isBackToBackHome: Bool
    let isBackToBackAway: Bool

    var isFinal: Bool { status.isFinal }

    /// Only the away line is stored; the home line is its inverse.
    var homeSpread: Double? { awaySpread.map { -$0 } }

    /// True when either side is short-rested — the most actionable scheduling
    /// fact on a scoreboard, and one the engine already has.
    var hasFatigueRisk: Bool { isBackToBackHome || isBackToBackAway }
}

// MARK: - Article

struct Article: Identifiable, Hashable, Sendable {
    let id: String
    let slug: String
    let title: String
    let dek: String
    let body: String
    let author: Analyst
    let publishedAt: Date
    let heroImageURL: URL?
    let tags: [String]
    let sport: Sport?
    let readMinutes: Int
    let isPremium: Bool

    /// `/api/blog` omits the body for FREE viewers rather than sending a
    /// truncated one. A paid article behind the gate therefore decodes with an
    /// empty body and must render a paywall, never a blank read.
    var isLocked: Bool { body.isEmpty }
}

// MARK: - User

struct UserProfile: Identifiable, Hashable, Sendable {
    enum Tier: String, Codable, Hashable, Sendable {
        case free = "FREE"
        case fantasy = "FANTASY"
        case pro = "PRO"
        case elite = "ELITE"

        var label: String {
            switch self {
            case .free: "Free"
            case .fantasy: "Fantasy"
            case .pro: "Pro"
            case .elite: "Elite"
            }
        }

        /// Ranks "is this an upgrade" comparisons. An unknown tier must never
        /// sort above a known paid one.
        var rank: Int {
            switch self {
            case .free: 0
            case .fantasy: 1
            case .pro: 2
            case .elite: 3
            }
        }

        var isPaid: Bool { self != .free }
    }

    let id: String
    let displayName: String
    let email: String
    let tier: Tier
    let memberSince: Date
    let avatarURL: URL?

    var initials: String {
        let source = displayName.isEmpty ? email : displayName
        let local = source.split(separator: "@").first.map(String.init) ?? source
        let letters = local
            .split(whereSeparator: { $0 == " " || $0 == "." || $0 == "_" || $0 == "-" })
            .prefix(2)
            .compactMap { $0.first.map(String.init) }
            .joined()
        return letters.isEmpty ? "G" : letters.uppercased()
    }
}

// MARK: - User bet (locally tracked)

enum BetStatus: String, Codable, CaseIterable, Identifiable, Hashable, Sendable {
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

struct UserBet: Identifiable, Codable, Hashable, Sendable {
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

    /// Total returned including the stake on a win; the stake is returned on
    /// push/void; nothing on a loss or a still-pending bet.
    ///
    /// American odds: `+145` returns `stake * 2.45`; `-110` returns
    /// `stake * 1.909…`. A zero line is not a real price and returns 0 rather
    /// than dividing by zero.
    func payout() -> Double {
        switch status {
        case .won:
            guard odds != 0 else { return 0 }
            return odds > 0
                ? stake * (1 + Double(odds) / 100)
                : stake * (1 + 100 / Double(-odds))
        case .push, .void: return stake
        case .lost, .pending: return 0
        }
    }

    func profit() -> Double {
        switch self {
        case .won:  return payout() - stake
        case .lost: return -stake
        case .push, .void, .pending: return 0
        }
    }

    /// Break-even win rate for this price: `+145` needs 40.8%, `-110` needs
    /// 52.4%. Nil when there is no price — there is no threshold to compute.
    var breakEvenWinRate: Double? {
        guard odds != 0 else { return nil }
        return odds > 0
            ? 100 / (100 + Double(odds))
            : Double(-odds) / (Double(-odds) + 100) * 100
    }
}
