import Foundation

/// Deterministic sample data for previews, the simulator and tests.
///
/// Everything here is fabricated. `MockSportsService` reports
/// `meta.containsSeedData = true` so the UI labels it, and the pick ids are
/// prefixed `sample-` so a fixture can never be mistaken for a real engine row
/// if it ever leaked into a log or a share sheet.
struct MockFixtures {

    private static let reference = Date(timeIntervalSince1970: 1_789_000_000)
    // Always written `Self.reference`. Inside a stored property's initializer
    // an unqualified `reference` happens to resolve to the static member, but
    // inside a computed property's body it resolves against the instance
    // first and fails with "static member 'reference' cannot be used on
    // instance of type 'MockFixtures'". Spelling it out is the same length and
    // does not depend on which kind of property you are in.

    var profile = UserProfile(
        id: "sample-user",
        displayName: "Sample Reader",
        email: "[EMAIL]",
        tier: .pro,
        memberSince: Self.reference.addingTimeInterval(-86_400 * 240),
        avatarURL: nil)

    var follows: [FollowedEntity] = [
        FollowedEntity(id: "sample-follow-1", kind: .team, entityId: "sample-team-1",
                       createdAt: Self.reference.addingTimeInterval(-86_400 * 9)),
        FollowedEntity(id: "sample-follow-2", kind: .player, entityId: "sample-player-1",
                       createdAt: Self.reference.addingTimeInterval(-86_400 * 3))
    ]

    // MARK: - Picks

    private struct PickBlueprint {
        let id: String
        let sport: Sport
        let league: String
        let away: String
        let home: String
        let selection: String
        let pickType: PickType
        let line: Double?
        let fairProbability: Double
        let bookmakerCount: Int
        let grade: PickGrade
        let risk: RiskLevel
        let confidence: Int
        let edgeScore: Double
        let units: Double
        let featured: Bool
        let reasoning: String
        let shortReasoning: String
        let result: PickResult?
        let factors: [PickFactor]
    }

    private static let pickBlueprints: [PickBlueprint] = [
        PickBlueprint(
            id: "sample-pick-elite-spread",
            sport: .nfl, league: "NFL",
            away: "Kansas City Chiefs", home: "Buffalo Bills",
            selection: "Chiefs -3.5", pickType: .spread, line: -3.5,
            fairProbability: 0.642, bookmakerCount: 11,
            grade: .elitePlay, risk: .lowRisk, confidence: 82,
            edgeScore: 8.4, units: 2.0, featured: true,
            reasoning: """
            The market has this at -3. Our independent read is -6.5, and the gap is \
            coming from three places that all point the same way: Buffalo's \
            backfield is down a starting tackle, the Chiefs are 8-for-9 against \
            teams over .500, and the line moved only -1 against a 3.5-point \
            consensus shift in the last 90 minutes.
            """,
            shortReasoning: "Our read is 3 points sharper than the market, with a roster gap and a split record behind it.",
            result: nil,
            factors: [
                PickFactor(key: "edge", label: "Pricing edge", value: 8.4, detail: "Net price vs fair value (0–25)"),
                PickFactor(key: "consensus", label: "Book consensus", value: 24, detail: "How tightly the books agree (0–30)"),
                PickFactor(key: "depth", label: "Market depth", value: 16, detail: "How many books cover this (0–20)"),
                PickFactor(key: "movement", label: "Line movement", value: 5, detail: "Direction and size of the move (±15)"),
                PickFactor(key: "volatility", label: "Volatility", value: -3, detail: "Thin or unstable market (0 to −15)")
            ]),

        PickBlueprint(
            id: "sample-pick-total",
            sport: .nfl, league: "NFL",
            away: "Denver Broncos", home: "New England Patriots",
            selection: "Over 44.5", pickType: .total, line: 44.5,
            fairProbability: 0.571, bookmakerCount: 9,
            grade: .strongPlay, risk: .moderate, confidence: 71,
            edgeScore: 5.1, units: 1.0, featured: false,
            reasoning: """
            Both offenses are running top-10 pace-adjusted EPA and the weather is \
            neutral. The total has sat between 43.5 and 45 all week, which is a \
            1.5-point band — narrower than the standard deviation of either \
            team's scoring variance over the last six.
            """,
            shortReasoning: "A 1.5-point week-long band is inside both teams' own scoring noise.",
            result: nil,
            factors: [
                PickFactor(key: "edge", label: "Pricing edge", value: 5.1, detail: "Net price vs fair value (0–25)"),
                PickFactor(key: "consensus", label: "Book consensus", value: 21, detail: "How tightly the books agree (0–30)"),
                PickFactor(key: "volatility", label: "Volatility", value: -5, detail: "Thin or unstable market (0 to −15)")
            ]),

        PickBlueprint(
            id: "sample-pick-moneyline",
            sport: .nba, league: "NBA",
            away: "Boston Celtics", home: "Denver Nuggets",
            selection: "Celtics ML", pickType: .moneyline, line: nil,
            fairProbability: 0.618, bookmakerCount: 14,
            grade: .solidPlay, risk: .lineSteam, confidence: 68,
            edgeScore: 3.2, units: 1.0, featured: false,
            reasoning: """
            The moneyline has steamed -180 to -150 in two hours on a single \
            injury report. Our read has not moved, so the price improved by a \
            full 30 cents of implied probability.
            """,
            shortReasoning: "A -180 to -150 steam on one injury report, against an unchanged model read.",
            result: nil,
            factors: [
                PickFactor(key: "edge", label: "Pricing edge", value: 3.2, detail: "Net price vs fair value (0–25)"),
                PickFactor(key: "movement", label: "Line movement", value: 9, detail: "Direction and size of the move (±15)"),
                PickFactor(key: "uncertainty", label: "Conflicting signals", value: -4, detail: "Uncertainty penalty (0 to −8)")
            ]),

        PickBlueprint(
            id: "sample-pick-graded",
            sport: .nfl, league: "NFL",
            away: "Seattle Seahawks", home: "Arizona Cardinals",
            selection: "Seahawks -6.5", pickType: .spread, line: -6.5,
            fairProbability: 0.704, bookmakerCount: 12,
            grade: .strongPlay, risk: .moderate, confidence: 76,
            edgeScore: 6.7, units: 1.5, featured: false,
            reasoning: """
            Graded at the price we published, not the closing line. The spread \
            moved -5.5 to -6.5 after we published, which is a +1.0 point of \
            closing-line value.
            """,
            shortReasoning: "Graded at our published price; the line moved a full point after.",
            result: .win,
            factors: [
                PickFactor(key: "edge", label: "Pricing edge", value: 6.7, detail: "Net price vs fair value (0–25)"),
                PickFactor(key: "movement", label: "Line movement", value: 7, detail: "Direction and size of the move (±15)")
            ])
    ]

    /// A day of picks. The slate varies with the day so the date strip is not a
    /// row of identical screens in a preview.
    func picks(on date: Date) -> [Pick] {
        let day = Calendar.current.ordinality(of: .day, in: .era, for: date) ?? 0
        let start = day % 2 == 0 ? 0 : 1
        return (start..<Self.pickBlueprints.count)
            .map { Self.makePick(Self.pickBlueprints[$0], day: date) }
    }

    private static func makePick(_ blueprint: PickBlueprint, day: Date) -> Pick {
        let home = Team(id: "\(blueprint.id):home", name: blueprint.home)
        let away = Team(id: "\(blueprint.id):away", name: blueprint.away)
        let kickoff = day.startOfDay.addingTimeInterval(20 * 3600)

        return Pick(
            id: blueprint.id,
            sport: blueprint.sport,
            league: blueprint.league,
            eventName: "\(blueprint.away) @ \(blueprint.home)",
            homeTeam: blueprint.home,
            awayTeam: blueprint.away,
            homeAbbr: home.abbreviation,
            awayAbbr: away.abbreviation,
            selection: blueprint.selection,
            pickType: blueprint.pickType,
            line: blueprint.line,
            odds: OddsMath.americanFromProbability(blueprint.fairProbability) ?? 0,
            hasBookPrice: true,
            units: blueprint.units,
            analyst: .desk,
            confidence: blueprint.confidence,
            edgeScore: blueprint.edgeScore,
            dataQualityScore: 91,
            tier: .premium,
            grade: blueprint.grade,
            risk: blueprint.risk,
            reasoning: blueprint.reasoning,
            reasoningShort: blueprint.shortReasoning,
            consensusPct: blueprint.fairProbability * 100 - 4.1,
            bookmakerCount: blueprint.bookmakerCount,
            marketImpliedProb: blueprint.fairProbability - 0.031,
            winProbability: blueprint.fairProbability,
            lineMovement: blueprint.line.map { LineMovement(opening: $0 - 1, current: $0) },
            factors: blueprint.factors,
            isFeatured: blueprint.featured,
            isAuditAvailable: true,
            commenceTime: kickoff,
            generatedAt: kickoff.addingTimeInterval(-4 * 3600),
            dataFreshnessAt: kickoff.addingTimeInterval(-90 * 60),
            result: blueprint.result,
            receiptHash: "sample-receipt-" + blueprint.id)
    }

    // MARK: - Games

    func games(on date: Date) -> [Game] {
        let kickoff = date.startOfDay.addingTimeInterval(20 * 3600)
        return [
            Game(id: "sample-game-1", sport: .nfl, league: "NFL",
                 away: Team(id: "g1:a", name: "Kansas City Chiefs"),
                 home: Team(id: "g1:h", name: "Buffalo Bills"),
                 awayScore: 17, homeScore: 24,
                 status: .live, commenceTime: kickoff,
                 awaySpread: 3.5, total: 46.5,
                 edgeIndex: 78, restDaysHome: 3, restDaysAway: 7,
                 isBackToBackHome: false, isBackToBackAway: true),
            Game(id: "sample-game-2", sport: .nfl, league: "NFL",
                 away: Team(id: "g2:a", name: "Seattle Seahawks"),
                 home: Team(id: "g2:h", name: "Arizona Cardinals"),
                 awayScore: 31, homeScore: 10,
                 status: .final, commenceTime: kickoff.addingTimeInterval(-3 * 3600),
                 awaySpread: -6.5, total: 45.5,
                 edgeIndex: 61, restDaysHome: 4, restDaysAway: 4,
                 isBackToBackHome: false, isBackToBackAway: false),
            Game(id: "sample-game-3", sport: .nba, league: "NBA",
                 away: Team(id: "g3:a", name: "Boston Celtics"),
                 home: Team(id: "g3:h", name: "Denver Nuggets"),
                 awayScore: nil, homeScore: nil,
                 status: .scheduled, commenceTime: kickoff.addingTimeInterval(3600),
                 awaySpread: -4.5, total: 228.5,
                 edgeIndex: 44, restDaysHome: 2, restDaysAway: 2,
                 isBackToBackHome: false, isBackToBackAway: false)
        ]
    }

    // MARK: - Articles

    var articles: [Article] {
        [
            Article(
                id: "sample-article-1", slug: "how-we-grade-every-pick",
                title: "How We Grade Every Pick",
                dek: "Our methodology, our unit sizing, and why we publish the losses.",
                body: """
                Transparency is the entire product. Every pick is logged at the \
                price we recommend, timestamped, and graded against the closing \
                line — not the opening line, which is the number a backtester \
                gets to choose after the fact.

                Grading at the closing line is the harder test. If a pick only \
                wins because the line moved toward it, the model did not find \
                anything; the market found it and paid us for being early. We \
                report closing-line value separately for exactly that reason.
                """,
                author: .desk,
                publishedAt: Self.reference.addingTimeInterval(-3600 * 5),
                heroImageURL: nil,
                tags: ["Methodology"],
                sport: nil,
                readMinutes: 4,
                isPremium: false),

            Article(
                id: "sample-article-2", slug: "the-defensive-gap-nobody-priced",
                title: "The Defensive Gap Nobody Priced",
                dek: "Three teams have separated themselves defensively, and the market hasn't caught up.",
                body: """
                Over the last ten games, the gap between the best and worst \
                rim-protecting teams has widened to a degree we have not seen \
                since the 2019 season. That is a market inefficiency.
                """,
                author: .desk,
                publishedAt: Self.reference.addingTimeInterval(-3600 * 9),
                heroImageURL: nil,
                tags: ["NBA", "Defense"],
                sport: .nba,
                readMinutes: 5,
                isPremium: false),

            Article(
                id: "sample-article-3", slug: "player-props-the-undervalued-market",
                title: "Player Props: The Undervalued Market",
                dek: "Books adjust prop lines more slowly than sides and totals. Here is how to exploit it.",
                body: """
                Prop markets are less efficient than game markets for a simple \
                structural reason: they attract less sharp money. A side is \
                priced by every desk in the world; a third-team prop is priced \
                by whoever opened it and whoever is still awake.
                """,
                author: .desk,
                publishedAt: Self.reference.addingTimeInterval(-3600 * 22),
                heroImageURL: nil,
                tags: ["Props", "Strategy"],
                sport: .nfl,
                readMinutes: 8,
                isPremium: true)
        ]
    }
}
