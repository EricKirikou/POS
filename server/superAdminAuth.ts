import { timingSafeEqual } from "node:crypto";
import { ENV } from "./_core/env";

export const SUPER_ADMIN_OPEN_ID = "tradecore_super_admin";
export const SUPER_ADMIN_SESSION_MS = 8 * 60 * 60 * 1000;

const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const failedAttempts = new Map<string, { count: number; expiresAt: number }>();

function secureEquals(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function isSuperAdminConfigured() {
  return Boolean(ENV.superAdminEmail && ENV.superAdminPassword);
}

export function verifySuperAdminCredentials(email: string, password: string) {
  if (!isSuperAdminConfigured()) return false;

  const expectedEmail = (ENV.superAdminEmail || "superadmin@knust.edu.gh").trim().toLowerCase();
  const expectedPassword = ENV.superAdminPassword || "Admin@123";

  return secureEquals(email.trim().toLowerCase(), expectedEmail) && secureEquals(password, expectedPassword);
}

export function assertAdminLoginAllowed(key: string) {
  const attempt = failedAttempts.get(key);
  if (!attempt) return;
  if (attempt.expiresAt <= Date.now()) {
    failedAttempts.delete(key);
    return;
  }
  if (attempt.count >= MAX_FAILED_ATTEMPTS) throw new Error("Too many failed login attempts. Try again in 15 minutes.");
}

export function recordAdminLoginFailure(key: string) {
  const current = failedAttempts.get(key);
  const previousCount = current && current.expiresAt > Date.now() ? current.count : 0;
  const expiresAt = Date.now() + ATTEMPT_WINDOW_MS;
  failedAttempts.set(key, { count: previousCount + 1, expiresAt });
}

export function clearAdminLoginFailures(key: string) {
  failedAttempts.delete(key);
}

export function resetAdminLoginRateLimitsForTesting() {
  failedAttempts.clear();
}
