declare module "stripe" {
  namespace Stripe {
    export type Metadata = Record<string, string>;

    export interface StripeConfig {
      apiVersion?: string;
      typescript?: boolean;
      [key: string]: unknown;
    }

    export interface Price {
      id: string;
      object?: "price";
      active?: boolean;
      currency?: string;
      lookup_key?: string | null;
      nickname?: string | null;
      product?: string | Product | DeletedProduct;
      recurring?: {
        interval?: "day" | "week" | "month" | "year" | string;
        interval_count?: number;
        [key: string]: unknown;
      } | null;
      type?: "one_time" | "recurring";
      unit_amount: number | null;
      [key: string]: unknown;
    }

    export interface Product {
      id: string;
      object?: "product";
      name?: string;
      [key: string]: unknown;
    }

    export interface DeletedProduct {
      id: string;
      deleted?: true;
      [key: string]: unknown;
    }

    export interface SubscriptionItem {
      id: string;
      price: Price;
      quantity?: number;
      [key: string]: unknown;
    }

    export namespace Subscription {
      export type Status =
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "unpaid"
        | "paused";
    }

    export interface SubscriptionListParams {
      customer?: string;
      price?: string;
      status?: Subscription.Status | "all" | "ended";
      limit?: number;
      starting_after?: string;
      ending_before?: string;
      [key: string]: unknown;
    }

    export interface Subscription {
      id: string;
      object?: "subscription";
      customer: string | Customer | DeletedCustomer;
      status: Subscription.Status;
      metadata: Metadata;
      items: {
        data: SubscriptionItem[];
        [key: string]: unknown;
      };
      current_period_start: number;
      current_period_end: number;
      cancel_at_period_end: boolean;
      canceled_at: number | null;
      trial_start: number | null;
      trial_end: number | null;
      [key: string]: unknown;
    }

    export interface Customer {
      id: string;
      email?: string | null;
      name?: string | null;
      metadata?: Metadata;
      deleted?: false;
      [key: string]: unknown;
    }

    export interface DeletedCustomer {
      id: string;
      deleted: true;
      [key: string]: unknown;
    }

    export interface CustomerCreateParams {
      email?: string;
      name?: string;
      metadata?: Metadata;
      [key: string]: unknown;
    }

    export namespace Checkout {
      export interface LineItem {
        id?: string;
        price: Price | string | null;
        quantity?: number | null;
        [key: string]: unknown;
      }

      export interface SessionCreateParams {
        [key: string]: unknown;
      }

      export interface Session {
        id: string;
        object?: "checkout.session";
        url: string | null;
        status: "open" | "complete" | "expired" | null;
        mode: "payment" | "setup" | "subscription";
        amount_total?: number | null;
        currency?: string | null;
        created: number;
        payment_status?: string;
        payment_intent?: string | Record<string, unknown> | null;
        customer?: string | Customer | DeletedCustomer | null;
        customer_email?: string | null;
        customer_details?: {
          email?: string | null;
          name?: string | null;
          [key: string]: unknown;
        } | null;
        subscription?: string | Subscription | null;
        client_reference_id?: string | null;
        metadata?: Metadata | null;
        line_items?: {
          data: LineItem[];
          [key: string]: unknown;
        };
        [key: string]: unknown;
      }
    }

    export namespace BillingPortal {
      export interface SessionCreateParams {
        customer: string;
        return_url?: string;
        [key: string]: unknown;
      }

      export interface Session {
        id: string;
        object?: "billing_portal.session";
        url: string;
        customer: string;
        return_url?: string | null;
        [key: string]: unknown;
      }
    }

    export interface Invoice {
      id: string;
      customer?: string | Customer | DeletedCustomer | null;
      subscription?: string | Subscription | null;
      customer_email?: string | null;
      status?: string | null;
      [key: string]: unknown;
    }

    export interface Charge {
      id: string;
      amount: number;
      amount_refunded: number;
      customer?: string | Customer | DeletedCustomer | null;
      invoice?: string | Invoice | null;
      payment_intent?: string | null;
      refunded?: boolean;
      [key: string]: unknown;
    }

    export interface WebhookEndpoint {
      id: string;
      url: string;
      status?: "enabled" | "disabled" | string;
      [key: string]: unknown;
    }

    export interface Event {
      id: string;
      type: string;
      data: {
        object: Record<string, unknown>;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }

    export interface ApiList<T> {
      data: T[];
      has_more: boolean;
      [key: string]: unknown;
    }

    export type Response<T> = T & {
      lastResponse?: {
        headers: Record<string, string>;
        requestId: string;
        statusCode: number;
      };
    };

    export namespace errors {
      export class StripeError extends Error {
        readonly type?: string;
        readonly code?: string;
        readonly statusCode?: number;
      }
      export class StripeSignatureVerificationError extends StripeError {}
    }
  }

  class Stripe {
    constructor(apiKey: string, config?: Stripe.StripeConfig);
    static readonly errors: typeof Stripe.errors;
    readonly customers: {
      create(
        params?: Stripe.CustomerCreateParams,
        options?: Record<string, unknown>,
      ): Promise<Stripe.Customer>;
      retrieve(
        id: string,
        params?: Record<string, unknown>,
        options?: Record<string, unknown>,
      ): Promise<Stripe.Customer | Stripe.DeletedCustomer>;
      update(
        id: string,
        params: Record<string, unknown>,
        options?: Record<string, unknown>,
      ): Promise<Stripe.Customer>;
      list(
        params?: Record<string, unknown>,
        options?: Record<string, unknown>,
      ): Promise<Stripe.ApiList<Stripe.Customer>>;
    };
    readonly checkout: {
      sessions: {
        create(
          params: Stripe.Checkout.SessionCreateParams | Record<string, unknown>,
          options?: Record<string, unknown>,
        ): Promise<Stripe.Checkout.Session>;
        retrieve(
          id: string,
          params?: Record<string, unknown>,
          options?: Record<string, unknown>,
        ): Promise<Stripe.Checkout.Session>;
        expire(
          id: string,
          params?: Record<string, unknown>,
          options?: Record<string, unknown>,
        ): Promise<Stripe.Checkout.Session>;
        list(
          params?: Record<string, unknown>,
          options?: Record<string, unknown>,
        ): Promise<Stripe.ApiList<Stripe.Checkout.Session>>;
      };
    };
    readonly billingPortal: {
      sessions: {
        create(
          params: Stripe.BillingPortal.SessionCreateParams,
          options?: Record<string, unknown>,
        ): Promise<Stripe.BillingPortal.Session>;
      };
    };
    readonly subscriptions: {
      retrieve(
        id: string,
        params?: Record<string, unknown>,
        options?: Record<string, unknown>,
      ): Promise<Stripe.Subscription>;
      list(
        params?: Stripe.SubscriptionListParams,
        options?: Record<string, unknown>,
      ): Promise<Stripe.ApiList<Stripe.Subscription>>;
      update(
        id: string,
        params: Record<string, unknown>,
        options?: Record<string, unknown>,
      ): Promise<Stripe.Subscription>;
      cancel(
        id: string,
        params?: Record<string, unknown>,
        options?: Record<string, unknown>,
      ): Promise<Stripe.Subscription>;
    };
    readonly invoices: {
      retrieve(
        id: string,
        params?: Record<string, unknown>,
        options?: Record<string, unknown>,
      ): Promise<Stripe.Invoice>;
      list(
        params?: Record<string, unknown>,
        options?: Record<string, unknown>,
      ): Promise<Stripe.ApiList<Stripe.Invoice>>;
    };
    readonly prices: {
      list(
        params?: Record<string, unknown>,
        options?: Record<string, unknown>,
      ): Promise<Stripe.ApiList<Stripe.Price>>;
      retrieve(
        id: string,
        params?: Record<string, unknown>,
        options?: Record<string, unknown>,
      ): Promise<Stripe.Price>;
    };
    readonly webhooks: {
      constructEvent(payload: string | Buffer, header: string, secret: string): Stripe.Event;
    };
    readonly webhookEndpoints: {
      list(
        params?: Record<string, unknown>,
        options?: Record<string, unknown>,
      ): Promise<Stripe.ApiList<Stripe.WebhookEndpoint>>;
    };
    readonly [key: string]: unknown;
  }

  export = Stripe;
}
