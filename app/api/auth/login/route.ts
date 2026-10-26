import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { STATE_COOKIE, appUrl, cookieOptions, missingConfig } from "@/lib/session";

// `repo` is the only OAuth scope that can read PRs in private repositories;
// `read:org` lets review requests made to your teams show up.
const SCOPES = "repo read:org";

export async function GET(req: NextRequest) {
  if (missingConfig().length) return NextResponse.redirect(new URL("/", appUrl(req)));

  const state = randomBytes(16).toString("hex");
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
  authorize.searchParams.set("redirect_uri", `${appUrl(req)}/api/auth/callback`);
  authorize.searchParams.set("scope", SCOPES);
  authorize.searchParams.set("state", state);

  const res = NextResponse.redirect(authorize);
  res.cookies.set(STATE_COOKIE, state, { ...cookieOptions, maxAge: 600 });
  return res;
}
