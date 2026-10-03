import { evaluateApiV1ShadowGateway, type ApiV1ShadowGatewayInput } from "@/lib/api/v1/shadow-gateway";

export function evaluateApiAuthMiddleware(input: ApiV1ShadowGatewayInput) {
  return evaluateApiV1ShadowGateway(input);
}
