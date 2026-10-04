import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { RequestValidationError } from "./request-validation";

const PURPOSE = "aura-owner-session-v1";
const SESSION_SECONDS = 3_600;
export const ownerCookieName = () => process.env.NODE_ENV === "production" ? "__Host-aura_owner" : "aura_owner";

export function requireOwnerConfiguration(): string {
  const code = process.env.AI_OWNER_ACCESS_CODE;
  if (!code || code.length < 32 || code.length > 512 || !/^[A-Za-z0-9_-]+$/.test(code) || new Set(code).size < 12 || /change.?me|replace.?me|your.?access.?code|example|placeholder/i.test(code)) {
    throw new RequestValidationError("Owner access is not configured.", 503);
  }
  return code;
}

export function requireSameOrigin(request: Request): void {
  const url = new URL(request.url);
  const host = request.headers.get("host")?.trim().toLowerCase() ?? url.host;
  const forwarded = request.headers.get("x-forwarded-proto")?.trim().toLowerCase();
  if (forwarded && forwarded !== "http" && forwarded !== "https") throw new RequestValidationError("Request origin is not allowed.", 403);
  const protocol = forwarded === "http" || forwarded === "https" ? forwarded : url.protocol.slice(0, -1);
  let expected: URL;
  try { expected = new URL(`${protocol}://${host}`); }
  catch { throw new RequestValidationError("Request origin is not allowed.", 403); }
  // Next's adapter can use an internal request URL. Host remains browser-facing.
  if (!["http:", "https:"].includes(expected.protocol) || expected.host !== host || expected.username || expected.password || request.headers.get("sec-fetch-site") === "cross-site" || request.headers.get("origin") !== expected.origin) {
    throw new RequestValidationError("Request origin is not allowed.", 403);
  }
}

export function checkOwnerCode(candidate: unknown): boolean {
  const configured = requireOwnerConfiguration();
  if (typeof candidate !== "string" || candidate.length > 512) return false;
  return timingSafeEqual(createHash("sha256").update(candidate).digest(), createHash("sha256").update(configured).digest());
}

function signature(payload: string, code: string): string {
  return createHmac("sha256", code).update(`${PURPOSE}.${payload}`).digest("base64url");
}

export function issueOwnerSession(now = Date.now()): string {
  const code = requireOwnerConfiguration();
  const issued = Math.floor(now / 1_000);
  const payload = Buffer.from(JSON.stringify({ purpose: PURPOSE, issued, expires: issued + SESSION_SECONDS, nonce: randomBytes(18).toString("base64url") })).toString("base64url");
  return `${payload}.${signature(payload, code)}`;
}

export function requireOwner(request: Request, now = Date.now()): void {
  const code = requireOwnerConfiguration();
  const values = (request.headers.get("cookie") ?? "").split(";").map(value => value.trim()).filter(value => value.startsWith(`${ownerCookieName()}=`));
  const token = values.length === 1 ? values[0].slice(ownerCookieName().length + 1) : "";
  if (!token || token.length > 700) throw new RequestValidationError("Owner access required.", 401);
  const [payload, supplied, extra] = token.split(".");
  if (!payload || !/^[A-Za-z0-9_-]+$/.test(payload) || !supplied || !/^[A-Za-z0-9_-]{43}$/.test(supplied) || extra !== undefined) {
    throw new RequestValidationError("Owner access required.", 401);
  }
  const expected = signature(payload, code);
  if (!timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) throw new RequestValidationError("Owner access required.", 401);
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const seconds = Math.floor(now / 1_000);
    if (session.purpose !== PURPOSE || !Number.isInteger(session.issued) || !Number.isInteger(session.expires) || session.expires - session.issued !== SESSION_SECONDS || session.issued > seconds + 30 || session.expires <= seconds || !/^[A-Za-z0-9_-]{24}$/.test(session.nonce)) {
      throw new Error("Invalid session");
    }
  } catch {
    throw new RequestValidationError("Owner access required.", 401);
  }
}

export function ownerCookieOptions(maxAge = SESSION_SECONDS) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge };
}
