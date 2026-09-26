import SwiftUI

/// The Edge: today's slate, filtered by day and sport.
struct PicksView: View {

    @Environment(AppEnvironment.self) private var env
    @State private var vm: PicksViewModel?

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()

                if let vm {
                    content(vm)
                } else {
                    LoadingView()
                }
            }
            .navigationTitle("The Edge")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        SavedPicksView(vm: vm)
                    } label: {
                        Image(systemName: "bookmark")
                    }
                    .tint(Theme.violet)
                    .accessibilityLabel("Saved picks")
                }
            }
            .task {
                // Built once per mount. Rebuilding on every `task` re-runs would
                // drop the reader's filters on a tab switch.
                if vm == nil {
                    let created = PicksViewModel(service: env.service, saved: env.saved)
                    vm = created
                    await created.load()
                }
            }
        }
    }

    @ViewBuilder
    private func content(_ vm: PicksViewModel) -> some View {
        ScrollView {
            LazyVStack(spacing: Theme.S.lg, pinnedViews: [.sectionHeaders]) {

                Section {
                    AsyncContent(state: vm.state, retry: { await vm.load() }) { page in
                        slateBody(vm, page: page)
                    }
                } header: {
                    filterHeader(vm)
                }
            }
        }
        .scrollIndicators(.hidden)
        .refreshable { await vm.load() }
        .background(Theme.bg)
        .navigationDestination(for: Pick.self) { pick in
            PickDetailView(pick: pick)
        }
    }

    // MARK: - Slate

    @ViewBuilder
    private func slateBody(_ vm: PicksViewModel, page: SlatePage) -> some View {
        let picks = vm.gradedFirst

        if page.meta.containsSeedData {
            SampleDataBanner()
        }

        if picks.isEmpty {
            EmptyStateView(
                icon: "sparkles",
                title: "No picks for this slate",
                message: vm.selectedDate.startOfDay == Date.now.startOfDay
                    ? "Nothing is posted for today yet. The engine publishes closer to game time."
                    : "Nothing was published on this day.")
                .frame(height: 320)
        } else {
            LazyVStack(spacing: Theme.S.md) {
                ForEach(picks) { pick in
                    NavigationLink(value: pick) {
                        PickCard(
                            pick: pick,
                            isSaved: vm.isSaved(pick),
                            onSave: { vm.toggleSave(pick) })
                    }
                    .buttonStyle(.plain)
                }

                // The FREE daily cap is a *fact about the account*, not a bug.
                // Saying so is the difference between "this app is broken" and
                // "I need to upgrade to see the rest".
                if page.meta.withheldCount > 0 {
                    WithheldRow(count: page.meta.withheldCount, tier: page.meta.tier)
                }
            }
            .padding(.horizontal, Theme.S.lg)
            .padding(.bottom, Theme.S.xxl)
        }
    }

    // MARK: - Filters

    private func filterHeader(_ vm: PicksViewModel) -> some View {
        VStack(spacing: 0) {
            dateStrip(vm)
            sportStrip(vm)
        }
        .background(Theme.bg)
    }

    private func dateStrip(_ vm: PicksViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.S.sm) {
                ForEach(vm.dayOptions) { option in
                    let selected = Calendar.current.isDate(
                        option.date, inSameDayAs: vm.selectedDate)
                    Button {
                        Task { await vm.select(date: option.date) }
                    } label: {
                        VStack(spacing: 2) {
                            Text(option.title)
                                .font(.system(size: 10, weight: .heavy))
                                .tracking(0.5)
                            Text(option.number)
                                .font(.num(17, .bold))
                        }
                        .frame(width: 48, height: 56)
                        .foregroundStyle(selected ? Color.black : Theme.text2)
                        .background(
                            RoundedRectangle(cornerRadius: Theme.R.md, style: .continuous)
                                .fill(selected ? AnyShapeStyle(Theme.nebula) : AnyShapeStyle(Theme.surface))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: Theme.R.md, style: .continuous)
                                .strokeBorder(selected ? Color.clear : Theme.stroke, lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, Theme.S.lg)
            .padding(.vertical, Theme.S.md)
        }
    }

    private func sportStrip(_ vm: PicksViewModel) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Theme.S.sm) {
                chip(title: "All", icon: "flame.fill", active: vm.selectedSport == nil) {
                    Task { await vm.select(sport: nil) }
                }
                ForEach(Sport.featured) { sport in
                    chip(title: sport.display, icon: sport.icon, active: vm.selectedSport == sport) {
                        Task { await vm.select(sport: sport) }
                    }
                }
            }
            .padding(.horizontal, Theme.S.lg)
            .padding(.bottom, Theme.S.md)
        }
        .overlay(alignment: .bottom) {
            Rectangle().fill(Theme.stroke).frame(height: 1)
        }
    }

    private func chip(title: String,
                      icon: String,
                      active: Bool,
                      action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 5) {
                Image(systemName: icon).font(.system(size: 11, weight: .bold))
                Text(title).font(.system(size: 13, weight: .semibold))
            }
            .foregroundStyle(active ? Color.black : Theme.text2)
            .padding(.horizontal, 13)
            .padding(.vertical, 9)
            .background(
                Capsule().fill(active ? AnyShapeStyle(Theme.nebula) : AnyShapeStyle(Theme.surface))
            )
            .overlay(Capsule().strokeBorder(active ? Color.clear : Theme.stroke, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Slate-level honesty

/// Shown when the app is running on fixtures. Never shown on live data.
struct SampleDataBanner: View {
    var body: some View {
        HStack(spacing: Theme.S.sm) {
            Image(systemName: "flask")
                .font(.system(size: 12, weight: .bold))
            Text("SAMPLE DATA — not model output")
                .font(.system(size: 10, weight: .heavy))
                .tracking(0.6)
            Spacer()
        }
        .foregroundStyle(Theme.push)
        .padding(.horizontal, Theme.S.md)
        .padding(.vertical, 9)
        .background(
            RoundedRectangle(cornerRadius: Theme.R.md, style: .continuous)
                .fill(Theme.push.opacity(0.12))
        )
        .padding(.horizontal, Theme.S.lg)
    }
}

/// "You are seeing 1 of 4 — your tier caps the slate at 1." A real limit,
/// named, with the thing that would change it.
struct WithheldRow: View {
    let count: Int
    let tier: UserProfile.Tier

    var body: some View {
        HStack(spacing: Theme.S.md) {
            Image(systemName: "lock.fill")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(Theme.violet)

            VStack(alignment: .leading, spacing: 2) {
                Text("\(count) more pick\(count == 1 ? "" : "s") today")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Theme.text)
                Text("Your \(tier.label) tier sees \(count == 1 ? "1" : "a capped slate") per day.")
                    .font(.system(size: 11))
                    .foregroundStyle(Theme.text2)
            }

            Spacer(minLength: 0)
        }
        .card(padding: Theme.S.md, fill: Theme.surfaceHi)
    }
}

// MARK: - Saved

/// Bookmarks are local to the device, and the screen says so.
struct SavedPicksView: View {
    let vm: PicksViewModel

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            if let page = loadedPage(vm.state) {
                let saved = page.picks.filter { vm.isSaved($0) }
                if saved.isEmpty {
                    EmptyStateView(
                        icon: "bookmark",
                        title: "Nothing saved",
                        message: "Tap the bookmark on any pick to keep it here.")
                } else {
                    ScrollView {
                        LazyVStack(spacing: Theme.S.md) {
                            ForEach(saved) { pick in
                                NavigationLink(value: pick) {
                                    PickCard(pick: pick, isSaved: true)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(Theme.S.lg)
                    }
                }
            } else {
                LoadingView()
            }
        }
        .navigationTitle("Saved")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Text("\(vm.savedCount) on device")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Theme.text3)
            }
        }
    }

    private func loadedPage(_ state: LoadState<SlatePage>) -> SlatePage? {
        if case .loaded(let page) = state { return page }
        return nil
    }
}
