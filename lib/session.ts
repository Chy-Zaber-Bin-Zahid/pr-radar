import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "prradar_session";
export const STATE_COOKIE = "prradar_oauth_state";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

// The GitHub token never reaches browser JavaScript: it lives in an
// encrypted, httpOnly cookie that only the API routes can read.
export type Session = {
  token: string;
  login: string;
  name: string | null;
  avatarUrl: string;
};

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function missingConfig(): string[] {
  const missing = ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "SESSION_SECRET"].filter((k) => !process.env[k]);
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) missing.push("SESSION_SECRET (needs 32+ characters)");
  return missing;
}

export function appUrl(req: NextRequest): string {
  return process.env.APP_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
}

function key(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters");
  return createHash("sha256").update(secret).digest();
}

export function seal(session: Session): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}

export function unseal(value: string): Session | null {
  const k = key();
  try {
    const buf = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", k, buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    const json = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
    return JSON.parse(json) as Session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  if (!process.env.SESSION_SECRET) return null;
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value ? unseal(value) : null;
}
