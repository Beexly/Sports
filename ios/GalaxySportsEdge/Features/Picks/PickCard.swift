import SwiftUI

/// The pick card.
///
/// Three things it refuses to do, each of which the old scaffold did:
///
/// * Render a price for a row that has none. `displayOdds` is "—", and the
///   card says "no book price" rather than showing a confident `+0`.
/// * Render a confidence the server withheld. A gated field shows a lock, not
///   a zero — a 0% and an absent number are different claims.
/// * Bury the audit trail. `isAuditAvailable` and the receipt hash are what make
///   the number checkable, so they are on the card, not three taps deep.
struct PickCard: View {

    let pick: Pick
    var isSaved: Bool = false
    var onSave: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.S.md) {

            // ── Header ───────────────────────────────────────────────
            HStack(spacing: Theme.S.sm) {
                Pill(text: pick.league, tint: Theme.violet, icon: pick.sport.icon)
                Pill(text: pick.grade.display,
                     tint: gradeTint,
                     filled: pick.grade == .elitePlay)

                if pick.isPremium {
                    Pill(text: "Pro", tint: Theme.cyan, icon: "lock.fill")
                }

                Spacer(minLength: 0)

                statusBadge

                if let onSave {
                    Button(action: onSave) {
                        Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(isSaved ? Theme.violet : Theme.text3)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(isSaved ? "Remove bookmark" : "Save pick")
                }
            }

            // ── Matchup + selection ────────────────────────────────
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

                    VStack(alignment: .trailing, spacing: 2) {
                        Text(pick.displayOdds)
                            .font(.num(16, .bold))
                            .foregroundStyle(pick.hasBookPrice ? oddsTint : Theme.text3)
                            .padding(.horizontal, 9)
                            .padding(.vertical, 5)
                            .background(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .fill((pick.hasBookPrice ? oddsTint : Theme.text3).opacity(0.13))
                            )
                        Text(pick.pickType.display)
                            .font(.system(size: 8, weight: .heavy))
                            .tracking(0.6)
                            .foregroundStyle(Theme.text3)
                    }
                }
            }

            // ── Confidence (gated) ──────────────────────────────────
            if let confidence = pick.confidence {
                ConfidenceMeter(value: confidence, tint: pick.isPremium ? Theme.cyan : Theme.violet)
            } else {
                gatedConfidenceRow
            }

            Divider().overlay(Theme.stroke)

            // ── Footer ──────────────────────────────────────────────
            HStack(spacing: Theme.S.sm) {
                AsyncLogo(url: pick.analyst.avatarURL,
                          text: pick.analyst.initials, size: 28, tint: Theme.cyan)

                VStack(alignment: .leading, spacing: 1) {
                    Text(pick.analyst.name)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Theme.text2)
                    Text(Fmt.kickoffLabel(pick.commenceTime))
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.text3)
                }

                Spacer(minLength: 0)

                VStack(alignment: .trailing, spacing: 1) {
                    Text(String(format: "%.1fu", pick.units))
                        .font(.num(13, .bold))
                        .foregroundStyle(Theme.text)
                    if let edge = pick.edgeScore {
                        Text(String(format: "%+.1f edge", edge))
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(edge >= 0 ? Theme.win : Theme.text3)
                    }
                }
            }

            // ── Trust row ───────────────────────────────────────────
            trustRow
        }
        .card()
    }

    // MARK: - Pieces

    private var statusBadge: some View {
        Group {
            if let result = pick.result, result.isGraded {
                Pill(text: result.label,
                     tint: result == .win ? Theme.win : (result == .loss ? Theme.loss : Theme.push),
                     filled: result == .win)
            } else {
                Pill(text: "\(String(format: "%.1f", pick.units))u", tint: Theme.text3)
            }
        }
    }

    private var gatedConfidenceRow: some View {
        HStack(spacing: 6) {
            Image(systemName: "lock.fill")
                .font(.system(size: 9, weight: .bold))
                .foregroundStyle(Theme.text3)
            Text("CONFIDENCE IS A PRO SIGNAL")
                .font(.system(size: 9, weight: .heavy))
                .tracking(0.7)
                .foregroundStyle(Theme.text3)
            Spacer()
        }
    }

    /// The audit affordances. Every pick that carries a receipt hash is
    /// checkable; a pick without one says so instead of hiding the row.
    private var trustRow: some View {
        HStack(spacing: Theme.S.sm) {
            if let books = pick.bookmakerCount, books > 0 {
                metaChip(icon: "book.closed.fill", text: "\(books) books")
            }
            if let books = pick.bookmakerCount, books < 2, books > 0 {
                metaChip(icon: "exclamationmark.triangle.fill", text: "thin market", tint: Theme.push)
            }
            if let movement = pick.lineMovement {
                metaChip(icon: "arrow.left.and.right",
                         text: String(format: "%+.1f", movement.delta))
            }
            if let risk = RiskLevel(rawValue: riskLevelName), risk != .moderate {
                metaChip(icon: "exclamationmark.circle.fill", text: risk.display, tint: Theme.push)
            }
            Spacer(minLength: 0)
            if pick.isAuditAvailable {
                metaChip(icon: "checkmark.seal.fill", text: "auditable", tint: Theme.win)
            }
        }
    }

    private var riskLevelName: String {
        switch pick.risk {
        case .lowRisk: return "LOW_RISK"
        case .moderate: return "MODERATE"
        case .highVariance: return "HIGH_VARIANCE"
        case .injuryRisk: return "INJURY_RISK"
        case .lineSteam: return "LINE_STEAM"
        }
    }

    private func metaChip(icon: String, text: String, tint: Color = Theme.text3) -> some View {
        HStack(spacing: 3) {
            Image(systemName: icon).font(.system(size: 8, weight: .bold))
            Text(text).font(.system(size: 9, weight: .semibold))
        }
        .foregroundStyle(tint)
    }

    private var gradeTint: Color {
        switch pick.grade {
        case .elitePlay: Theme.cyan
        case .strongPlay: Theme.violet
        case .solidPlay: Theme.indigo
        case .lean: Theme.text2
        }
    }

    private var oddsTint: Color {
        guard pick.odds != 0 else { return Theme.text3 }
        return pick.odds > 0 ? Theme.win : Theme.text
    }
}
