import { NextResponse } from "next/server";
import { checkOwnerCode, issueOwnerSession, ownerCookieName, ownerCookieOptions, requireOwner, requireOwnerConfiguration, requireSameOrigin } from "@/src/lib/owner-auth";
import { readJsonBody, RequestValidationError } from "@/src/lib/request-validation";

export const runtime = "nodejs";

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof RequestValidationError ? error.message : "Owner access failed." }, { status: error instanceof RequestValidationError ? error.status : 500, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  try {
    requireOwner(request);
    return NextResponse.json({ authenticated: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    // Configuration is checked before reading a potentially slow request body.
    requireOwnerConfiguration();
    const body = await readJsonBody(request, 2_048);
    const code = body && typeof body === "object" && !Array.isArray(body) && "code" in body ? body.code : undefined;
    if (!checkOwnerCode(code)) throw new RequestValidationError("Access code is incorrect.", 401);
    const response = NextResponse.json({ authenticated: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(ownerCookieName(), issueOwnerSession(), ownerCookieOptions());
    return response;
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  try {
    requireOwner(request);
    requireSameOrigin(request);
    const response = NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(ownerCookieName(), "", ownerCookieOptions(0));
    return response;
  } catch (error) { return failure(error); }
}
