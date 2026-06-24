export type InputAction = "move-up" | "move-down" | "move-left" | "move-right" | "interact" | "cancel" | "open-inventory";

export const KEYBOARD_ACTIONS: Readonly<Record<string, InputAction>> = {
  KeyW: "move-up",
  ArrowUp: "move-up",
  KeyS: "move-down",
  ArrowDown: "move-down",
  KeyA: "move-left",
  ArrowLeft: "move-left",
  KeyD: "move-right",
  ArrowRight: "move-right",
  KeyE: "interact",
  Enter: "interact",
  Escape: "cancel",
  KeyI: "open-inventory",
} as const;

export interface InputContract {
  readonly keyboard: typeof KEYBOARD_ACTIONS;
  readonly touch: readonly ["virtual-joystick", "tap-target", "interact-button"];
  readonly gamepad: readonly ["left-stick", "south-button", "east-button"];
  readonly smoothing: {
    readonly acceleration: number;
    readonly deceleration: number;
    readonly maxSpeed: number;
  };
}

export const INPUT_CONTRACT: InputContract = {
  keyboard: KEYBOARD_ACTIONS,
  touch: ["virtual-joystick", "tap-target", "interact-button"],
  gamepad: ["left-stick", "south-button", "east-button"],
  smoothing: { acceleration: 18, deceleration: 14, maxSpeed: 4.2 },
};
