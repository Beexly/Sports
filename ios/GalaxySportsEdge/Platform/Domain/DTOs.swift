import Foundation

/// Wire types, and their mapping into the domain.
///
/// These mirror the real `GET /api/picks`, `GET /api/games` and `GET /api/blog`
/// payloads. Three rules hold throughout:
///
/// 1. **Decoding is permissive, mapping is strict.** A field the API may drop
///    (gated confidence, an absent factor, an unknown enum member) decodes as
///    optional or falls back to a documented default, so one new server field
///    or one entitlement change cannot turn the whole slate into an error
///    screen. The mapping then decides what a nil actually means.
/// 2. **No invented numbers.** A missing price stays absent. The app never
///    fabricates a book price, a record, or a confidence to fill a hole.
/// 3. **Unknown enum members degrade, they do not throw.** The engine adds
///    `PickGrade` / `RiskLevel` members; an old app must render a slate, not
///    fail, when it meets one.

// MARK: - Pick

struct PickDTO: Decodable, Sendable {
    struct GameRef: Decodable, Sendable {
        let homeTeam: String
        let awayTeam: String
        let commenceTime: Date
        let sport: String
    }

    struct Movement: Decodable, Sendable {
        let opening: Double
        let current: Double
    }

    /// `marketImplied` is the deprecated alias the API still emits alongside
    /// `winProbability`; both are resolved from one server-side function, so
    /// when both arrive they must agree. A disagreement means the API
    /// regressed, and the app prefers the current field.
    struct MarketProbability: Decodable, Sendable {
        let prob: Double?
        let value: Double?
        let bookmakerCount: Int?
        let books: Int?
        let basis: String?
        let method: String?

        var resolvedProbability: Double? { prob ?? value }
        var resolvedBooks: Int? { bookmakerCount ?? books }
    }

    struct FactorBreakdownDTO: Decodable, Sendable {
        let marketPriceShapeScore: Double?
        let consensusScore: Double?
        let marketDepthScore: Double?
        let edgeScore: Double?
        let lineMovementScore: Double?
        let volatilityPenalty: Double?
        let headToHeadScore: Double?
        let venueFormScore: Double?
        let uncertaintyPenalty: Double?
        let crossMarketScore: Double?
    }

    let id: String
    let game: GameRef
    let pickType: String
    let selection: String
    let line: Double?
    let hasBookPrice: Bool
    let marketImplied: MarketProbability?
    let winProbability: MarketProbability?
    let lineMovement: Movement?
    let confidence: Int?
    let confidenceCalibrated: Double?
    let edgeScore: Double?
    let factorBreakdown: FactorBreakdownDTO?
    let dataQualityScore: Double?
    let tier: String?
    let pickGrade: String?
    let riskLevel: String?
    let reasoning: String?
    let reasoningShort: String?
    let consensusPct: Double?
    let bookmakerCount: Int?
    let consensusProvider: String?
    let consensusEvidence: String?
    let isFeatured: Bool?
    let isAuditAvailable: Bool?
    let generatedAt: Date
    let dataFreshnessAt: Date?
    let result: String?
    let receiptHash: String?
}

extension PickDTO {

    func toDomain(units: Double = 1.0) -> Pick {
        let sport = Sport.matchingBackendName(game.sport)
        let home = Team(id: "\(id):home", name: game.homeTeam)
        let away = Team(id: "\(id):away", name: game.awayTeam)

        let deVigged = winProbability?.resolvedProbability
        let marketImplied = marketImplied?.resolvedProbability
        let fairProbability = deVigged ?? marketImplied
        // `self.` on the right: the local `marketImplied` above is the
        // resolved Double and shadows the DTO property of the same name, so an
        // unqualified `marketImplied?.resolvedBooks` is a Double being asked
        // for a property it does not have.
        let books = winProbability?.resolvedBooks ?? self.marketImplied?.resolvedBooks

        return Pick(
            id: id,
            sport: sport,
            league: game.sport,
            eventName: "\(game.awayTeam) @ \(game.homeTeam)",
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            homeAbbr: home.abbreviation,
            awayAbbr: away.abbreviation,
            selection: selection,
            pickType: PickType(rawValue: pickType) ?? .spread,
            line: line,
            // A row with no book price stays priceless. Deriving a quote from
            // the model's own probability and rendering it as a market price
            // would be the app quoting itself.
            odds: hasBookPrice
                ? fairProbability.flatMap(OddsMath.americanFromProbability) ?? 0
                : 0,
            hasBookPrice: hasBookPrice,
            units: units,
            analyst: .desk,
            confidence: confidence,
            edgeScore: edgeScore,
            dataQualityScore: dataQualityScore ?? 0,
            tier: PickTier(rawValue: tier ?? "") ?? .free,
            grade: PickGrade(rawValue: pickGrade ?? "") ?? .lean,
            risk: RiskLevel(rawValue: riskLevel ?? "") ?? .moderate,
            reasoning: reasoning,
            reasoningShort: reasoningShort,
            consensusPct: consensusPct,
            bookmakerCount: books ?? bookmakerCount,
            marketImpliedProb: marketImplied,
            winProbability: deVigged,
            lineMovement: lineMovement.map { LineMovement(opening: $0.opening, current: $0.current) },
            factors: factorBreakdown?.factors() ?? [],
            isFeatured: isFeatured ?? false,
            isAuditAvailable: isAuditAvailable ?? false,
            commenceTime: game.commenceTime,
            generatedAt: generatedAt,
            dataFreshnessAt: dataFreshnessAt,
            result: result.flatMap(PickResult.init(rawValue:)),
            receiptHash: receiptHash)
    }
}

extension PickDTO.FactorBreakdownDTO {

    /// Flattens the breakdown into displayable rows, dropping the members the
    /// server omitted. The key order is fixed so the trail does not reshuffle
    /// between refreshes.
    func factors() -> [PickFactor] {
        var rows: [PickFactor] = []
        func add(_ key: String, _ label: String, _ value: Double?, _ detail: String) {
            guard let value else { return }
            rows.append(PickFactor(key: key, label: label, value: value, detail: detail))
        }
        add("edge", "Pricing edge", edgeScore, "Net price vs fair value (0–25)")
        add("consensus", "Book consensus", consensusScore, "How tightly the books agree (0–30)")
        add("depth", "Market depth", marketDepthScore, "How many books cover this (0–20)")
        add("shape", "Market shape", marketPriceShapeScore, "No-vig shape of the quoted prices (0–25)")
        add("movement", "Line movement", lineMovementScore, "Direction and size of the move (±15)")
        add("h2h", "Head-to-head ATS", headToHeadScore, "ATS record between these teams (±5)")
        add("venue", "Venue form", venueFormScore, "Picked team's home/road ATS (±5)")
        add("crossMarket", "Spread vs moneyline", crossMarketScore, "Do the two markets agree (−3…+4)")
        add("uncertainty", "Conflicting signals", uncertaintyPenalty, "Uncertainty penalty (0 to −8)")
        add("volatility", "Volatility", volatilityPenalty, "Thin or unstable market (0 to −15)")
        return rows
    }
}

// MARK: - Slate

/// The `meta` block the picks route returns. It carries the entitlement facts
/// the UI needs to explain *why* something is missing, which is the difference
/// between "no edge today" and "your tier cannot see this".
struct SlateMeta: Sendable, Hashable {
    var tier: UserProfile.Tier = .free
    var total: Int = 0
    var totalAvailableToday: Int = 0
    var hitDailyLimit: Bool = false
    var dayKey: String?
    var canSeeConfidence: Bool = false
    var canSeeFactorBreakdown: Bool = false
    var containsSeedData: Bool = false

    /// Picks withheld from this viewer because of the FREE daily cap. Shown as
    /// an honest "3 more today — go Pro" row, never silently truncated.
    var withheldCount: Int { max(0, totalAvailableToday - total) }
}

extension Envelope.Meta {
    func toSlateMeta() -> SlateMeta {
        SlateMeta(
            tier: tier.flatMap(UserProfile.Tier.init(rawValue:)) ?? .free,
            total: total ?? 0,
            totalAvailableToday: totalAvailableToday ?? 0,
            hitDailyLimit: hitDailyLimit ?? false,
            dayKey: date,
            canSeeConfidence: canSeeConfidence ?? false,
            canSeeFactorBreakdown: canSeeFactorBreakdown ?? false,
            containsSeedData: containsSeedData ?? false)
    }
}

// MARK: - Game

struct GameDTO: Decodable, Sendable {
    let id: String
    let sport: String
    let league: String?
    let homeTeam: String
    let awayTeam: String
    let homeScore: Int?
    let awayScore: Int?
    let status: String
    let commenceTime: Date
    let awaySpread: Double?
    let total: Double?
    let edgeIndex: Double?
    let restDaysHome: Int?
    let restDaysAway: Int?
    let isBackToBackHome: Bool?
    let isBackToBackAway: Bool?
}

extension GameDTO {
    func toDomain() -> Game {
        Game(
            id: id,
            sport: Sport.matchingBackendName(sport),
            league: league ?? sport,
            away: Team(id: "\(id):away", name: awayTeam),
            home: Team(id: "\(id):home", name: homeTeam),
            awayScore: awayScore,
            homeScore: homeScore,
            status: GameStatus(rawValue: status.uppercased()) ?? .scheduled,
            commenceTime: commenceTime,
            awaySpread: awaySpread,
            total: total,
            edgeIndex: edgeIndex,
            restDaysHome: restDaysHome,
            restDaysAway: restDaysAway,
            isBackToBackHome: isBackToBackHome ?? false,
            isBackToBackAway: isBackToBackAway ?? false)
    }
}

// MARK: - Article

struct ArticleDTO: Decodable, Sendable {
    let id: String
    let title: String
    let slug: String
    let excerpt: String?
    let content: String?
    let sport: String?
    let tags: [String]?
    let publishedAt: Date?
    let isFeatured: Bool?
    let seoTitle: String?
    let seoDescription: String?
}

extension ArticleDTO {
    /// `content` is null for a FREE viewer, which is the paywall signal: the
    /// article is *locked*, not empty.
    func toDomain() -> Article {
        let body = content ?? ""
        let words = body.split(whereSeparator: { $0 == " " || $0 == "\n" }).count
        return Article(
            id: id,
            slug: slug,
            title: seoTitle ?? title,
            dek: seoDescription ?? excerpt ?? "",
            body: body,
            author: .desk,
            publishedAt: publishedAt ?? .distantPast,
            heroImageURL: nil,
            tags: tags ?? [],
            sport: sport.map(Sport.matchingBackendName),
            // 220 wpm is the usual editorial estimate. A locked article has no
            // body to measure, so it reports 0 rather than inventing a length.
            readMinutes: body.isEmpty ? 0 : max(1, Int((Double(words) / 220).rounded(.up))),
            isPremium: body.isEmpty)
    }
}

// MARK: - Profile

struct MeDTO: Decodable, Sendable {
    struct EntitlementsDTO: Decodable, Sendable {
        let tier: String?
        let canSeeConfidence: Bool?
        let canSeeFactorBreakdown: Bool?
        let canSeeLineMovement: Bool?
        let canSeePremiumPicks: Bool?
        let canSeeEdgeScore: Bool?
    }

    let id: String
    let name: String?
    let email: String
    let image: String?
    let tier: String?
    let memberSince: Date?
    let createdAt: Date?
    let entitlements: EntitlementsDTO?
}

extension MeDTO {
    func toDomain() -> UserProfile {
        UserProfile(
            id: id,
            displayName: name ?? email.split(separator: "@").first.map(String.init) ?? email,
            email: email,
            tier: UserProfile.Tier(rawValue: entitlements?.tier ?? tier ?? "FREE") ?? .free,
            memberSince: memberSince ?? createdAt ?? .distantPast,
            avatarURL: image.flatMap(URL.init(string:)))
    }
}

// MARK: - Watchlist

struct WatchlistEntryDTO: Decodable, Sendable {
    let id: String
    let entityType: String
    let entityId: String
    let createdAt: Date?
}

// MARK: - Explanation (ask the model)

struct ExplanationDTO: Decodable, Sendable {
    let success: Bool?
    let explanation: String
    let modelName: String?
    let register: String?
}
