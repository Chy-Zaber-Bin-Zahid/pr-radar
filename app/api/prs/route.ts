import { NextResponse } from "next/server";
import { GitHubAuthError, fetchDashboard } from "@/lib/github";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    return NextResponse.json(await fetchDashboard(session.token));
  } catch (err) {
    if (err instanceof GitHubAuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
