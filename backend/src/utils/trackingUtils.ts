import { config } from "../config/env";

export function checkTrackingCooldown(sentTimestamp: Date): {
  isActive: boolean;
  remainingSeconds: number;
} {
  const now = new Date();
  const timeDifference = now.getTime() - sentTimestamp.getTime();
  const cooldownPeriod = config.TRACKING_COOLDOWN_SECONDS * 1000; // Convert to milliseconds

  const isActive = timeDifference < cooldownPeriod;
  const remainingSeconds = isActive
    ? Math.ceil((cooldownPeriod - timeDifference) / 1000)
    : 0;

  return {
    isActive,
    remainingSeconds,
  };
}

export function logTrackingCooldown(
  trackingId: string,
  eventType: "open" | "click",
  remainingSeconds: number,
): void {
  console.log(
    `❄️ ${
      eventType === "open" ? "Tracking" : "Click tracking"
    } cooldown active: ${remainingSeconds}s remaining for ${trackingId}`,
  );
}

export function logTrackingSuccess(eventType: "open" | "click"): void {
  const message =
    eventType === "open"
      ? "Email open event recorded successfully"
      : "Email click event recorded";
  console.log(message);
}
