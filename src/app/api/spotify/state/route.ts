import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

// Full player state: device, current track, progress, shuffle/repeat, volume.
export async function GET() {
  const res = await spotifyFetch("/me/player");
  if (res.status === 401) return NextResponse.json({ error: "not_connected" }, { status: 401 });
  if (res.status === 204) return NextResponse.json({ playing: false, noDevice: true });
  if (!res.ok) return NextResponse.json({ playing: false });
  const p = (await res.json()) as {
    is_playing: boolean;
    progress_ms: number;
    device: { id: string; name: string; volume_percent: number };
    shuffle_state: boolean;
    repeat_state: string;
    item: {
      name: string;
      duration_ms: number;
      artists: { name: string }[];
      album: { images: { url: string }[] };
    } | null;
  };
  return NextResponse.json({
    playing: p.is_playing,
    progressMs: p.progress_ms,
    durationMs: p.item?.duration_ms ?? 0,
    track: p.item?.name ?? null,
    artist: (p.item?.artists ?? []).map((a) => a.name).join(", "),
    art: p.item?.album.images[0]?.url ?? null,
    device: p.device?.name ?? null,
    deviceId: p.device?.id ?? null,
    volume: p.device?.volume_percent ?? 50,
    shuffle: p.shuffle_state,
    repeat: p.repeat_state ?? "off",
  });
}
