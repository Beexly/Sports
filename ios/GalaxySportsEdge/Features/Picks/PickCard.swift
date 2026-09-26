import SwiftUI

struct PickCard: View {
    let pick: Pick
    var isSaved: Bool = false
    var onSave: (() -> Void)? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.S.md) {

            // Header row
            HStack(spacing: Theme.S.sm) {
                Pill(text: pick.league, tint: Theme.violet, icon: pick.sport.icon)

                if pick.isPremium {
                    Pill(text: "Premium", tint: Theme.cyan, filled: false,
                         icon: "lock.fill")
                }

                Spacer()

                statusBadge
            }

            // Matchup + selection
            VStack(alignment: .leading, spacing: 6) {
                Text(pick.eventName)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Theme.text2)

                HStack(alignment: .firstTextBaseline, spacing: Theme.S.sm) {
                    Text(pick.selection)
                        .font(.display(21, .heavy))
                        .foregroundStyle(Theme.text)
                        .lineLimit(2)

                    Spacer(minLength: 0)

                    Text(pick.odds.americanOdds)
                        .font(.num(16, .bold))
                        .foregroundStyle(oddsTint)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 5)
                        .background(
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .fill(oddsTint.opacity(0.13))
                        )
                }
            }

            ConfidenceMeter(value: pick.confidence, tint: pick.isPremium ? Theme.cyan : Theme.violet)

            Divider().overlay(Theme.stroke)

            // Footer
            HStack(spacing: Theme.S.sm) {
                AsyncLogo(url: pick.analyst.avatarURL,
                          text: pick.analyst.initials, size: 28, tint: Theme.cyan)

                VStack(alignment: .leading, spacing: 1) {
                    Text(pick.analyst.name)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Theme.text)
                    Text(pick.analyst.handle)
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.text3)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 1) {
                    Text("\(pick.units, specifier: "%.1f")u")
                        .font(.num(13, .bold))
                        .foregroundStyle(Theme.text)
                    Text(Fmt.kickoffLabel(pick.commenceTime))
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.text3)
                }

                if let onSave {
                    Button(action: onSave) {
                        Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(isSaved ? Theme.violet : Theme.text3)
                            .frame(width: 30, height: 30)
                            .background(Circle().fill(Color.white.opacity(0.05)))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .card()
    }

    private var oddsTint: Color {
        pick.odds > 0 ? Theme.win : Theme.text
    }

    @ViewBuilder
    private var statusBadge: some View {
        if pick.isGraded, let result = pick.result {
            Pill(text: result.label, tint: result.tint, filled: true)
        } else if pick.status == .live {
            HStack(spacing: 4) {
                Circle().fill(Theme.loss).frame(width: 6, height: 6)
                Text("LIVE")
                    .font(.system(size: 10, weight: .heavy))
                    .tracking(0.6)
                    .foregroundStyle(Theme.loss)
            }
        } else {
            Text(Fmt.kickoffLabel(pick.commenceTime))
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(Theme.text3)
        }
    }
}

extension PickResult {
    var tint: Color {
        switch self {
        case .win: Theme.win
        case .loss: Theme.loss
        case .push: Theme.push
        case .void: Theme.text3
        }
    }
}
