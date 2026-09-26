import SwiftUI

/// Account deletion — App Store guideline 5.1.1(v).
///
/// The screen states exactly what is deleted and exactly what is not. A
/// confirmation that does not say "this removes your account" is not a
/// confirmation, it is a surprise. On success it deliberately does not close:
/// the reader lands on a terminal "your account is gone" state, because there
/// is no account left to be inside.
struct DeleteAccountView: View {

    @Environment(AppEnvironment.self) private var env
    @Environment(\.dismiss) private var dismiss

    @State private var confirmation = ""
    @State private var isWorking = false
    @State private var failure: String?
    @State private var didDelete = false

    /// Typed phrase required before the destructive button arms. Typing
    /// "DELETE" is a deliberate act; a two-tap confirm is not.
    static let phrase = "DELETE"

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()
                if didDelete { deletedState } else { form }
            }
            .navigationTitle("Delete account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                        .font(.system(size: 14, weight: .medium))
                        .tint(Theme.text2)
                }
            }
        }
        .interactiveDismissDisabled(isWorking)
    }

    // MARK: - Form

    private var form: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.S.xl) {

                VStack(alignment: .leading, spacing: Theme.S.md) {
                    HStack(spacing: Theme.S.sm) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(Theme.loss)
                        Text("This cannot be undone")
                            .font(.display(17, .heavy))
                            .foregroundStyle(Theme.text)
                    }
                    Text("Deleting removes your account and everything attached to it. There is no backup and no restore.")
                        .font(.system(size: 14))
                        .foregroundStyle(Theme.text2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .card()

                VStack(alignment: .leading, spacing: Theme.S.md) {
                    SectionHeader(title: "What gets deleted")
                    bullet("Your account and sign-in sessions", icon: "person.fill.xmark")
                    bullet("Your watchlist — teams and players", icon: "bookmark.fill")
                    bullet("Your push notification registration", icon: "bell.fill")
                    bullet("Your subscription record", icon: "creditcard.fill")
                }
                .card()

                VStack(alignment: .leading, spacing: Theme.S.md) {
                    SectionHeader(title: "What stays on this iPhone")
                    Text("Your bet log and saved picks live locally and were never on our servers, so we cannot delete them for you. Open My Bets after this and remove anything you want gone.")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.text2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .card()

                VStack(alignment: .leading, spacing: Theme.S.sm) {
                    Text("Type \(Self.phrase) to confirm")
                        .font(.system(size: 11, weight: .bold))
                        .tracking(0.6)
                        .foregroundStyle(Theme.text3)
                    TextField("", text: $confirmation)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                        .font(.num(15, .bold))
                        .foregroundStyle(Theme.text)
                        .padding(Theme.S.md)
                        .background(
                            RoundedRectangle(cornerRadius: Theme.R.md, style: .continuous)
                                .fill(Theme.surface)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: Theme.R.md, style: .continuous)
                                .strokeBorder(isArmed ? Theme.loss : Theme.stroke, lineWidth: 1)
                        )
                }
                .card()

                if let failure {
                    HStack(spacing: Theme.S.sm) {
                        Image(systemName: "exclamationmark.circle.fill")
                            .foregroundStyle(Theme.loss)
                        Text(failure)
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.text2)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .card(padding: Theme.S.md)
                }

                Button {
                    Task { await delete() }
                } label: {
                    if isWorking {
                        ProgressView().tint(.white)
                    } else {
                        Text("Delete my account")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(.white)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(
                    RoundedRectangle(cornerRadius: Theme.R.md, style: .continuous)
                        .fill(Theme.loss.opacity(isArmed ? 1 : 0.35))
                )
                .buttonStyle(.plain)
                .disabled(!isArmed || isWorking)
            }
            .padding(Theme.S.lg)
        }
    }

    private var isArmed: Bool {
        confirmation.trimmingCharacters(in: .whitespaces).uppercased() == Self.phrase
    }

    private func bullet(_ text: String, icon: String) -> some View {
        HStack(spacing: Theme.S.sm) {
            Image(systemName: icon)
                .font(.system(size: 11))
                .foregroundStyle(Theme.text3)
                .frame(width: 18)
            Text(text)
                .font(.system(size: 13))
                .foregroundStyle(Theme.text2)
            Spacer(minLength: 0)
        }
    }

    // MARK: - Terminal state

    private var deletedState: some View {
        VStack(spacing: Theme.S.lg) {
            Spacer()
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 52))
                .foregroundStyle(Theme.win)
            Text("Your account is deleted")
                .font(.display(20, .heavy))
                .foregroundStyle(Theme.text)
            Text("Everything listed above is gone. The app starts fresh on next launch.")
                .font(.system(size: 14))
                .foregroundStyle(Theme.text2)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Theme.S.xl)
            Spacer()
            Button("Done") { dismiss() }
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(.black)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(Capsule().fill(Theme.nebula))
                .padding(.horizontal, Theme.S.lg)
                .padding(.bottom, Theme.S.lg)
        }
    }

    // MARK: - Action

    private func delete() async {
        guard isArmed, !isWorking else { return }
        isWorking = true
        defer { isWorking = false }

        // Drop the push registration while there is still a session to do it
        // with; the server has no other way to know this device should stop.
        await env.push.unregister()

        switch await env.auth.deleteAccount() {
        case .success:
            didDelete = true
        case .failure(let reason):
            failure = reason.message
        }
    }
}
