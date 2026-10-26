import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, STATE_COOKIE, appUrl, cookieOptions, seal } from "@/lib/session";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const home = new URL("/", appUrl(req));
  const fail = (reason: string) => {
    home.searchParams.set("error", reason);
    const res = NextResponse.redirect(home);
    res.cookies.delete(STATE_COOKIE);
    return res;
  };

  if (params.get("error")) return fail(params.get("error")!);
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || state !== req.cookies.get(STATE_COOKIE)?.value) return fail("state_mismatch");

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${appUrl(req)}/api/auth/callback`,
    }),
  });
  const tokenJson = (await tokenRes.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!tokenJson.access_token) return fail(tokenJson.error ?? "token_exchange_failed");

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "pr-radar",
    },
  });
  if (!userRes.ok) return fail("user_lookup_failed");
  const user = (await userRes.json()) as { login: string; name: string | null; avatar_url: string };

  const res = NextResponse.redirect(home);
  res.cookies.delete(STATE_COOKIE);
  res.cookies.set(
    SESSION_COOKIE,
    seal({ token: tokenJson.access_token, login: user.login, name: user.name, avatarUrl: user.avatar_url }),
    { ...cookieOptions, maxAge: SESSION_MAX_AGE },
  );
  return res;
}
