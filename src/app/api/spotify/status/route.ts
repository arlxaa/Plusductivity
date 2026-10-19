import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

// Who is connected? Also the Premium check — only Premium can use playback.
export async function GET() {
  const res = await spotifyFetch("/me");
  if (res.status === 401) return NextResponse.json({ connected: false });
  if (!res.ok) return NextResponse.json({ connected: true, unknown: true });
  const me = (await res.json()) as {
    display_name?: string;
    email?: string;
    product?: string;
  };
  return NextResponse.json({
    connected: true,
    name: me.display_name ?? me.email ?? "Spotify user",
    premium: me.product === "premium",
  });
}
