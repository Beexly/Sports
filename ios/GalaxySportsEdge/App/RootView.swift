import SwiftUI

/// Five tabs, all reachable without an account. The public picks route is
/// anonymous by design, so gating the app behind sign-in would hide the product
/// from the people it is trying to convince.
///
/// Tab selection lives in `AppRouter` rather than local state so a notification
/// tap can move the reader to The Edge, and so the selection survives a tab
/// switch that unmounts and remounts a stack.
struct RootView: View {

    @Environment(AppEnvironment.self) private var env
    @Environment(AppRouter.self) private var router

    var body: some View {
        @Bindable var router = router

        TabView(selection: $router.selectedTab) {
            PicksView()
                .tabItem { Label("The Edge", systemImage: "sparkles") }
                .tag(AppRouter.Tab.edge)

            ScoresView()
                .tabItem { Label("Scores", systemImage: "sportscourt.fill") }
                .tag(AppRouter.Tab.scores)

            ArticlesView()
                .tabItem { Label("Reads", systemImage: "newspaper.fill") }
                .tag(AppRouter.Tab.reads)

            MyBetsView()
                .tabItem { Label("My Bets", systemImage: "list.bullet.rectangle.portfolio.fill") }
                .tag(AppRouter.Tab.myBets)

            ProfileView()
                .tabItem { Label("Profile", systemImage: "person.crop.circle.fill") }
                .tag(AppRouter.Tab.profile)
        }
        .onChange(of: router.pendingPickID) {
            guard router.pendingPickID != nil else { return }
            router.selectedTab = .edge
        }
    }
}
