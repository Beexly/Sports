export interface ApiUsageEvent {
  readonly consumerId: string;
  readonly endpointId: string;
  readonly requestId: string;
  readonly occurredAt: string;
  readonly units: number;
  readonly allowed: boolean;
  readonly reasonCodes: readonly string[];
}

export function buildApiUsageEvent(input: ApiUsageEvent): ApiUsageEvent {
  return {
    ...input,
    reasonCodes: [...input.reasonCodes].sort(),
    units: Math.max(0, input.units),
  };
}
