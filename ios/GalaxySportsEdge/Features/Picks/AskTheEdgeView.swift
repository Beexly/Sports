import SwiftUI
import Observation

/// "Ask the model" — a question about one pick, answered by
/// `GET /api/picks/{id}/explain`.
///
/// The route is authenticated, rate-limited per user, and can refuse (budget,
/// upstream, or a bad question). Every one of those refusals is shown as what
/// it is. The screen never substitutes a canned paragraph for a refusal, which
/// is the failure mode that turns an honest error into a fabricated answer.
@MainActor
@Observable
final class AskTheEdgeViewModel {

    private let service: SportsService

    var question = ""
    var state: LoadState<Explanation> = .idle
    /// Shortcuts the reader can tap instead of typing. Each one is a question
    /// the route is actually able to answer.
    var suggestedQuestions: [String] = []

    init(pick: Pick, service: SportsService) {
        self.service = service
        self.suggestedQuestions = AskTheEdgeViewModel.suggestions(for: pick)
    }

    static func suggestions(for pick: Pick) -> [String] {
        var questions = [
            "What is the single biggest factor behind this pick?",
            "What would have to be wrong for this to lose?",
            "How does the price compare to the model's own read?",
        ]
        if pick.risk == .injuryRisk {
            questions.insert("Which injury report matters most here?", at: 0)
        }
        if pick.hasFatigueRiskSignal {
            questions.insert("Does the rest situation change this?", at: 0)
        }
        return Array(questions.prefix(4))
    }

    var canSubmit: Bool {
        question.trimmingCharacters(in: .whitespacesAndNewlines).count >= 8
            && !isLoading
    }

    private var isLoading: Bool {
        if case .loading = state { return true }
        return false
    }

    func submit() async {
        let trimmed = question.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 8 else { return }
        state = .loading
        do {
            state = .loaded(try await service.explain(pickID: pickID, question: trimmed))
        } catch {
            state = .failed(PicksViewModel.message(for: error))
        }
    }

    func use(_ suggestion: String) async {
        question = suggestion
        await submit()
    }

    /// Injected by the view so the view model does not need the whole pick.
    var pickID: String = ""
}

struct AskTheEdgeView: View {

    @Environment(AppEnvironment.self) private var env
    @State private var vm: AskTheEdgeViewModel?

    let pick: Pick

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            if let vm {
                content(vm)
            } else {
                LoadingView()
            }
        }
        .navigationTitle("Ask the model")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if vm == nil {
                let created = AskTheEdgeViewModel(pick: pick, service: env.service)
                created.pickID = pick.id
                vm = created
            }
        }
    }

    @ViewBuilder
    private func content(_ vm: AskTheEdgeViewModel) -> some View {
        @Bindable var vm = vm

        ScrollView {
            VStack(alignment: .leading, spacing: Theme.S.xl) {

                contextCard

                VStack(alignment: .leading, spacing: Theme.S.md) {
                    SectionHeader(title: "Your question")

                    TextField("Ask about the line, the factors, the risk…",
                              text: $vm.question,
                              axis: .vertical)
                        .lineLimit(2...5)
                        .font(.system(size: 14))
                        .foregroundStyle(Theme.text)
                        .padding(Theme.S.md)
                        .background(
                            RoundedRectangle(cornerRadius: Theme.R.md, style: .continuous)
                                .fill(Theme.surface)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: Theme.R.md, style: .continuous)
                                .strokeBorder(Theme.stroke, lineWidth: 1)
                        )

                    Button {
                        Task { await vm.submit() }
                    } label: {
                        Text("Ask")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.black)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 13)
                            .background(Capsule().fill(Theme.nebula))
                            .opacity(vm.canSubmit ? 1 : 0.4)
                    }
                    .buttonStyle(.plain)
                    .disabled(!vm.canSubmit)
                }

                if !vm.suggestedQuestions.isEmpty {
                    VStack(alignment: .leading, spacing: Theme.S.sm) {
                        Text("TRY ASKING")
                            .font(.system(size: 9, weight: .heavy))
                            .tracking(0.8)
                            .foregroundStyle(Theme.text3)
                        ForEach(vm.suggestedQuestions, id: \.self) { question in
                            Button {
                                Task { await vm.use(question) }
                            } label: {
                                HStack(spacing: Theme.S.sm) {
                                    Image(systemName: "sparkle")
                                        .font(.system(size: 11, weight: .bold))
                                        .foregroundStyle(Theme.violet)
                                    Text(question)
                                        .font(.system(size: 13))
                                        .foregroundStyle(Theme.text2)
                                        .multilineTextAlignment(.leading)
                                    Spacer(minLength: 0)
                                }
                                .padding(Theme.S.md)
                                .background(
                                    RoundedRectangle(cornerRadius: Theme.R.md, style: .continuous)
                                        .fill(Theme.surface)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                answerSection(vm)
            }
            .padding(Theme.S.lg)
            .padding(.bottom, Theme.S.xxl)
        }
        .scrollIndicators(.hidden)
    }

    private var contextCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(pick.selection)
                .font(.display(17, .bold))
                .foregroundStyle(Theme.text)
            Text(pick.eventName)
                .font(.system(size: 12))
                .foregroundStyle(Theme.text2)
            Text(Fmt.kickoffLabel(pick.commenceTime))
                .font(.system(size: 11))
                .foregroundStyle(Theme.text3)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .card(padding: Theme.S.md)
    }

    @ViewBuilder
    private func answerSection(_ vm: AskTheEdgeViewModel) -> some View {
        switch vm.state {
        case .idle:
            EmptyView()
        case .loading:
            VStack(spacing: Theme.S.md) {
                ProgressView().tint(Theme.violet)
                Text("Thinking…")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.text3)
            }
            .frame(maxWidth: .infinity)
            .card(padding: Theme.S.lg)

        case .failed(let message):
            // Shown as an error, verbatim. No fallback text.
            VStack(alignment: .leading, spacing: Theme.S.sm) {
                HStack(spacing: Theme.S.sm) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(Theme.push)
                    Text("The model could not answer that")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(Theme.text)
                }
                Text(message)
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.text2)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .card(padding: Theme.S.md)

        case .loaded(let explanation):
            VStack(alignment: .leading, spacing: Theme.S.md) {
                SectionHeader(title: "Answer")
                Text(explanation.text)
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.text2)
                    .lineSpacing(3)
                    .fixedSize(horizontal: false, vertical: true)
                if let model = explanation.modelName, !model.isEmpty {
                    Text("— \(model)")
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.text3)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .card()
        }
    }
}

private extension Pick {
    /// Whether the question set should offer the rest/fatigue angle. Derived
    /// from the risk level rather than a new model field, because the engine
    /// does not expose scheduling context on a pick.
    var hasFatigueRiskSignal: Bool {
        risk == .injuryRisk || risk == .highVariance
    }
}
