/**
 * Ambient Sound — three signature tones, mute-by-default, opt-in only.
 *
 * Tones:
 *   - data-tick: calibration data updated
 *   - restraint: user lands on /no-bet
 *   - completion: autopsy graded
 *
 * Audio files live under public/sound/. Until the operator drops WAV
 * files in place, the player gracefully no-ops on missing assets.
 *
 * Constitution: sound is never used to manipulate. Never triggered after
 * a loss to push action. Never used to imply urgency or scarcity.
 */

export type AmbientSoundKey = "data-tick" | "restraint" | "completion";

export const SOUND_FILES: Readonly<Record<AmbientSoundKey, string>> = {
  "data-tick": "/sound/data-tick.wav",
  restraint: "/sound/restraint.wav",
  completion: "/sound/completion.wav",
};

const SOUND_OPT_IN_KEY = "gse_sound_opt_in";

/** Read opt-in state from localStorage. Defaults false. */
export function isSoundOptedIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SOUND_OPT_IN_KEY) === "true";
  } catch {
    return false;
  }
}

/** Write opt-in preference. */
export function setSoundOptIn(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_OPT_IN_KEY, value ? "true" : "false");
  } catch {
    // ignore
  }
}

/**
 * Play a tone if the user has opted in. No-op on missing audio file
 * (404 on a public asset is treated as 'sound not shipped yet').
 */
export async function playAmbient(key: AmbientSoundKey): Promise<void> {
  if (typeof window === "undefined") return;
  if (!isSoundOptedIn()) return;
  try {
    const audio = new Audio(SOUND_FILES[key]);
    audio.volume = 0.4;
    await audio.play();
  } catch {
    // gracefully ignore missing assets, autoplay blocks, etc.
  }
}
