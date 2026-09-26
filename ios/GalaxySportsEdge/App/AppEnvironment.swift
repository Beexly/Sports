import Foundation
import Observation

@MainActor
@Observable
final class AppEnvironment {
    let service: SportsService
    let bets: BetStore

    init(service: SportsService? = nil, bets: BetStore = BetStore()) {
        self.service = service ?? (AppConfiguration.useMockData
                                   ? MockSportsService()
                                   : LiveSportsService())
        self.bets = bets
    }
}
