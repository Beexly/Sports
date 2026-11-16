declare module "@neondatabase/serverless" {
  export class Pool {
    constructor(config: Record<string, unknown>);
    end(): Promise<void>;
    query<T = Record<string, unknown>>(sql: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
  }
  export const neonConfig: {
    webSocketConstructor?: unknown;
    fetchConnectionCache?: boolean;
    [key: string]: unknown;
  };
  export function neon(connectionString: string, options?: Record<string, unknown>): unknown;
}

declare module "@prisma/adapter-neon" {
  import type { Pool } from "@neondatabase/serverless";
  export class PrismaNeon {
    readonly provider: "postgres";
    readonly adapterName: string;
    constructor(pool: Pool);
    queryRaw(params: unknown): Promise<never>;
    executeRaw(params: unknown): Promise<never>;
    transactionContext(): Promise<never>;
    startTransaction(): Promise<never>;
  }
}
