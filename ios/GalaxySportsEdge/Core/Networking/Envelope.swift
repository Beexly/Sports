import Foundation

/// The backend's uniform response shape.
///
/// Nearly every GSE route answers `{ success, data, meta }` on 2xx and
/// `{ success: false, error, code }` on a refusal, with a handful of older
/// routes answering `{ error }` only. Decoding through this type means a
/// 4xx never reaches a view as a half-populated model, and `meta` — which is
/// where the *real* intelligence lives (`tier`, `totalAvailableToday`,
/// `hitDailyLimit`, `canSeeConfidence`) — has somewhere to land.
struct Envelope<Value: Decodable>: Decodable {
    let success: Bool
    let data: Value?
    let meta: Meta?
    let error: String?
    let code: String?

    struct Meta: Decodable, Sendable {
        // Present on the picks / daily-slate routes.
        let tier: String?
        let total: Int?
        let totalAvailableToday: Int?
        let hitDailyLimit: Bool?
        let date: String?
        let canSeeConfidence: Bool?
        let canSeeFactorBreakdown: Bool?
        let containsSeedData: Bool?
        // Present on the blog route.
        let page: Int?
        let limit: Int?
    }

    /// A 2xx with `success: true` and a payload is the only shape a caller
    /// should treat as data. Everything else is an error, even if HTTP said OK.
    func payload() throws -> Value {
        guard success else {
            throw APIError.server(status: 200, message: error ?? "The request was refused.")
        }
        guard let data else {
            throw APIError.decoding("missing data")
        }
        return data
    }
}

/// A route that answers 204 with no body.
struct NoBody: Decodable, Sendable {
    init() {}
    init(from decoder: Decoder) throws {}
}
