import SwiftUI

struct RootView: View {
    enum Tab: Hashable { case edge, scores, reads, myBets, profile }

    @State private var selection: Tab = .edge

    var body: some View {
        TabView(selection: $selection) {
            PicksView()
                .tabItem { Label("The Edge", systemImage: "sparkles") }
                .tag(Tab.edge)

            ScoresView()
                .tabItem { Label("Scores", systemImage: "sportscourt.fill") }
                .tag(Tab.scores)

            ArticlesView()
                .tabItem { Label("Reads", systemImage: "newspaper.fill") }
                .tag(Tab.reads)

            MyBetsView()
                .tabItem { Label("My Bets", systemImage: "list.bullet.rectangle.portrait.fill") }
                .tag(Tab.myBets)

            ProfileView()
                .tabItem { Label("Profile", systemImage: "person.crop.circle.fill") }
                .tag(Tab.profile)
        }
    }
}
