import { NextResponse } from "next/server";
import { getFreshAccessToken } from "@/lib/spotify";

// Short-lived token for the Web Playback SDK's getOAuthToken callback.
// The refresh token never leaves the server; this access token lives
// in JS memory only (~1h) and is never written to storage by us.
export async function GET() {
  const token = await getFreshAccessToken();
  if (!token) return NextResponse.json({ error: "not_connected" }, { status: 401 });
  const res = NextResponse.json({ access_token: token });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
