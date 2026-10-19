import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

// All Spotify secrets stay on the server. The browser only ever sees a
// short-lived access token (needed by the Web Playback SDK); the refresh
// token lives in an httpOnly cookie and never leaves the server.

export const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "playlist-read-private",
].join(" ");

const ACCESS = "spotify_access_token";
const REFRESH = "spotify_refresh_token";
const EXPIRES = "spotify_expires_at";

export function spotifyConfigured() {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_REDIRECT_URI);
}

export function randomString(len = 64) {
  return randomBytes(len).toString("base64url").slice(0, len);
}

export function challengeFor(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export async function setStoredTokens(t: {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}) {
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";
  store.set(ACCESS, t.access_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: t.expires_in,
  });
  if (t.refresh_token) {
    store.set(REFRESH, t.refresh_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 3600,
    });
  }
  // Refresh 1 min early so the SDK never gets an expired token.
  store.set(EXPIRES, String(Date.now() + t.expires_in * 1000 - 60_000), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });
}

export async function clearStoredTokens() {
  const store = await cookies();
  store.delete(ACCESS);
  store.delete(REFRESH);
  store.delete(EXPIRES);
}

// Returns a working access token, refreshing silently if needed.
export async function getFreshAccessToken(): Promise<string | null> {
  const store = await cookies();
  const access = store.get(ACCESS)?.value ?? null;
  const refresh = store.get(REFRESH)?.value ?? null;
  const expiresAt = Number(store.get(EXPIRES)?.value ?? 0);

  if (access && Date.now() < expiresAt) return access;
  if (!refresh) return null;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh,
      client_id: process.env.SPOTIFY_CLIENT_ID!,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    await clearStoredTokens();
    return null;
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
  // Spotify may omit refresh_token here — keep the old one in that case.
  await setStoredTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  });
  // setStoredTokens only overwrites refresh when present, so nothing lost.
  return data.access_token;
}

// Server-side call to https://api.spotify.com/v1/..., with one retry after refresh.
export async function spotifyFetch(path: string, init?: RequestInit) {
  const token = await getFreshAccessToken();
  if (!token) return new Response(JSON.stringify({ error: "not_connected" }), { status: 401 });

  const doFetch = (t: string) =>
    fetch(`https://api.spotify.com/v1${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });

  let res = await doFetch(token);
  if (res.status === 401) {
    // Token rotated elsewhere — force a refresh and retry once.
    const store = await cookies();
    store.set(EXPIRES, "0", { httpOnly: true, path: "/" });
    const retry = await getFreshAccessToken();
    if (!retry) return new Response(JSON.stringify({ error: "not_connected" }), { status: 401 });
    res = await doFetch(retry);
  }
  return res;
}
