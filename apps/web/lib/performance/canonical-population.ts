import type { Prisma } from "@prisma/client";

export const SEED_MODEL_VERSION = "v5.0.0-seed";

export const CANONICAL_SETTLED_PICK_WHERE = {
  result: { in: ["WIN", "LOSS", "PUSH"] },
  isPublished: true,
  isBootstrap: false,
  NOT: { modelVersion: SEED_MODEL_VERSION },
  signalSnapshot: {
    is: {
      eligibleForLearning: true,
      isBootstrap: false,
    },
  },
} satisfies Prisma.PickWhereInput;

export function canonicalSettledPickWhere(
  additional?: Prisma.PickWhereInput
): Prisma.PickWhereInput {
  return additional
    ? { AND: [CANONICAL_SETTLED_PICK_WHERE, additional] }
    : CANONICAL_SETTLED_PICK_WHERE;
}

export function canonicalPendingPickWhere(): Prisma.PickWhereInput {
  return {
    result: "PENDING",
    isPublished: true,
    isBootstrap: false,
    NOT: { modelVersion: SEED_MODEL_VERSION },
  };
}

export function recentPublishedPickWhere(since: Date): Prisma.PickWhereInput {
  return {
    generatedAt: { gte: since },
    isPublished: true,
    NOT: { modelVersion: SEED_MODEL_VERSION },
  };
}
