import SwiftUI

/// A single read.
///
/// Takes a slug and a list preview rather than a fully-populated article,
/// because the list row does not carry the body — the server withholds it from
/// FREE viewers. The detail screen re-fetches, so a reader who upgrades while
/// the row is on screen sees the body appear instead of a permanent blank.
struct ArticleDetailView: View {

    @Environment(AppEnvironment.self) private var env

    let slug: String
    let preview: Article

    @State private var state: LoadState<Article> = .idle
    @State private var showPaywall = false

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: Theme.S.lg) {
                    hero

                    if case .loaded(let article) = state {
                        body_(article)
                    } else if case .loading = state {
                        LoadingView().frame(height: 240)
                    } else if case .failed(let message) = state {
                        ErrorStateView(message: message) {
                            Task { await load() }
                        }
                        .frame(height: 240)
                    } else {
                        // Nothing loaded yet; the preview is enough to render
                        // the header without a flash of empty screen.
                        headerOnly
                    }
                }
                .padding(.bottom, Theme.S.xxl)
            }
        }
        .navigationTitle(preview.title)
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .sheet(isPresented: $showPaywall) { PaywallView() }
    }

    // MARK: - Load

    private func load() async {
        // A cached row that already has its body needs no second request.
        if !preview.isLocked, case .none = state { return }
        state = .loading
        do {
            state = .loaded(try await env.service.article(slug: slug))
        } catch {
            state = .failed(PicksViewModel.message(for: error))
        }
    }

    // MARK: - Pieces

    private var hero: some View {
        ZStack {
            Theme.aurora
            RadialGradient(colors: [Theme.violet.opacity(0.4), .clear],
                           center: .topTrailing,
                           startRadius: 10, endRadius: 300)
            Image(systemName: "sparkles")
                .font(.system(size: 44, weight: .ultraLight))
                .foregroundStyle(Theme.violet.opacity(0.5))
        }
        .frame(height: 150)
        .clipped()
    }

    @ViewBuilder
    private var headerOnly: some View {
        VStack(alignment: .leading, spacing: Theme.S.md) {
            Text(preview.title)
                .font(.display(26, .heavy))
                .foregroundStyle(Theme.text)
            if !preview.dek.isEmpty {
                Text(preview.dek)
                    .font(.system(size: 15))
                    .foregroundStyle(Theme.text2)
            }
        }
        .padding(.horizontal, Theme.S.lg)
    }

    @ViewBuilder
    private func body_(_ article: Article) -> some View {
        VStack(alignment: .leading, spacing: Theme.S.lg) {

            VStack(alignment: .leading, spacing: Theme.S.md) {
                Text(article.title)
                    .font(.display(26, .heavy))
                    .foregroundStyle(Theme.text)
                    .fixedSize(horizontal: false, vertical: true)

                if !article.dek.isEmpty {
                    Text(article.dek)
                        .font(.system(size: 15))
                        .foregroundStyle(Theme.text2)
                        .fixedSize(horizontal: false, vertical: true)
                }

                byline(article)
            }
            .padding(.horizontal, Theme.S.lg)

            if article.isLocked {
                // The server sent no body. That is a paywall, not an empty
                // post, and the screen says which tier would open it.
                lockedBody
            } else {
                Text(article.body)
                    .font(.system(size: 15))
                    .foregroundStyle(Theme.text2)
                    .lineSpacing(5)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, Theme.S.lg)
            }
        }
    }

    private func byline(_ article: Article) -> some View {
        HStack(spacing: Theme.S.sm) {
            AsyncLogo(url: article.author.avatarURL,
                      text: article.author.initials, size: 30, tint: Theme.cyan)
            VStack(alignment: .leading, spacing: 1) {
                Text(article.author.name)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.text)
                HStack(spacing: 4) {
                    Text(Fmt.relative.localizedString(for: article.publishedAt, relativeTo: .now))
                    if article.readMinutes > 0 {
                        Text("·")
                        Text("\(article.readMinutes) min")
                    }
                }
                .font(.system(size: 11))
                .foregroundStyle(Theme.text3)
            }
            Spacer(minLength: 0)
        }
    }

    private var lockedBody: some View {
        VStack(spacing: Theme.S.lg) {
            Image(systemName: "lock.fill")
                .font(.system(size: 26))
                .foregroundStyle(Theme.cyan)
            VStack(spacing: 6) {
                Text("Pro")
                    .font(.display(20, .heavy))
                    .foregroundStyle(Theme.text)
                Text("This breakdown is available on Pro and above.")
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.text2)
                    .multilineTextAlignment(.center)
            }
            Button {
                showPaywall = true
            } label: {
                Text("See plans")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        RoundedRectangle(cornerRadius: Theme.R.md, style: .continuous)
                            .fill(Theme.nebula)
                    )
            }
            .buttonStyle(.plain)
        }
        .padding(Theme.S.xl)
        .frame(maxWidth: .infinity)
        .card(corner: Theme.R.lg)
        .padding(.horizontal, Theme.S.lg)
    }
}
