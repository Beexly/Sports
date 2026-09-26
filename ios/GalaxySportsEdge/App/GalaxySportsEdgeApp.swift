import SwiftUI

/// The app entry point.
///
/// Appearance is configured here rather than per-view so a screen never has to
/// remember what the tab bar looks like, and so changing the design system
/// changes every bar at once.
@main
struct GalaxySportsEdgeApp: App {

    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var env = AppEnvironment()
    @State private var router = AppRouter.shared

    init() {
        Self.configureAppearance()
        // The delegate needs the environment to route APNs callbacks, and the
        // environment is not available until `@State` has been initialised —
        // which is exactly why this assignment lives in `body`, not in `init`.
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(env)
                .environment(router)
                .preferredColorScheme(.dark)
                .tint(Theme.violet)
                .task {
                    AppDelegate.environment = env
                    await env.start()
                }
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
