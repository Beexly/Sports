import SwiftUI

// MARK: - Card

private struct CardStyle: ViewModifier {
    var padding: CGFloat
    var corner: CGFloat
    var fill: Color

    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: corner, style: .continuous).fill(fill)
            )
            .overlay(
                RoundedRectangle(cornerRadius: corner, style: .continuous)
                    .strokeBorder(Theme.stroke, lineWidth: 1)
            )
    }
}

extension View {
    func card(padding: CGFloat = Theme.S.lg,
              corner: CGFloat = Theme.R.lg,
              fill: Color = Theme.surface) -> some View {
        modifier(CardStyle(padding: padding, corner: corner, fill: fill))
    }
}

// MARK: - Pill

struct Pill: View {
    let text: String
    var tint: Color = Theme.violet
    var filled: Bool = false
    var icon: String? = nil

    var body: some View {
        HStack(spacing: 4) {
            if let icon { Image(systemName: icon).font(.system(size: 10, weight: .bold)) }
            Text(text.uppercased())
                .font(.system(size: 10, weight: .heavy))
                .tracking(0.6)
        }
        .foregroundStyle(filled ? Color.black : tint)
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background(
            Capsule().fill(filled ? tint : tint.opacity(0.14))
        )
        .overlay(Capsule().strokeBorder(tint.opacity(filled ? 0 : 0.25), lineWidth: 1))
    }
}

// MARK: - Async team / analyst logo

struct AsyncLogo: View {
    let url: URL?
    let text: String
    var size: CGFloat = 34
    var tint: Color = Theme.violet

    var body: some View {
        ZStack {
            Circle().fill(tint.opacity(0.16))
            Circle().strokeBorder(tint.opacity(0.25), lineWidth: 1)
            if let url {
                AsyncImage(url: url) { phase in
                    if case .success(let img) = phase {
                        img.resizable().scaledToFit().padding(5)
                    } else {
                        monogram
                    }
                }
            } else {
                monogram
            }
        }
        .frame(width: size, height: size)
    }

    private var monogram: some View {
        Text(text.prefix(2).uppercased())
            .font(.display(size * 0.36, .heavy))
            .foregroundStyle(tint)
    }
}

// MARK: - Confidence meter

struct ConfidenceMeter: View {
    let value: Int          // 0...100
    var tint: Color = Theme.violet
    var showLabel: Bool = true

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if showLabel {
                HStack {
                    Text("CONFIDENCE")
                        .font(.system(size: 9, weight: .heavy))
                        .tracking(0.8)
                        .foregroundStyle(Theme.text3)
                    Spacer()
                    Text("\(value)%")
                        .font(.num(11, .bold))
                        .foregroundStyle(tint)
                }
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.07))
                    Capsule()
                        .fill(LinearGradient(colors: [tint.opacity(0.7), tint],
                                             startPoint: .leading, endPoint: .trailing))
                        .frame(width: geo.size.width * CGFloat(value) / 100)
                }
            }
            .frame(height: 6)
        }
    }
}

// MARK: - Stat tile

struct StatTile: View {
    let label: String
    let value: String
    var tint: Color = Theme.text
    var sub: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased())
                .font(.system(size: 9, weight: .heavy))
                .tracking(0.8)
                .foregroundStyle(Theme.text3)
            Text(value)
                .font(.num(20, .bold))
                .foregroundStyle(tint)
            if let sub {
                Text(sub).font(.system(size: 11, weight: .medium)).foregroundStyle(Theme.text3)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - States

struct LoadingView: View {
    var body: some View {
        VStack(spacing: Theme.S.md) {
            ProgressView().tint(Theme.violet).scaleEffect(1.2)
            Text("Loading…").font(.system(size: 13, weight: .medium)).foregroundStyle(Theme.text3)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct ErrorStateView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: Theme.S.lg) {
            Image(systemName: "antenna.radiowaves.left.and.right.slash")
                .font(.system(size: 34, weight: .light))
                .foregroundStyle(Theme.violet)
            VStack(spacing: 6) {
                Text("Signal lost").font(.display(18)).foregroundStyle(Theme.text)
                Text(message)
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.text2)
                    .multilineTextAlignment(.center)
            }
            Button("Try Again", action: retry)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.black)
                .padding(.horizontal, 22).padding(.vertical, 11)
                .background(Capsule().fill(Theme.nebula))
        }
        .padding(Theme.S.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var action: (title: String, handler: () -> Void)? = nil

    var body: some View {
        VStack(spacing: Theme.S.lg) {
            Image(systemName: icon)
                .font(.system(size: 32, weight: .light))
                .foregroundStyle(Theme.text3)
            VStack(spacing: 6) {
                Text(title).font(.display(17)).foregroundStyle(Theme.text)
                Text(message)
                    .font(.system(size: 13)).foregroundStyle(Theme.text2)
                    .multilineTextAlignment(.center)
            }
            if let action {
                Button(action.title, action: action.handler)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(Theme.violet)
            }
        }
        .padding(Theme.S.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Async content switch

enum LoadState<Value> {
    case idle, loading
    case loaded(Value)
    case failed(String)
}

struct AsyncContent<T, Content: View>: View {
    let state: LoadState<T>
    let retry: () async -> Void
    @ViewBuilder let content: (T) -> Content

    var body: some View {
        switch state {
        case .idle, .loading:
            LoadingView()
        case .failed(let msg):
            ErrorStateView(message: msg) { Task { await retry() } }
        case .loaded(let value):
            content(value)
        }
    }
}

// MARK: - Section header

struct SectionHeader: View {
    let title: String
    var action: String? = nil
    var onAction: (() -> Void)? = nil

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title)
                .font(.display(19, .bold))
                .foregroundStyle(Theme.text)
            Spacer()
            if let action {
                Button(action) { onAction?() }
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Theme.violet)
            }
        }
    }
}
