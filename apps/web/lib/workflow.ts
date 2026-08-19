const TIME_STRING_PATTERN = /^(\d+(?:\.\d+)?)(ms|s|m|h)$/i;

function toMilliseconds(value: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60_000;
    case "h":
      return value * 3_600_000;
    default:
      throw new Error(`Unsupported time unit: ${unit}`);
  }
}

function parseDuration(duration: string): number {
  const normalized = duration.trim();
  const match = TIME_STRING_PATTERN.exec(normalized);

  if (!match) {
    throw new Error(
      `Invalid duration "${duration}". Use formats like "100ms", "5s", "2m", or "1h".`,
    );
  }

  const amount = Number(match[1]);
  const unit = match[2];

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`Invalid duration value: "${duration}"`);
  }

  return toMilliseconds(amount, unit);
}

export function sleep(duration: string | number): Promise<void> {
  const milliseconds =
    typeof duration === "number" ? duration : parseDuration(duration);

  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    throw new Error("Sleep duration must be a non-negative finite number.");
  }

  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
