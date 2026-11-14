/**
 * Cloudflare worker entry for the GSE Stealth-Skeleton Provider gateway.
 *
 * The implementation lives in `packages/stealth-skeleton-provider` because the
 * Vercel API routes (`apps/web/app/api/openrouter-provider/**`) serve the same
 * documents. `workers/` is not deployed — production scheduling is the Vercel
 * crons — so code that production imports must not live here. This file is a
 * thin entry: the worker's `fetch` handler over the shared module.
 */
import { handleStealthSkeletonRequest } from "../../../packages/stealth-skeleton-provider/src/index";

export * from "../../../packages/stealth-skeleton-provider/src/index";
export default { fetch: handleStealthSkeletonRequest };