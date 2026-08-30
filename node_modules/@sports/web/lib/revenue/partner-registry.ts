import type { RevenuePartner } from "./partner-types";

export interface PartnerRegistrySummary {
  readonly total: number;
  readonly approved: number;
  readonly blocked: number;
  readonly pending: number;
}

export function findRevenuePartner(partners: readonly RevenuePartner[], partnerId: string): RevenuePartner | undefined {
  return partners.find((partner) => partner.id === partnerId);
}

export function summarizePartnerRegistry(partners: readonly RevenuePartner[]): PartnerRegistrySummary {
  return {
    approved: partners.filter((partner) => partner.approvalStatus === "approved").length,
    blocked: partners.filter((partner) => partner.approvalStatus === "rejected" || partner.approvalStatus === "suspended").length,
    pending: partners.filter((partner) => partner.approvalStatus === "unreviewed").length,
    total: partners.length,
  };
}
