/**
 * Public-safe waitlist / lead-capture posture (env only, no secrets).
 *
 * Answers: can a stranger leave an email, or is Basic Auth locking the page?
 * Growth-path honesty for ops — never invents lead counts.
 */

export type Env = Record<string, string | undefined>;

export interface WaitlistPosture {
  /** GSE_WAITLIST_GATE_ENABLED=true → public /waitlist is Basic-Auth locked. */
  readonly gateEnabled: boolean;
  /** Inverse of gate — public page accepts anonymous visitors. */
  readonly publicPageOpen: boolean;
  /** Credentials pair present when gate is on (booleans only). */
  readonly basicAuthCredentialsConfigured: boolean;
  readonly operatorHint: string;
}

function envFlag(env: Env, name: string): boolean {
  return env[name]?.trim().toLowerCase() === "true";
}

export function loadWaitlistPosture(env: Env = process.env): WaitlistPosture {
  const gateEnabled = envFlag(env, "GSE_WAITLIST_GATE_ENABLED");
  const user = Boolean(env["GSE_WAITLIST_BASIC_USER"]?.trim());
  const pass = Boolean(env["GSE_WAITLIST_BASIC_PASSWORD"]?.trim());
  const basicAuthCredentialsConfigured = user && pass;

  let operatorHint: string;
  if (!gateEnabled) {
    operatorHint = "Waitlist public — /waitlist accepts anonymous lead capture.";
  } else if (basicAuthCredentialsConfigured) {
    operatorHint =
      "Waitlist Basic Auth ON — public lead capture blocked. Set GSE_WAITLIST_GATE_ENABLED=false to open funnel.";
  } else {
    operatorHint =
      "Waitlist gate flag ON but Basic Auth credentials incomplete — page may 401 inconsistently. Fix creds or disable gate.";
  }

  return {
    gateEnabled,
    publicPageOpen: !gateEnabled,
    basicAuthCredentialsConfigured,
    operatorHint,
  };
}
