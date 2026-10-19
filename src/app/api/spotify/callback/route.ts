import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setStoredTokens } from "@/lib/spotify";

// Step 2 of PKCE: Spotify redirects here with ?code=. Exchange it
// (with the stored verifier) for tokens, then back to the dashboard.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/dashboard?spotify=${reason}`);

  if (url.searchParams.get("error")) return fail("denied");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const verifier = store.get("spotify_verifier")?.value;
  const savedState = store.get("spotify_state")?.value;
  if (!code || !verifier || !state || state !== savedState) return fail("error");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  if (!res.ok) return fail("error");

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  await setStoredTokens(data);

  const done = NextResponse.redirect(`${origin}/dashboard?spotify=connected`);
  done.cookies.delete("spotify_verifier");
  done.cookies.delete("spotify_state");
  return done;
}
