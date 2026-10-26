import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, appUrl } from "@/lib/session";

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/", appUrl(req)), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
