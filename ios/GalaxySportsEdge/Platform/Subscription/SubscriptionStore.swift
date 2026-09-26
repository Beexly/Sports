import Foundation
import Observation
import StoreKit

/// Subscription state, backed by StoreKit 2.
///
/// Honest status design, because this one is gated: an app that reports
/// "unavailable" when it means "not configured yet" teaches readers to ignore
/// the label. `State` separates *no products* from *cannot reach the App Store*
/// from *loaded and purchasable*, and the paywall renders each differently.
///
/// Off by default. `AppConfiguration.usesAppStoreIAP` is `false` because the
/// backend's live billing today is Stripe (`/api/subscriptions/checkout`), and
/// flipping StoreKit on before the products exist in App Store Connect and
/// `/api/subscriptions/verify` can redeem a signed transaction would sell
/// subscriptions the server cannot honour. See INTEGRATION.md.
@MainActor
@Observable
final class SubscriptionStore {

    /// Not `Equatable`: `Product` is not `Equatable`, and synthesising a
    /// comparison over an opaque StoreKit object would either fail to compile
    /// or compare by identity, making a re-fetch look like a state change.
    enum State {
        case idle
        case loading
        /// Products are configured and loaded.
        case available
        /// `storeKitProductIDs` is empty — nothing to sell yet.
        case notConfigured
        /// StoreKit is present but cannot reach the App Store (offline, no
        /// Apple ID, sandbox unavailable).
        case unavailable(String)
        /// A purchase is in flight.
        case purchasing
    }

    private(set) var state: State = .idle
    private(set) var products: [Product] = []
    private(set) var activeProductIDs: Set<String> = []
    private(set) var lastError: String?

    private let service: SportsService
    private var updatesTask: Task<Void, Never>?

    init(service: SportsService) {
        self.service = service
    }

    /// Explicit rather than a `deinit`: a deinit cannot safely touch
    /// main-actor state, and the listener is owned for the app's lifetime.
    func stopListening() {
        updatesTask?.cancel()
        updatesTask = nil
    }

    // MARK: - Loading

    func load() async {
        guard AppConfiguration.usesAppStoreIAP else {
            state = .notConfigured
            return
        }
        guard !AppConfiguration.storeKitProductIDs.isEmpty else {
            state = .notConfigured
            return
        }

        state = .loading
        do {
            let fetched = try await Product.products(for: Set(AppConfiguration.storeKitProductIDs))
            // StoreKit returns them in arbitrary order; sorting by price keeps
            // the paywall stable between launches.
            products = fetched.sorted { $0.price < $1.price }
            state = .available
        } catch {
            products = []
            state = .unavailable(error.localizedDescription)
        }
        await refreshEntitlements()
    }

    // MARK: - Entitlements

    /// Reads the *current* entitlement from the receipt the App Store already
    /// holds. This is the only on-device authority for "is this person paid" —
    /// and the server still re-derives it, because a device can be jailbroken.
    func refreshEntitlements() async {
        var current: Set<String> = []
        for await result in Transaction.currentEntitlements {
            guard case .verified(let transaction) = result else { continue }
            current.insert(transaction.productID)
            await transaction.finish()
        }
        activeProductIDs = current
    }

    /// Listens for purchases made outside the app: renewals, a subscription
    /// bought on another device, Ask to Buy approvals.
    func startListeningForTransactions() {
        guard AppConfiguration.usesAppStoreIAP, updatesTask == nil else { return }
        updatesTask = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                guard case .verified = result else { continue }
                await self.refreshEntitlements()
                // The server is told separately — this only syncs the local
                // view. A local grant is never proof of payment. The signed
                // blob lives on the verification result, not on the
                // transaction it wraps.
                _ = result.jwsRepresentation
            }
        }
    }

    // MARK: - Purchase

    func purchase(_ product: Product) async {
        state = .purchasing
        do {
            switch try await product.purchase() {
            case .success(let verification):
                switch verification {
                case .verified(let transaction):
                    activeProductIDs.insert(transaction.productID)
                    await transaction.finish()
                    lastError = nil
                case .unverified(_, let error):
                    // An unverified transaction is a failed signature check.
                    // Treating it as a purchase is exactly the bug that lets a
                    // jailbroken device mint a subscription.
                    lastError = "That purchase could not be verified (\(error.localizedDescription))."
                }
            case .userCancelled, .pending:
                // Cancel is a choice, not a failure. Pending is Ask to Buy:
                // the grant arrives later through Transaction.updates.
                break
            }
        } catch {
            lastError = error.localizedDescription
        }
        state = .available
    }

    // MARK: - Stripe (the path that works today)

    /// A Stripe-hosted checkout URL to open in a web session.
    func startCheckout(tier: UserProfile.Tier, interval: BillingInterval) async -> URL? {
        do {
            return try await service.checkoutURL(tier: tier, interval: interval)
        } catch {
            lastError = (error as? APIError)?.errorDescription ?? error.localizedDescription
            return nil
        }
    }

    func startBillingPortal() async -> URL? {
        do {
            return try await service.billingPortalURL()
        } catch {
            lastError = (error as? APIError)?.errorDescription ?? error.localizedDescription
            return nil
        }
    }
}
