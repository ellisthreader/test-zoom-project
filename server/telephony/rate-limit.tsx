// In-memory rate limiter for the public outbound demo-call endpoint.
// Keeps the Twilio account safe from abuse: per-IP, per-destination-number, and global caps.

const WINDOW_MS = 10 * 60 * 1000;
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;

const MIN_GAP_PER_IP_MS = 45 * 1000;
const MAX_PER_IP_PER_WINDOW = 3;
const MAX_PER_PHONE_PER_WINDOW = 2;
const MAX_GLOBAL_PER_HOUR = 20;

const callsByIp = new Map<string, number[]>();
const callsByPhone = new Map<string, number[]>();
let globalCalls: number[] = [];

type RateLimitVerdict =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number; reason: string };

function prune(timestamps: number[], windowMs: number, now: number): number[] {
  return timestamps.filter((time) => now - time < windowMs);
}

function secondsUntil(oldest: number, windowMs: number, now: number): number {
  return Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
}

export function checkCallRateLimit(ip: string, phone: string): RateLimitVerdict {
  const now = Date.now();

  globalCalls = prune(globalCalls, GLOBAL_WINDOW_MS, now);
  if (globalCalls.length >= MAX_GLOBAL_PER_HOUR) {
    return {
      allowed: false,
      retryAfterSeconds: secondsUntil(globalCalls[0], GLOBAL_WINDOW_MS, now),
      reason: 'The demo line is busy right now. Please try again shortly.',
    };
  }

  const ipCalls = prune(callsByIp.get(ip) ?? [], WINDOW_MS, now);
  callsByIp.set(ip, ipCalls);

  const lastIpCall = ipCalls[ipCalls.length - 1];
  if (lastIpCall && now - lastIpCall < MIN_GAP_PER_IP_MS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((lastIpCall + MIN_GAP_PER_IP_MS - now) / 1000)),
      reason: 'Please wait a moment between test calls.',
    };
  }

  if (ipCalls.length >= MAX_PER_IP_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: secondsUntil(ipCalls[0], WINDOW_MS, now),
      reason: 'You have reached the test-call limit. Please try again in a few minutes.',
    };
  }

  const phoneCalls = prune(callsByPhone.get(phone) ?? [], WINDOW_MS, now);
  callsByPhone.set(phone, phoneCalls);

  if (phoneCalls.length >= MAX_PER_PHONE_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: secondsUntil(phoneCalls[0], WINDOW_MS, now),
      reason: 'This number has already received its test calls. Please try again in a few minutes.',
    };
  }

  return { allowed: true };
}

export function recordCall(ip: string, phone: string): void {
  const now = Date.now();
  globalCalls.push(now);
  callsByIp.set(ip, [...(callsByIp.get(ip) ?? []), now]);
  callsByPhone.set(phone, [...(callsByPhone.get(phone) ?? []), now]);
}
