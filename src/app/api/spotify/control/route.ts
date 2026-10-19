import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

// One endpoint for every control so tokens stay server-side.
// Body: { action, deviceId?, positionMs?, percent?, state?, contextUri? }
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    deviceId?: string;
    positionMs?: number;
    percent?: number;
    state?: string | boolean;
    contextUri?: string;
  };
  const dev = body.deviceId ? `?device_id=${body.deviceId}` : "";

  switch (body.action) {
    case "play":
      return pass(await spotifyFetch(`/me/player/play${dev}`, { method: "PUT" }));
    case "pause":
      return pass(await spotifyFetch(`/me/player/pause${dev}`, { method: "PUT" }));
    case "next":
      return pass(await spotifyFetch(`/me/player/next${dev}`, { method: "POST" }));
    case "prev":
      return pass(await spotifyFetch(`/me/player/previous${dev}`, { method: "POST" }));
    case "seek":
      return pass(
        await spotifyFetch(`/me/player/seek?position_ms=${body.positionMs ?? 0}${body.deviceId ? `&device_id=${body.deviceId}` : ""}`, { method: "PUT" })
      );
    case "volume":
      return pass(
        await spotifyFetch(`/me/player/volume?volume_percent=${body.percent ?? 50}${body.deviceId ? `&device_id=${body.deviceId}` : ""}`, { method: "PUT" })
      );
    case "shuffle":
      return pass(
        await spotifyFetch(`/me/player/shuffle?state=${body.state ? "true" : "false"}`, { method: "PUT" })
      );
    case "repeat":
      return pass(
        await spotifyFetch(`/me/player/repeat?state=${body.state ?? "off"}`, { method: "PUT" })
      );
    case "transfer":
      return pass(
        await spotifyFetch("/me/player", {
          method: "PUT",
          body: JSON.stringify({ device_ids: [body.deviceId], play: true }),
        })
      );
    case "play-context":
      return pass(
        await spotifyFetch(`/me/player/play${dev}`, {
          method: "PUT",
          body: JSON.stringify({ context_uri: body.contextUri }),
        })
      );
    default:
      return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  }
}

async function pass(upstream: Response) {
  if (upstream.status === 401) return NextResponse.json({ error: "not_connected" }, { status: 401 });
  if (upstream.status === 204 || upstream.status === 202) return NextResponse.json({ ok: true });
  // 404 = no active device (user hasn't opened Spotify anywhere yet).
  if (upstream.status === 404) return NextResponse.json({ error: "no_device" }, { status: 404 });
  const text = await upstream.text();
  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json({ ok: upstream.ok });
  }
}
