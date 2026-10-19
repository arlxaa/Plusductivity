import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

// The user's playlists, so they can pick what to play.
export async function GET() {
  const res = await spotifyFetch("/me/playlists?limit=20");
  if (res.status === 401) return NextResponse.json({ error: "not_connected" }, { status: 401 });
  if (!res.ok) return NextResponse.json({ items: [] });
  const data = (await res.json()) as {
    items: { id: string; name: string; uri: string; images: { url: string }[] }[];
  };
  return NextResponse.json({
    items: (data.items ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      uri: p.uri,
      art: p.images[0]?.url ?? null,
    })),
  });
}
