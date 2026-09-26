import Foundation

extension Int {
    var americanOdds: String { self > 0 ? "+\(self)" : "\(self)" }
}

extension Double {
    var signedCurrency: String {
        let sign = self > 0 ? "+" : self < 0 ? "-" : ""
        return "\(sign)$\(String(format: "%.2f", abs(self)))"
    }
    var signedUnits: String {
        String(format: "%@%.2fu", self > 0 ? "+" : "", self)
    }
}

enum Fmt {
    static let kickoff: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "h:mm a"
        return f
    }()

    static let dayShort: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEE"
        return f
    }()

    static let dayNum: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "d"
        return f
    }()

    static let medium: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        return f
    }()

    static let relative: RelativeDateTimeFormatter = {
        let f = RelativeDateTimeFormatter()
        f.unitsStyle = .abbreviated
        return f
    }()

    static func kickoffLabel(_ date: Date) -> String {
        if Calendar.current.isDateInToday(date) { return kickoff.string(from: date) }
        if Calendar.current.isDateInTomorrow(date) { return "Tmrw \(kickoff.string(from: date))" }
        return "\(dayShort.string(from: date)) \(kickoff.string(from: date))"
    }
}

extension Date {
    var startOfDay: Date { Calendar.current.startOfDay(for: self) }
    func adding(days: Int) -> Date {
        Calendar.current.date(byAdding: .day, value: days, to: self) ?? self
    }
}
