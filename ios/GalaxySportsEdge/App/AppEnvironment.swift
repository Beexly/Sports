import Foundation
import Observation

@MainActor
@Observable
final class AppEnvironment {
    let service: SportsService
    let bets: BetStore

    /// NOTE (isolation fix): default arguments are evaluated at the *call site*,
    /// which is a nonisolated context — so `bets: BetStore = BetStore()` fails
    /// with "call to main actor-isolated initializer 'init()' in a synchronous
    /// nonisolated context". Taking an optional and building inside the
    /// (main-actor-isolated) body is the only form that type-checks, and it
    /// stays injectable for tests.
    init(service: SportsService? = nil, bets: BetStore? = nil) {
        self.service = service ?? AppEnvironment.makeService()
        self.bets = bets ?? BetStore()
    }

    static func makeService() -> SportsService {
        AppConfiguration.useMockData ? MockSportsService() : LiveSportsService()
    }
}
