import SwiftUI

struct ArticleDetailView: View {
    let article: Article
    @State private var showPaywall = false

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: Theme.S.lg) {

                    ZStack {
                        Theme.aurora
                        RadialGradient(colors: [Theme.violet.opacity(0.4), .clear],
                                       center: .topTrailing,
                                       startRadius: 10, endRadius: 300)
                        Image(systemName: "sparkles")
                            .font(.system(size: 44, weight: .ultraLight))
                            .foregroundStyle(.white.opacity(0.3))
                    }
                    .frame(height: 200)

                    VStack(alignment: .leading, spacing: Theme.S.md) {
                        HStack(spacing: Theme.S.sm) {
                            ForEach(article.tags, id: \.self) { tag in
                                Pill(text: tag, tint: Theme.violet)
                            }
                            Spacer()
                        }

                        Text(article.title)
                            .font(.display(28, .heavy))
                            .foregroundStyle(Theme.text)
                            .fixedSize(horizontal: false, vertical: true)

                        Text(article.dek)
                            .font(.system(size: 16))
                            .foregroundStyle(Theme.text2)
                            .lineSpacing(4)
                            .fixedSize(horizontal: false, vertical: true)

                        HStack(spacing: Theme.S.sm) {
                            AsyncLogo(url: article.author.avatarURL,
                                      text: article.author.initials, size: 36, tint: Theme.cyan)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(article.author.name)
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(Theme.text)
                                Text("\(Fmt.medium.string(from: article.publishedAt)) · \(article.readMinutes) min read")
                                    .font(.system(size: 11))
                                    .foregroundStyle(Theme.text3)
                            }
                        }
                        .padding(.top, Theme.S.xs)

                        Divider().overlay(Theme.stroke).padding(.vertical, Theme.S.xs)

                        if article.isPremium {
                            premiumGate
                        } else {
                            bodyContent
                        }
                    }
                    .padding(.horizontal, Theme.S.lg)
                    .padding(.bottom, Theme.S.xxl)
                }
            }
            .scrollIndicators(.hidden)
            .ignoresSafeArea(edges: .top)
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                ShareLink(item: article.title) {
                    Image(systemName: "square.and.arrow.up").tint(Theme.violet)
                }
            }
        }
    }

    private var bodyContent: some View {
        VStack(alignment: .leading, spacing: Theme.S.lg) {
            ForEach(Array(article.body
                .components(separatedBy: "\n\n")
                .enumerated()), id: \.offset) { _, paragraph in

                if paragraph.hasPrefix("## ") {
                    Text(paragraph.replacingOccurrences(of: "## ", with: ""))
                        .font(.display(19, .bold))
                        .foregroundStyle(Theme.text)
                        .padding(.top, Theme.S.sm)
                } else {
                    Text(attributed(paragraph))
                        .font(.system(size: 16))
                        .foregroundStyle(Theme.text2)
                        .lineSpacing(7)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    private var premiumGate: some View {
        VStack(spacing: Theme.S.lg) {
            Image(systemName: "lock.fill")
                .font(.system(size: 26))
                .foregroundStyle(Theme.cyan)
            VStack(spacing: 6) {
                Text("Edge Pro")
                    .font(.display(20, .heavy))
                    .foregroundStyle(Theme.text)
                Text("This breakdown is available to Edge Pro members.")
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.text2)
                    .multilineTextAlignment(.center)
            }
            Button {
                showPaywall = true
            } label: {
                Text("Unlock")
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
        .alert("Edge Pro", isPresented: $showPaywall) {
            Button("Not Now", role: .cancel) { }
            Button("Subscribe") { }
        } message: {
            Text("Subscriptions are wired up in a later step — hook this to StoreKit 2.")
        }
    }

    private func attributed(_ text: String) -> AttributedString {
        (try? AttributedString(markdown: text)) ?? AttributedString(text)
    }
}
