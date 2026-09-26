import Foundation

/// Deterministic sample content so the app runs end-to-end before the API exists.
struct MockSportsService: SportsService {

    private func hours(_ h: Double) -> Date { Date().addingTimeInterval(h * 3600) }

    private var analysts: [Analyst] {
        [
            Analyst(id: "a1", name: "Marcus Vale", handle: "@marcusvale",
                    avatarURL: nil, title: "Lead NFL Analyst"),
            Analyst(id: "a2", name: "Priya Raman", handle: "@priyaraman",
                    avatarURL: nil, title: "NBA Senior Writer"),
            Analyst(id: "a3", name: "Dante Cruz", handle: "@dantecruz",
                    avatarURL: nil, title: "MLB & Player Props"),
            Analyst(id: "a4", name: "Sloane Whitaker", handle: "@sloanew",
                    avatarURL: nil, title: "College Football")
        ]
    }

    func picks(sport: Sport?, date: Date) async throws -> [Pick] {
        try? await Task.sleep(nanoseconds: 550_000_000)

        let all: [Pick] = [
            Pick(id: "p1", sport: .nfl, league: "NFL",
                 eventName: "Chiefs @ Bills", selection: "Chiefs +2.5",
                 odds: -110, confidence: 88, units: 2.0, analyst: analysts[0],
                 reasoning: """
                 Kansas City has covered in six of their last seven road games \
                 against top-ten DVOA defenses, and Buffalo's secondary is still \
                 missing its slot corner. The market has overcorrected on the \
                 Bills' home-field advantage here — this line opened at -1 and \
                 has been steamed two full points on public money.

                 Mahomes is 14-3 ATS as a road underdog in his career. The total \
                 has also dropped, which historically correlates with the dog \
                 covering in this matchup profile. I'd play this down to +1.
                 """,
                 commenceTime: hours(6), status: .upcoming, result: nil,
                 isPremium: false, homeAbbr: "BUF", awayAbbr: "KC"),

            Pick(id: "p2", sport: .nba, league: "NBA",
                 eventName: "Lakers @ Celtics", selection: "Celtics -4.5",
                 odds: -108, confidence: 74, units: 1.5, analyst: analysts[1],
                 reasoning: """
                 Boston is 21-6 ATS at home off a loss under this staff. LA is on \
                 the second night of a back-to-back and travels cross-country. \
                 The rim-protection edge is the whole story — Boston is allowing \
                 the lowest opponent FG% at the rim in the league over the last \
                 ten games.
                 """,
                 commenceTime: hours(9), status: .upcoming, result: nil,
                 isPremium: false, homeAbbr: "BOS", awayAbbr: "LAL"),

            Pick(id: "p3", sport: .nba, league: "NBA",
                 eventName: "Nuggets @ Suns", selection: "Jokic Over 28.5 PTS",
                 odds: +102, confidence: 81, units: 1.0, analyst: analysts[1],
                 reasoning: """
                 Phoenix has no answer for Denver's two-man game and has been \
                 switching everything, which puts Jokic on a mismatch every \
                 possession. He's cleared this number in 9 of 11 meetings.
                 """,
                 commenceTime: hours(11), status: .upcoming, result: nil,
                 isPremium: true, homeAbbr: "PHX", awayAbbr: "DEN"),

            Pick(id: "p4", sport: .nhl, league: "NHL",
                 eventName: "Oilers @ Rangers", selection: "Over 6.5 Goals",
                 odds: -115, confidence: 69, units: 1.0, analyst: analysts[2],
                 reasoning: """
                 Both teams are top-five in expected goals generated and both \
                 are on the tail end of a road trip. Two backup goaltenders \
                 are confirmed. The number should be 7.
                 """,
                 commenceTime: hours(3), status: .live, result: nil,
                 isPremium: false, homeAbbr: "NYR", awayAbbr: "EDM"),

            Pick(id: "p5", sport: .mlb, league: "MLB",
                 eventName: "Dodgers @ Padres", selection: "Dodgers ML",
                 odds: -142, confidence: 77, units: 2.0, analyst: analysts[2],
                 reasoning: """
                 Pitching edge is significant and the Padres bullpen has thrown \
                 the third-most innings in baseball over the last two weeks.
                 """,
                 commenceTime: hours(-20), status: .graded, result: .win,
                 isPremium: false, homeAbbr: "SD", awayAbbr: "LAD"),

            Pick(id: "p6", sport: .ncaaf, league: "NCAAF",
                 eventName: "Georgia @ Alabama", selection: "Georgia -3",
                 odds: -110, confidence: 72, units: 1.5, analyst: analysts[3],
                 reasoning: """
                 Alabama's offensive line has allowed pressure on 31% of dropbacks \
                 against ranked opponents this season. Georgia's front seven \
                 is the best unit on the field.
                 """,
                 commenceTime: hours(-44), status: .graded, result: .loss,
                 isPremium: true, homeAbbr: "ALA", awayAbbr: "UGA"),

            Pick(id: "p7", sport: .nfl, league: "NFL",
                 eventName: "49ers @ Cowboys", selection: "Under 44.5",
                 odds: -110, confidence: 66, units: 1.0, analyst: analysts[0],
                 reasoning: """
                 Two of the slowest-paced offenses in the league, both coming off \
                 a short week. Wind is forecast at 18mph.
                 """,
                 commenceTime: hours(-68), status: .graded, result: .win,
                 isPremium: false, homeAbbr: "DAL", awayAbbr: "SF")
        ]

        guard let sport else { return all }
        return all.filter { $0.sport == sport }
    }

    func games(sport: Sport?, date: Date) async throws -> [Game] {
        try? await Task.sleep(nanoseconds: 400_000_000)

        func team(_ id: String, _ name: String, _ abbr: String, _ rec: String? = nil) -> Team {
            Team(id: id, name: name, abbreviation: abbr, logoURL: nil, record: rec, ranking: nil)
        }

        let all: [Game] = [
            Game(id: "g1", sport: .nfl, league: "NFL",
                 away: team("kc", "Kansas City Chiefs", "KC", "11-3"),
                 home: team("buf", "Buffalo Bills", "BUF", "10-4"),
                 awayScore: nil, homeScore: nil,
                 status: .scheduled, commenceTime: hours(6),
                 awaySpread: 2.5, total: 48.5),

            Game(id: "g2", sport: .nba, league: "NBA",
                 away: team("lal", "Los Angeles Lakers", "LAL", "18-14"),
                 home: team("bos", "Boston Celtics", "BOS", "24-8"),
                 awayScore: nil, homeScore: nil,
                 status: .scheduled, commenceTime: hours(9),
                 awaySpread: 4.5, total: 224.5),

            Game(id: "g3", sport: .nhl, league: "NHL",
                 away: team("edm", "Edmonton Oilers", "EDM", "21-12-2"),
                 home: team("nyr", "New York Rangers", "NYR", "23-11-1"),
                 awayScore: 3, homeScore: 2,
                 status: .live(period: "2nd", clock: "08:41"),
                 commenceTime: hours(-1),
                 awaySpread: nil, total: 6.5),

            Game(id: "g4", sport: .nba, league: "NBA",
                 away: team("den", "Denver Nuggets", "DEN", "20-12"),
                 home: team("phx", "Phoenix Suns", "PHX", "17-15"),
                 awayScore: 58, homeScore: 61,
                 status: .live(period: "3rd", clock: "04:12"),
                 commenceTime: hours(-1.5),
                 awaySpread: -2.0, total: 231.5),

            Game(id: "g5", sport: .mlb, league: "MLB",
                 away: team("lad", "Los Angeles Dodgers", "LAD", "94-62"),
                 home: team("sd", "San Diego Padres", "SD", "88-68"),
                 awayScore: 6, homeScore: 3,
                 status: .final, commenceTime: hours(-20),
                 awaySpread: -1.5, total: 8.0),

            Game(id: "g6", sport: .ncaaf, league: "NCAAF",
                 away: team("uga", "Georgia Bulldogs", "UGA", "12-1"),
                 home: team("ala", "Alabama Crimson Tide", "ALA", "11-2"),
                 awayScore: 24, homeScore: 27,
                 status: .final, commenceTime: hours(-44),
                 awaySpread: -3.0, total: 51.0),

            Game(id: "g7", sport: .nfl, league: "NFL",
                 away: team("sf", "San Francisco 49ers", "SF", "9-5"),
                 home: team("dal", "Dallas Cowboys", "DAL", "8-6"),
                 awayScore: 20, homeScore: 17,
                 status: .final, commenceTime: hours(-68),
                 awaySpread: -1.0, total: 44.5),

            Game(id: "g8", sport: .nba, league: "NBA",
                 away: team("mil", "Milwaukee Bucks", "MIL", "19-13"),
                 home: team("nyk", "New York Knicks", "NYK", "21-12"),
                 awayScore: nil, homeScore: nil,
                 status: .scheduled, commenceTime: hours(12.5),
                 awaySpread: 3.0, total: 219.5)
        ]

        guard let sport else { return all }
        return all.filter { $0.sport == sport }
    }

    func articles(page: Int, limit: Int) async throws -> [Article] {
        try? await Task.sleep(nanoseconds: 450_000_000)
        return Array(allArticles.prefix(limit))
    }

    func article(id: String) async throws -> Article {
        try? await Task.sleep(nanoseconds: 300_000_000)
        guard let a = allArticles.first(where: { $0.id == id }) else {
            throw APIError.notFound
        }
        return a
    }

    func profile() async throws -> UserProfile {
        try? await Task.sleep(nanoseconds: 250_000_000)
        return UserProfile(
            id: "u1",
            displayName: "Edge Member",
            email: "member@galaxysportsedge.com",
            tier: .edgePro,
            memberSince: Date().addingTimeInterval(-60 * 60 * 24 * 214),
            avatarURL: nil)
    }

    func toggleSave(pickID: String, saved: Bool) async throws {
        try? await Task.sleep(nanoseconds: 150_000_000)
    }

    private var allArticles: [Article] {
        [
            Article(id: "n1",
                title: "The Market Is Wrong About Buffalo",
                dek: "Why the Bills' home-field edge is being priced as a full field goal when it's closer to one point.",
                body: """
                There's a persistent assumption in NFL markets that home field is \
                worth a flat three points. That number was accurate in the 1990s. \
                It is not accurate now.

                Across the last three seasons, the league-average home-field \
                advantage sits closer to 1.8 points, and for teams with loud but \
                not elite atmospheres it's lower still. Buffalo is a genuinely \
                difficult place to play — but the market has already taxed that \
                advantage twice over.

                ## What the numbers say

                When you strip out primetime games and control for opponent \
                quality, the Bills' home edge over the last two years lands at \
                roughly 2.1 points. The current line implies something closer to 4.

                That gap is the entire bet.

                ## The counterargument

                Kansas City's offensive line has been inconsistent in pass \
                protection, and Buffalo's edge rushers are healthy for the first \
                time since September. If you believe pressure rate is the single \
                most predictive stat in football — and there's a good case that \
                it is — this is a live underdog.

                The number has already moved two points. I'd still play it at +1.
                """,
                author: analysts[0],
                publishedAt: Date().addingTimeInterval(-3600 * 3),
                heroImageURL: nil,
                tags: ["NFL", "Market Analysis"],
                readMinutes: 6,
                isPremium: false),

            Article(id: "n2",
                title: "NBA Rim Protection Is the Only Stat That Matters Right Now",
                dek: "Three teams have separated themselves defensively, and the market hasn't caught up.",
                body: """
                Over the last ten games, the gap between the best and worst \
                rim-protecting teams has widened to a degree we haven't seen \
                since the 2019 season. That's a market inefficiency.
                """,
                author: analysts[1],
                publishedAt: Date().addingTimeInterval(-3600 * 9),
                heroImageURL: nil,
                tags: ["NBA", "Defense"],
                readMinutes: 5,
                isPremium: false),

            Article(id: "n3",
                title: "Player Props: The Undervalued Market",
                dek: "Books are slower to adjust prop lines than sides and totals. Here's how to exploit it.",
                body: """
                Prop markets are less efficient than game markets for a simple \
                structural reason: they attract less sharp money.
                """,
                author: analysts[2],
                publishedAt: Date().addingTimeInterval(-3600 * 22),
                heroImageURL: nil,
                tags: ["Props", "Strategy"],
                readMinutes: 8,
                isPremium: true),

            Article(id: "n4",
                title: "College Football Conference Championship Preview",
                dek: "Four games, four edges, and one that we're passing on entirely.",
                body: "Championship weekend is historically one of the softest \
                markets of the year because casual money floods in.",
                author: analysts[3],
                publishedAt: Date().addingTimeInterval(-3600 * 30),
                heroImageURL: nil,
                tags: ["NCAAF", "Preview"],
                readMinutes: 7,
                isPremium: false),

            Article(id: "n5",
                title: "How We Grade Every Pick",
                dek: "Our methodology, our unit sizing, and why we publish losses.",
                body: """
                Transparency is the entire product. Every pick is logged at the \
                price we recommend, timestamped, and graded against the closing line.
                """,
                author: analysts[0],
                publishedAt: Date().addingTimeInterval(-3600 * 52),
                heroImageURL: nil,
                tags: ["Methodology"],
                readMinutes: 4,
                isPremium: false)
        ]
    }
}
