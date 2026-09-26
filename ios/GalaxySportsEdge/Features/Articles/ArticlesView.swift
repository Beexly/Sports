import SwiftUI
import Observation

/// The Reads tab, backed by `GET /api/blog` — the real editorial feed, with the
/// server's own paywall applied. A FREE viewer receives every post's title,
/// dek and tags but a `null` body; that is the paywall signal, and the list
/// labels which posts are behind it rather than hiding them.
struct ArticlesView: View {

    @Environment(AppEnvironment.self) private var env
    @State private var vm: ArticlesViewModel?

    private let pageSize = 20

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()
                if let vm { content(vm) } else { LoadingView() }
            }
            .navigationTitle("Reads")
            .navigationBarTitleDisplayMode(.large)
            .task {
                if vm == nil {
                    let created = ArticlesViewModel(service: env.service, pageSize: pageSize)
                    vm = created
                    await created.load()
                }
            }
        }
    }

    @ViewBuilder
    private func content(_ vm: ArticlesViewModel) -> some View {
        ScrollView {
            LazyVStack(spacing: Theme.S.lg) {
                AsyncContent(state: vm.state, retry: { await vm.load() }) { articles in
                    if articles.isEmpty {
                        EmptyStateView(
                            icon: "newspaper",
                            title: "Nothing published",
                            message: "No posts on the desk yet. Check back soon.")
                            .frame(height: 320)
                    } else {
                        LazyVStack(spacing: Theme.S.md) {
                            ForEach(articles) { article in
                                NavigationLink(value: article) {
                                    ArticleCard(article: article)
                                }
                                .buttonStyle(.plain)
                            }

                            if vm.hasMore {
                                Button {
                                    Task { await vm.loadMore() }
                                } label: {
                                    Text(vm.isLoadingMore ? "Loading…" : "Load more")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(Theme.violet)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, Theme.S.md)
                                }
                                .buttonStyle(.plain)
                                .disabled(vm.isLoadingMore)
                            }
                        }
                        .padding(.horizontal, Theme.S.lg)
                        .padding(.bottom, Theme.S.xxl)
                    }
                }
            }
        }
        .scrollIndicators(.hidden)
        .refreshable { await vm.reload() }
        .background(Theme.bg)
        .navigationDestination(for: Article.self) { article in
            ArticleDetailView(slug: article.slug, preview: article)
        }
    }
}

// MARK: - View model

@MainActor
@Observable
final class ArticlesViewModel {

    private let service: SportsService
    private let pageSize: Int

    var state: LoadState<[Article]> = .idle
    var isLoadingMore = false
    /// Paging stops when a page comes back short, which is the server saying
    /// "that was the last one". Guessing a total instead is how a feed loops
    /// forever on a page boundary.
    private(set) var reachedEnd = false

    init(service: SportsService, pageSize: Int = 20) {
        self.service = service
        self.pageSize = pageSize
    }

    private var articles: [Article] {
        if case .loaded(let rows) = state { return rows }
        return []
    }

    var hasMore: Bool { !reachedEnd && !articles.isEmpty }

    /// How many rows are loaded right now. Exposed for tests: `articles` stays
    /// private because the view is meant to reach rows through `state`, and
    /// paging is exactly the behaviour worth asserting without building a view.
    var stateCount: Int { articles.count }

    func load() async {
        state = .loading
        do {
            let page = try await service.articles(page: 1, limit: pageSize)
            reachedEnd = page.count < pageSize
            state = .loaded(page)
        } catch {
            state = .failed(PicksViewModel.message(for: error))
        }
    }

    func loadMore() async {
        guard !isLoadingMore, hasMore else { return }
        isLoadingMore = true
        defer { isLoadingMore = false }
        do {
            let next = try await service.articles(page: articles.count / pageSize + 1,
                                                  limit: pageSize)
            reachedEnd = next.count < pageSize
            state = .loaded(articles + next)
        } catch {
            // A failed "load more" must not wipe the list the reader is already
            // reading. Keep what is on screen.
            state = .loaded(articles)
        }
    }

    func reload() async {
        reachedEnd = false
        await load()
    }
}

// MARK: - Card

struct ArticleCard: View {
    let article: Article

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.S.sm) {
            HStack(spacing: Theme.S.sm) {
                if let sport = article.sport {
                    Pill(text: sport.display, tint: Theme.violet, icon: sport.icon)
                }
                ForEach(article.tags.prefix(2), id: \.self) { tag in
                    Pill(text: tag, tint: Theme.text3)
                }
                Spacer(minLength: 0)
                if article.isPremium {
                    Pill(text: "Pro", tint: Theme.cyan, icon: "lock.fill")
                }
            }

            Text(article.title)
                .font(.display(17, .bold))
                .foregroundStyle(Theme.text)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)

            if !article.dek.isEmpty {
                Text(article.dek)
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.text2)
                    .multilineTextAlignment(.leading)
                    .lineLimit(3)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack(spacing: 6) {
                Text(Fmt.relative.localizedString(for: article.publishedAt, relativeTo: .now))
                if article.readMinutes > 0 {
                    Text("·")
                    Text("\(article.readMinutes) min read")
                }
                Spacer(minLength: 0)
            }
            .font(.system(size: 11))
            .foregroundStyle(Theme.text3)
            .padding(.top, 2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card()
    }
}
