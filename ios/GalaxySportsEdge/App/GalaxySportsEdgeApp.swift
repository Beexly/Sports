import SwiftUI

@main
struct GalaxySportsEdgeApp: App {
    @State private var env = AppEnvironment()

    init() { Self.configureAppearance() }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(env)
                .preferredColorScheme(.dark)
                .tint(Theme.violet)
        }
    }

    private static func configureAppearance() {
        // Tab bar
        let tab = UITabBarAppearance()
        tab.configureWithOpaqueBackground()
        tab.backgroundColor = UIColor(Theme.bgElevated)
        tab.shadowColor = UIColor.white.withAlphaComponent(0.08)

        let item = UITabBarItemAppearance()
        item.normal.iconColor = UIColor(Theme.text3)
        item.normal.titleTextAttributes = [.foregroundColor: UIColor(Theme.text3)]
        item.selected.iconColor = UIColor(Theme.violet)
        item.selected.titleTextAttributes = [.foregroundColor: UIColor(Theme.violet)]
        tab.stackedLayoutAppearance = item
        tab.inlineLayoutAppearance = item
        tab.compactInlineLayoutAppearance = item

        UITabBar.appearance().standardAppearance = tab
        UITabBar.appearance().scrollEdgeAppearance = tab

        // Nav bar
        let nav = UINavigationBarAppearance()
        nav.configureWithOpaqueBackground()
        nav.backgroundColor = UIColor(Theme.bg)
        nav.shadowColor = .clear
        nav.titleTextAttributes = [.foregroundColor: UIColor.white]
        nav.largeTitleTextAttributes = [
            .foregroundColor: UIColor.white,
            .font: UIFont.systemFont(ofSize: 32, weight: .heavy)
        ]

        UINavigationBar.appearance().standardAppearance = nav
        UINavigationBar.appearance().scrollEdgeAppearance = nav
        UINavigationBar.appearance().compactAppearance = nav
    }
}
