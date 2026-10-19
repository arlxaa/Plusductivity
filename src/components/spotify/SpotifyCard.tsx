"use client";

import { useEffect, useRef, useState } from "react";
import Card from "@/components/ui/Card";

declare global {
  interface Window {
    Spotify?: {
      Player: new (opts: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
      }) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

type SpotifyPlayer = {
  connect: () => void;
  disconnect: () => void;
  addListener: (event: string, cb: (arg: never) => void) => void;
};

type Track = {
  playing: boolean;
  progressMs: number;
  durationMs: number;
  track: string | null;
  artist: string;
  art: string | null;
  device: string | null;
  volume: number;
  shuffle: boolean;
  repeat: string;
  noDevice?: boolean;
};

type Phase = "loading" | "unconfigured" | "disconnected" | "no-premium" | "ready";

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

// Full Spotify control: album art, title, artist, seekable progress,
// play/pause/next/prev, volume, shuffle/repeat, playlists.
// Premium required. On mobile the in-browser SDK doesn't work, so we fall
// back to controlling whichever device is already playing Spotify.
export default function SpotifyCard({ compact = false }: { compact?: boolean }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [name, setName] = useState("");
  const [track, setTrack] = useState<Track | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<{ id: string; name: string; uri: string; art: string | null }[]>([]);
  const [showLists, setShowLists] = useState(false);
  const [seeking, setSeeking] = useState<number | null>(null);
  const [mobile] = useState(
    () => typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
  );
  const deviceId = useRef<string | null>(null);
  const playerRef = useRef<SpotifyPlayer | null>(null);

  async function refresh() {
    try {
      const r = await fetch("/api/spotify/state", { cache: "no-store" });
      if (r.status === 401) {
        setPhase("disconnected");
        return;
      }
      const d = (await r.json()) as Track & { playing: boolean };
      setTrack({
        playing: d.playing,
        progressMs: d.progressMs ?? 0,
        durationMs: d.durationMs ?? 0,
        track: d.track ?? null,
        artist: d.artist ?? "",
        art: d.art ?? null,
        device: d.device ?? null,
        volume: d.volume ?? 50,
        shuffle: d.shuffle ?? false,
        repeat: d.repeat ?? "off",
        noDevice: d.noDevice,
      });
    } catch {
      /* offline — keep last state */
    }
  }

  // 1. Who is connected? (also the Premium + configured checks)
  useEffect(() => {
    async function check() {
      try {
        const r = await fetch("/api/spotify/status", { cache: "no-store" });
        const d = (await r.json()) as { connected: boolean; premium?: boolean; name?: string; error?: string };
        if (d.error) {
          setPhase("unconfigured");
          return;
        }
        if (!d.connected) {
          setPhase("disconnected");
          return;
        }
        if (d.premium === false) {
          setPhase("no-premium");
          return;
        }
        setName(d.name ?? "");
        setPhase("ready");
      } catch {
        setPhase("disconnected");
      }
    }
    check();
  }, []);

  // 2. Local progress tick so the bar moves smoothly between API polls.
  useEffect(() => {
    if (!track?.playing) return;
    const id = setInterval(() => {
      setTrack((t) =>
        t && t.durationMs ? { ...t, progressMs: Math.min(t.durationMs, t.progressMs + 1000) } : t
      );
    }, 1000);
    return () => clearInterval(id);
  }, [track?.playing]);

  // 3. Desktop: load the Web Playback SDK. Mobile: poll the active device instead.
  useEffect(() => {
    if (phase !== "ready" || mobile) return;

    function boot() {
      if (!window.Spotify || playerRef.current) return;
      const player = new window.Spotify.Player({
        name: "plusductivity",
        getOAuthToken: async (cb) => {
          const r = await fetch("/api/spotify/token");
          const d = (await r.json()) as { access_token?: string };
          if (d.access_token) cb(d.access_token);
        },
        volume: 0.5,
      });
      playerRef.current = player;

      player.addListener("ready", (({ device_id }: { device_id: string }) => {
        deviceId.current = device_id;
        // Make this browser tab the active Spotify device.
        fetch("/api/spotify/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "transfer", deviceId: device_id }),
        }).then(() => refresh());
      }) as (arg: never) => void);

      player.addListener("player_state_changed", ((s: {
        paused: boolean;
        position: number;
        duration: number;
        shuffle: boolean;
        repeat_mode: number;
        track_window: {
          current_track: { name: string; artists: { name: string }[]; album: { images: { url: string }[] } };
        };
      } | null) => {
        if (!s) return;
        const t = s.track_window.current_track;
        setTrack((prev) => ({
          playing: !s.paused,
          progressMs: s.position,
          durationMs: s.duration,
          track: t.name,
          artist: t.artists.map((a) => a.name).join(", "),
          art: t.album.images[0]?.url ?? prev?.art ?? null,
          device: prev?.device ?? "This browser",
          volume: prev?.volume ?? 50,
          shuffle: s.shuffle,
          repeat: s.repeat_mode === 2 ? "track" : s.repeat_mode === 1 ? "context" : "off",
        }));
      }) as (arg: never) => void);

      player.addListener("authentication_error", (() => {
        setHint("Spotify session expired — disconnect and connect again.");
      }) as (arg: never) => void);

      player.connect();
    }

    if (window.Spotify) {
      boot();
    } else {
      window.onSpotifyWebPlaybackSDKReady = boot;
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      script.onerror = () => setHint("Could not load the Spotify player — check your connection.");
      document.body.appendChild(script);
    }

    return () => {
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mobile]);

  // 4. Mobile fallback: poll whatever device is playing.
  useEffect(() => {
    if (phase !== "ready" || !mobile) return;
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mobile]);

  async function control(body: Record<string, unknown>) {
    setHint(null);
    const r = await fetch("/api/spotify/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: deviceId.current ?? undefined, ...body }),
    });
    const d = (await r.json().catch(() => ({}))) as { error?: string };
    if (d.error === "no_device") {
      setHint("No active Spotify device — open Spotify on any device and press play once, then try again.");
    }
    // Optimistic flip for instant-feeling buttons, then sync with reality.
    if (body.action === "play") setTrack((t) => (t ? { ...t, playing: true } : t));
    if (body.action === "pause") setTrack((t) => (t ? { ...t, playing: false } : t));
    setTimeout(refresh, 600);
  }

  async function disconnect() {
    await fetch("/api/spotify/signout", { method: "POST" });
    playerRef.current?.disconnect();
    playerRef.current = null;
    deviceId.current = null;
    setPhase("disconnected");
    setTrack(null);
  }

  async function openPlaylists() {
    const next = !showLists;
    setShowLists(next);
    if (next && playlists.length === 0) {
      const r = await fetch("/api/spotify/playlists");
      const d = (await r.json()) as { items?: typeof playlists };
      setPlaylists(d.items ?? []);
    }
  }

  if (phase === "loading") {
    return (
      <Card>
        <h2 className="font-display">Spotify</h2>
        <p className="mt-3 animate-pulse text-zinc-500">Checking Spotify…</p>
      </Card>
    );
  }

  if (phase === "unconfigured") {
    return (
      <Card>
        <h2 className="font-display">Spotify</h2>
        <p className="mt-3 text-sm text-zinc-400">
          Add <code>SPOTIFY_CLIENT_ID</code> + <code>SPOTIFY_REDIRECT_URI</code> to{" "}
          <code>.env.local</code> (see README Phase 4), then restart.
        </p>
      </Card>
    );
  }

  if (phase === "disconnected") {
    return (
      <Card>
        <h2 className="font-display">Spotify</h2>
        <p className="mt-3 text-sm text-zinc-400">
          Study with your own music. Requires Spotify Premium.
        </p>
        <a
          href="/api/spotify/login"
          className="mt-4 inline-block rounded-full bg-accent-pink px-5 py-2 text-sm font-semibold text-black"
        >
          Connect Spotify
        </a>
      </Card>
    );
  }

  if (phase === "no-premium") {
    return (
      <Card>
        <h2 className="font-display">Spotify</h2>
        <p className="mt-3 text-sm text-zinc-400">
          Your Spotify account isn&apos;t Premium, so in-app playback is blocked by Spotify.
          Timer, tasks, files + links all still work.{" "}
          <button onClick={disconnect} className="text-accent-mint hover:underline">
            Disconnect
          </button>
        </p>
      </Card>
    );
  }

  const progress = seeking ?? track?.progressMs ?? 0;
  const duration = track?.durationMs ?? 0;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-display">Spotify</h2>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          {name && <span className="hidden sm:inline">{name}</span>}
          <button onClick={disconnect} className="hover:text-white">
            Disconnect
          </button>
        </div>
      </div>

      {mobile && (
        <p className="mt-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-zinc-400">
          Mobile browser: in-browser sound isn&apos;t supported by Spotify here — open Spotify on
          this device and control it from these buttons.
        </p>
      )}

      <div className="mt-3 flex items-center gap-3">
        {track?.art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={track.art} alt="Album art" width={compact ? 48 : 64} height={compact ? 48 : 64} className="rounded-xl" />
        ) : (
          <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-white/10 text-2xl">🎵</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{track?.track ?? "Nothing playing"}</p>
          <p className="truncate text-sm text-zinc-400">
            {track?.artist || (track?.noDevice ? "Open Spotify and press play once" : "Pick a playlist below")}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
        <span>{fmt(progress)}</span>
        <input
          type="range"
          min={0}
          max={Math.max(duration, 1)}
          value={Math.min(progress, Math.max(duration, 1))}
          onChange={(e) => setSeeking(Number(e.target.value))}
          onPointerUp={(e) => {
            const v = Number((e.target as HTMLInputElement).value);
            setSeeking(null);
            control({ action: "seek", positionMs: v });
          }}
          aria-label="Seek"
          className="flex-1 accent-[#F9A8D4]"
        />
        <span>{fmt(duration)}</span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button onClick={() => control({ action: "shuffle", state: !track?.shuffle })} aria-label="Toggle shuffle"
          className={`rounded-full px-3 py-2 text-sm ${track?.shuffle ? "bg-accent-mint text-black" : "border border-white/15 text-zinc-400"}`}>
          🔀
        </button>
        <button onClick={() => control({ action: "prev" })} aria-label="Previous" className="rounded-full border border-white/15 px-4 py-2">⏮</button>
        {track?.playing ? (
          <button onClick={() => control({ action: "pause" })} aria-label="Pause" className="flex-1 rounded-full bg-accent-pink py-2 font-semibold text-black">⏸ Pause</button>
        ) : (
          <button onClick={() => control({ action: "play" })} aria-label="Play" className="flex-1 rounded-full bg-accent-pink py-2 font-semibold text-black">▶ Play</button>
        )}
        <button onClick={() => control({ action: "next" })} aria-label="Next" className="rounded-full border border-white/15 px-4 py-2">⏭</button>
        <button
          onClick={() => control({ action: "repeat", state: track?.repeat === "off" ? "context" : track?.repeat === "context" ? "track" : "off" })}
          aria-label="Cycle repeat"
          title={`Repeat: ${track?.repeat ?? "off"}`}
          className={`rounded-full px-3 py-2 text-sm ${track?.repeat !== "off" ? "bg-accent-mint text-black" : "border border-white/15 text-zinc-400"}`}>
          🔁
        </button>
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
        🔊
        <input
          type="range"
          min={0}
          max={100}
          value={track?.volume ?? 50}
          onChange={(e) => control({ action: "volume", percent: Number(e.target.value) })}
          aria-label="Volume"
          className="flex-1 accent-[#B8F58B]"
        />
      </label>

      {hint && <p className="mt-2 text-xs text-accent-yellow">{hint}</p>}

      {!compact && (
        <div className="mt-3">
          <button onClick={openPlaylists} className="text-sm text-accent-mint hover:underline">
            {showLists ? "Hide playlists" : "Choose a playlist +"}
          </button>
          {showLists && (
            <ul className="mt-2 flex max-h-48 flex-col gap-1 overflow-auto">
              {playlists.length === 0 ? (
                <li className="text-sm text-zinc-500">No playlists found.</li>
              ) : (
                playlists.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => control({ action: "play-context", contextUri: p.uri })}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/10"
                    >
                      {p.art ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.art} alt="" width={28} height={28} className="rounded" />
                      ) : (
                        <span>🎶</span>
                      )}
                      <span className="truncate">{p.name}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
