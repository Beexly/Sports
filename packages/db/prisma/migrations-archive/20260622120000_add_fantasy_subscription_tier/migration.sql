-- AlterEnum
-- Adds the FANTASY subscription tier (the $49/yr fantasy-only tier that sits
-- below Pro). Single value add; Postgres appends it to the enum — declared order
-- in schema.prisma (FREE, FANTASY, PRO, ELITE) is cosmetic, runtime is unaffected.
ALTER TYPE "SubscriptionTier" ADD VALUE 'FANTASY';
