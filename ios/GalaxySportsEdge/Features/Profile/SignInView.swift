import SwiftUI

/// Sign in.
///
/// The flow is NextAuth's own sign-in page in a web view — there is no native
/// credential form, because the backend has no password provider and inventing
/// one would mean storing passwords the app has no business holding. The
/// reader signs in with Google, exactly as they do on the website.
struct SignInView: View {

    @Environment(AppEnvironment.self) private var env
    @Environment(\.dismiss) private var dismiss

    @State private var isWorking = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()

                if isWorking {
                    signInWebView
                } else {
                    explanation
                }
            }
            .navigationTitle("Sign in")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        isWorking = false
                        dismiss()
                    }
                    .font(.system(size: 14, weight: .medium))
                    .tint(Theme.text2)
                }
            }
            .alert("Sign-in problem",
                   isPresented: Binding(get: { errorMessage != nil },
                                        set: { if !$0 { errorMessage = nil } })) {
                Button("OK", role: .cancel) { errorMessage = nil }
            } message: {
                Text(errorMessage ?? "")
            }
        }
    }

    private var explanation: some View {
        VStack(spacing: Theme.S.xl) {
            Spacer()

            ZStack {
                Circle().fill(Theme.nebula)
                Image(systemName: "person.crop.circle.badge.checkmark")
                    .font(.system(size: 40, weight: .light))
                    .foregroundStyle(.black)
            }
            .frame(width: 96, height: 96)

            VStack(spacing: Theme.S.sm) {
                Text("Sign in to Galaxy Sports Edge")
                    .font(.display(22, .heavy))
                    .foregroundStyle(Theme.text)
                    .multilineTextAlignment(.center)
                Text("Your account unlocks confidence, the factor trail, line movement, and the ask-the-model box. The public slate does not need an account.")
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.text2)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.horizontal, Theme.S.lg)

            Spacer()

            Button {
                errorMessage = nil
                isWorking = true
            } label: {
                HStack(spacing: Theme.S.sm) {
                    Image(systemName: "globe")
                    Text("Continue with Google")
                }
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(.black)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .background(Capsule().fill(Theme.nebula))
            }
            .buttonStyle(.plain)
            .padding(.horizontal, Theme.S.lg)

            Text("Sign-in happens on galaxysportsedge.com. The app receives only the session cookie and sends it back to our own API — it never sees or stores your Google credentials.")
                .font(.system(size: 11))
                .foregroundStyle(Theme.text3)
                .multilineTextAlignment(.center)
                .padding(.horizontal, Theme.S.lg)
                .padding(.bottom, Theme.S.lg)
        }
    }

    private var signInWebView: some View {
        SignInWebView { cookies in
            Task { @MainActor in
                isWorking = false
                guard let cookies else {
                    // A nil jar means the reader backed out. Closing the sheet
                    // is the right response; an error would be noise.
                    dismiss()
                    return
                }
                let ok = await env.auth.adopt(jar: cookies)
                if ok {
                    dismiss()
                } else {
                    errorMessage = env.auth.lastError
                        ?? "Sign-in did not complete. Please try again."
                }
            }
        }
        .ignoresSafeArea(edges: .bottom)
    }
}
