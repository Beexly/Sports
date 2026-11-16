import { generateKeyPairSync } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  enforceSlatePublication,
  evaluateCagePublicationPolicy,
  verifyReceiptEd25519,
  type CandidateSlatePacket,
  type ReceiptSigner,
} from "../index";

describe("CAGE deterministic publication gate (ENFORCE)", () => {
  let publicKeyPem = "";
  let signer: ReceiptSigner;

  beforeAll(() => {
    const pair = generateKeyPairSync("ed25519", {
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    publicKeyPem = pair.publicKey;
    signer = { kid: "test-ed25519-k1", privateKeyPem: pair.privateKey };
  });

  it("admits valid packets, executes publishFn, and mints verifiable Ed25519 receipts", async () => {
    const packet: CandidateSlatePacket = {
      season: 2026,
      week: 10,
      windowSlot: "SUN_EARLY",
      lockVersion: "v3.0",
      namedVolumeShare: 0.97,
      items: [
        {
          id: "prop-1",
          matchup: "PIT @ CIN",
          market: "player_rec_yds",
          selection: "OVER 64.5",
          decision: "PLAY",
          publishAllowed: true,
          confidenceDisplay: "64/100",
          expectedClv: 0.025,
          overAmerican: -110,
          underAmerican: -110,
          publicCopy: "Lead slot workload expands against zone shell.",
        },
      ],
    };

    const persistReceipt = vi.fn().mockResolvedValue({ controlEventId: "evt_admit_1" });
    const publishFn = vi.fn().mockResolvedValue({ published: true });

    const res = await enforceSlatePublication(packet, signer, persistReceipt, publishFn);
    expect(res.ok).toBe(true);
    expect(res.decision).toBe("ADMIT");
    expect(publishFn).toHaveBeenCalledTimes(1);
    expect(persistReceipt).toHaveBeenCalledTimes(1);
    expect(verifyReceiptEd25519(res.receipt, publicKeyPem)).toEqual({ ok: true });
  });

  it("refuses % confidence, single-sided props, PASS leaks, and jargon without invoking publishFn", async () => {
    const badPacket: CandidateSlatePacket = {
      season: 2026,
      week: 10,
      windowSlot: "SNF",
      lockVersion: "v3.5",
      namedVolumeShare: 0.89,
      items: [
        {
          id: "bad-1",
          market: "rec_yds",
          decision: "PASS",
          publishAllowed: true,
          confidenceDisplay: "64%",
          expectedClv: -0.02,
          overAmerican: -115,
          underAmerican: null,
          publicCopy: "Evaluated with Romano CQR weights.",
        },
      ],
    };

    const policy = evaluateCagePublicationPolicy(badPacket);
    expect(policy.decision).toBe("REFUSE");
    expect(policy.reasons).toContain("UNATTRIBUTED_VOLUME_LEAK");
    expect(policy.reasons).toContain("PASS_MARKED_PUBLISHABLE:bad-1");
    expect(policy.reasons).toContain("CONFIDENCE_PERCENT_FORBIDDEN:bad-1");
    expect(policy.reasons).toContain("SINGLE_SIDED_PROP_FORBIDDEN:bad-1");
    expect(policy.reasons).toContain("INTERNAL_JARGON_LEAK:bad-1");

    const persistReceipt = vi.fn().mockResolvedValue({ controlEventId: "evt_refuse_1" });
    const publishFn = vi.fn().mockResolvedValue({ published: true });

    const res = await enforceSlatePublication(badPacket, signer, persistReceipt, publishFn);
    expect(res.ok).toBe(false);
    expect(res.decision).toBe("REFUSE");
    expect(publishFn).not.toHaveBeenCalled();
    expect(persistReceipt).toHaveBeenCalledTimes(1);
    expect(verifyReceiptEd25519(res.receipt, publicKeyPem)).toEqual({ ok: true });
  });
});
