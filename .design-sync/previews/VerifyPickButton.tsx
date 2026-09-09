// Authored design-sync preview for VerifyPickButton.
// FIXTURE: the receipt hash below is a 64-hex layout fixture, not a real commitment.
import { VerifyPickButton } from "sports-prediction-platform";

const receiptHash = "3f9a1c77e2b04d5a6c8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4";
const ground: React.CSSProperties = { background: "var(--carbon)", padding: 24, borderRadius: 16, maxWidth: 340 };

export const Idle = () => (
  <div style={ground}>
    <VerifyPickButton receiptHash={receiptHash} />
  </div>
);

export const NoReceipt = () => (
  <div style={ground}>
    <p style={{ color: "var(--ion-3)", fontSize: 11, margin: 0 }}>
      (Nothing renders below — a free-tier pick has no receipt hash to verify.)
    </p>
    <VerifyPickButton receiptHash={null} />
  </div>
);
