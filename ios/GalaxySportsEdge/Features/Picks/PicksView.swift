import SwiftUI

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
                    if let vm {
                        NavigationLink {
                            SavedPicksView(vm: vm)
                        } label: {
                            Image(systemName: "bookmark")
                        }
                        .tint(Theme.violet)
                    }
                }
            }
            .task {
                if vm == nil {
                    let created = PicksViewModel(service: env.service)
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
                    AsyncContent(state: vm.state, retry: { await vm.load() }) { picks in
                        if picks.isEmpty {
                            EmptyStateView(
                                icon: "sparkles",
                                title: "No picks yet",
                                message: "There's nothing posted for this slate. Check back closer to game time.")
                                .frame(height: 340)
                        } else {
                            LazyVStack(spacing: Theme.S.md) {
                                ForEach(picks) { pick in
                                    NavigationLink(value: pick) {
                                        PickCard(
                                            pick: pick,
                                            isSaved: vm.savedPickIDs.contains(pick.id),
                                            onSave: { Task { await vm.toggleSave(pick) } }
                                        )
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, Theme.S.lg)
                            .padding(.bottom, Theme.S.xxl)
                        }
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
                ForEach(vm.days, id: \.self) { day in
                    let selected = Calendar.current.isDate(day, inSameDayAs: vm.selectedDate)
                    Button {
                        Task { await vm.select(date: day) }
                    } label: {
                        VStack(spacing: 2) {
                            Text(dayLabel(day))
                                .font(.system(size: 10, weight: .heavy))
                                .tracking(0.5)
                            Text(Fmt.dayNum.string(from: day))
                                .font(.num(17, .bold))
                        }
                        .frame(width: 48, height: 56)
                        .foregroundStyle(selected ? .black : Theme.text2)
                        .background(
                            RoundedRectangle(cornerRadius: Theme.R.md, style: .continuous)
                                .fill(selected ? AnyShapeStyle(Theme.nebula)
                                               : AnyShapeStyle(Theme.surface))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: Theme.R.md, style: .continuous)
                                .strokeBorder(selected ? .clear : Theme.stroke, lineWidth: 1)
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
                    chip(title: sport.display,
                         icon: sport.icon,
                         active: vm.selectedSport == sport) {
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

    private func chip(title: String, icon: String,
                      active: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 5) {
                Image(systemName: icon).font(.system(size: 11, weight: .bold))
                Text(title).font(.system(size: 13, weight: .semibold))
            }
            .foregroundStyle(active ? .black : Theme.text2)
            .padding(.horizontal, 13)
            .padding(.vertical, 9)
            .background(
                Capsule().fill(active ? AnyShapeStyle(Theme.nebula)
                                      : AnyShapeStyle(Theme.surface))
            )
            .overlay(Capsule().strokeBorder(active ? .clear : Theme.stroke, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }

    private func dayLabel(_ day: Date) -> String {
        if Calendar.current.isDateInToday(day) { return "TODAY" }
        if Calendar.current.isDateInTomorrow(day) { return "TMRW" }
        if Calendar.current.isDateInYesterday(day) { return "YEST" }
        return Fmt.dayShort.string(from: day).uppercased()
    }
}

// MARK: - Saved picks

struct SavedPicksView: View {
    let vm: PicksViewModel

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()

            if case .loaded(let picks) = vm.state {
                let saved = picks.filter { vm.savedPickIDs.contains($0.id) }
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
    }
}
