import SwiftUI
import Observation

@MainActor
@Observable
final class ArticlesViewModel {
    private let service: SportsService
    var state: LoadState<[Article]> = .idle

    init(service: SportsService) { self.service = service }

    func load() async {
        state = .loading
        do { state = .loaded(try await service.articles(page: 1, limit: 20)) }
        catch {
            state = .failed((error as? APIError)?.errorDescription ?? error.localizedDescription)
        }
    }
}

struct ArticlesView: View {
    @Environment(AppEnvironment.self) private var env
    @State private var vm: ArticlesViewModel?

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()
                if let vm {
                    AsyncContent(state: vm.state, retry: { await vm.load() }) { articles in
                        ScrollView {
                            LazyVStack(spacing: Theme.S.lg) {
                                if let lead = articles.first {
                                    NavigationLink(value: lead) {
                                        FeaturedArticleCard(article: lead)
                                    }
                                    .buttonStyle(.plain)
                                }

                                ForEach(articles.dropFirst()) { article in
                                    NavigationLink(value: article) {
                                        ArticleRow(article: article)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, Theme.S.lg)
                            .padding(.bottom, Theme.S.xxl)
                        }
                        .scrollIndicators(.hidden)
                        .refreshable { await vm.load() }
                    }
                } else {
                    LoadingView()
                }
            }
            .navigationTitle("Reads")
            .navigationBarTitleDisplayMode(.large)
            .navigationDestination(for: Article.self) { ArticleDetailView(article: $0) }
            .task {
                if vm == nil {
                    let created = ArticlesViewModel(service: env.service)
                    vm = created
                    await created.load()
                }
            }
        }
    }
}

// MARK: - Cards

struct FeaturedArticleCard: View {
    let article: Article

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ZStack {
                // NOTE (Motif fix): LinearGradient has no `.opacity(_:)` —
                // opacity is applied to the view instead.
                Theme.nebula
                RadialGradient(colors: [.white.opacity(0.25), .clear],
                               center: .topLeading, startRadius: 4, endRadius: 220)
                Image(systemName: "sparkles")
                    .font(.system(size: 40, weight: .light))
                    .foregroundStyle(.white.opacity(0.35))
            }
            .frame(height: 168)
            .opacity(0.9)
            .clipped()

            VStack(alignment: .leading, spacing: Theme.S.sm) {
                HStack(spacing: Theme.S.sm) {
                    Pill(text: "Featured", tint: .black, filled: true)
                    if article.isPremium {
                        Pill(text: "Premium", tint: Theme.cyan, icon: "lock.fill")
                    }
                    Spacer()
                }

                Text(article.title)
                    .font(.display(20, .heavy))
                    .foregroundStyle(Theme.text)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)

                Text(article.dek)
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.text2)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                HStack(spacing: Theme.S.sm) {
                    AsyncLogo(url: article.author.avatarURL,
                              text: article.author.initials, size: 22, tint: Theme.cyan)
                    Text(article.author.name)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Theme.text2)
                    Text("·").foregroundStyle(Theme.text3)
                    Text("\(article.readMinutes) min")
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.text3)
                    Spacer()
                }
                .padding(.top, 2)
            }
            .padding(Theme.S.lg)
        }
        .background(Theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: Theme.R.lg, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.R.lg, style: .continuous)
                .strokeBorder(Theme.stroke, lineWidth: 1)
        )
    }
}

struct ArticleRow: View {
    let article: Article

    var body: some View {
        HStack(alignment: .top, spacing: Theme.S.md) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Text(article.tags.first ?? "Analysis")
                        .font(.system(size: 10, weight: .heavy))
                        .tracking(0.6)
                        .foregroundStyle(Theme.violet)
                    if article.isPremium {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(Theme.cyan)
                    }
                }

                Text(article.title)
                    .font(.display(16, .bold))
                    .foregroundStyle(Theme.text)
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)

                Text(article.dek)
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.text2)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                HStack(spacing: 6) {
                    Text(article.author.name)
                    Text("·")
                    Text("\(article.readMinutes) min")
                    Text("·")
                    Text(Fmt.relative.localizedString(for: article.publishedAt, relativeTo: .now))
                }
                .font(.system(size: 11))
                .foregroundStyle(Theme.text3)
                .padding(.top, 2)
            }

            Spacer(minLength: 0)

            // NOTE (Motif fix): LinearGradient has no `.opacity(_:)` —
            // opacity is applied to the view instead.
            RoundedRectangle(cornerRadius: Theme.R.sm, style: .continuous)
                .fill(Theme.nebula)
                .opacity(0.35)
                .frame(width: 78, height: 78)
                .overlay(
                    Image(systemName: "newspaper.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(.white.opacity(0.5))
                )
        }
        .card()
    }
}
