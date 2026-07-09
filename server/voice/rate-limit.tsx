const WINDOW_MS = 60 * 1000;
const MIN_GAP_MS = 8 * 1000;
const MAX_PER_WINDOW = 3;

const speechRequestsByIp = new Map<string, number[]>();

type VoiceRateLimitVerdict =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number; reason: string };

function prune(timestamps: number[], now: number) {
  return timestamps.filter((time) => now - time < WINDOW_MS);
}

function secondsUntil(time: number, now: number) {
  return Math.max(1, Math.ceil((time - now) / 1000));
}

export function checkVoiceRateLimit(ip: string): VoiceRateLimitVerdict {
  const now = Date.now();
  const requests = prune(speechRequestsByIp.get(ip) ?? [], now);
  speechRequestsByIp.set(ip, requests);

  const lastRequest = requests[requests.length - 1];
  if (lastRequest && now - lastRequest < MIN_GAP_MS) {
    return {
      allowed: false,
      retryAfterSeconds: secondsUntil(lastRequest + MIN_GAP_MS, now),
      reason: 'Please wait a few seconds before regenerating the voice again.',
    };
  }

  if (requests.length >= MAX_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: secondsUntil(requests[0] + WINDOW_MS, now),
      reason: 'Too many voice regenerations. Please try again in a minute.',
    };
  }

  return { allowed: true };
}

export function recordVoiceRequest(ip: string): void {
  const now = Date.now();
  const requests = prune(speechRequestsByIp.get(ip) ?? [], now);
  speechRequestsByIp.set(ip, [...requests, now]);
}
