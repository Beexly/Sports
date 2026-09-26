import SwiftUI

struct AddBetView: View {
    @Environment(AppEnvironment.self) private var env
    @Environment(\.dismiss) private var dismiss

    @State private var eventName = ""
    @State private var selection = ""
    @State private var oddsText = "-110"
    @State private var stakeText = "100"
    @State private var sportsbook = ""
    @State private var status: BetStatus = .pending
    @State private var notes = ""

    private let books = ["DraftKings", "FanDuel", "BetMGM", "Caesars", "PointsBet", "Other"]

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: Theme.S.lg) {
                        group("The Bet") {
                            field("Event", text: $eventName, placeholder: "Lakers @ Celtics")
                            field("Selection", text: $selection, placeholder: "Celtics -4.5")
                        }

                        group("Numbers") {
                            HStack(spacing: Theme.S.md) {
                                numericField("Odds", text: $oddsText, placeholder: "-110")
                                numericField("Stake ($)", text: $stakeText, placeholder: "100")
                            }
                            if let payout = projectedPayout {
                                HStack {
                                    Text("To return")
                                        .font(.system(size: 13))
                                        .foregroundStyle(Theme.text2)
                                    Spacer()
                                    Text(payout)
                                        .font(.num(15, .bold))
                                        .foregroundStyle(Theme.win)
                                }
                                .padding(.top, 2)
                            }
                        }

                        group("Book") {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: Theme.S.sm) {
                                    ForEach(books, id: \.self) { book in
                                        Button {
                                            sportsbook = book
                                        } label: {
                                            Text(book)
                                                .font(.system(size: 13, weight: .semibold))
                                                .foregroundStyle(sportsbook == book ? .black : Theme.text2)
                                                .padding(.horizontal, 14)
                                                .padding(.vertical, 9)
                                                .background(
                                                    Capsule().fill(sportsbook == book
                                                        ? AnyShapeStyle(Theme.nebula)
                                                        : AnyShapeStyle(Theme.surfaceHi))
                                                )
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                        }

                        group("Status") {
                            HStack(spacing: Theme.S.sm) {
                                ForEach(BetStatus.allCases) { s in
                                    Button {
                                        status = s
                                    } label: {
                                        Text(s.label)
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundStyle(status == s ? .black : Theme.text2)
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 9)
                                            .background(
                                                RoundedRectangle(cornerRadius: Theme.R.sm, style: .continuous)
                                                    .fill(status == s
                                                        ? AnyShapeStyle(Theme.nebula)
                                                        : AnyShapeStyle(Theme.surfaceHi))
                                            )
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                    .padding(Theme.S.lg)
                    .padding(.bottom, 90)
                }
            }
            .navigationTitle("Add Bet")
            .navigationBarTitleDisplayMode(.inline)
            .safeAreaInset(edge: .bottom) { saveBar }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }.tint(Theme.text2)
                }
            }
        }
    }

    // MARK: Pieces

    private func group<C: View>(_ title: String,
                                @ViewBuilder content: () -> C) -> some View {
        VStack(alignment: .leading, spacing: Theme.S.md) {
            Text(title.uppercased())
                .font(.system(size: 10, weight: .heavy))
                .tracking(1)
                .foregroundStyle(Theme.text3)
            content()
        }
        .card()
    }

    private func field(_ label: String, text: Binding<String>,
                       placeholder: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Theme.text3)
            TextField("", text: text, prompt: Text(placeholder).foregroundStyle(Theme.text3))
                .font(.system(size: 15))
                .foregroundStyle(Theme.text)
                .padding(.horizontal, 12)
                .padding(.vertical, 11)
                .background(
                    RoundedRectangle(cornerRadius: Theme.R.sm, style: .continuous)
                        .fill(Theme.surfaceHi)
                )
        }
    }

    private func numericField(_ label: String, text: Binding<String>,
                              placeholder: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Theme.text3)
            TextField("", text: text, prompt: Text(placeholder).foregroundStyle(Theme.text3))
                .font(.num(15, .semibold))
                .foregroundStyle(Theme.text)
                .keyboardType(.numbersAndPunctuation)
                .padding(.horizontal, 12)
                .padding(.vertical, 11)
                .background(
                    RoundedRectangle(cornerRadius: Theme.R.sm, style: .continuous)
                        .fill(Theme.surfaceHi)
                )
        }
    }

    private var saveBar: some View {
        Button {
            save()
        } label: {
            Text("Save Bet")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(.black)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(
                    RoundedRectangle(cornerRadius: Theme.R.md, style: .continuous)
                        .fill(canSave ? AnyShapeStyle(Theme.nebula)
                                      : AnyShapeStyle(Color.white.opacity(0.12)))
                )
        }
        .buttonStyle(.plain)
        .disabled(!canSave)
        .padding(.horizontal, Theme.S.lg)
        .padding(.top, Theme.S.md)
        .padding(.bottom, Theme.S.sm)
        .background(.ultraThinMaterial)
    }

    private var canSave: Bool {
        !eventName.trimmingCharacters(in: .whitespaces).isEmpty &&
        !selection.trimmingCharacters(in: .whitespaces).isEmpty &&
        (Double(stakeText) ?? 0) > 0 &&
        Int(oddsText) != nil
    }

    private var projectedPayout: String? {
        guard let stake = Double(stakeText), let odds = Int(oddsText), stake > 0 else {
            return nil
        }
        let multiplier = odds > 0 ? 1 + Double(odds) / 100
                                  : 1 + 100 / Double(-odds)
        return "$" + String(format: "%.2f", stake * multiplier)
    }

    private func save() {
        let bet = UserBet(
            eventName: eventName.trimmingCharacters(in: .whitespaces),
            selection: selection.trimmingCharacters(in: .whitespaces),
            odds: Int(oddsText) ?? -110,
            stake: Double(stakeText) ?? 0,
            sportsbook: sportsbook.isEmpty ? "—" : sportsbook,
            placedAt: .now,
            status: status,
            notes: notes)
        env.bets.add(bet)
        dismiss()
    }
}
