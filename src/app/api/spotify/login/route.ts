import { NextResponse } from "next/server";
import { challengeFor, randomString, SPOTIFY_SCOPES, spotifyConfigured } from "@/lib/spotify";

// Step 1 of PKCE: build the Spotify authorize URL and stash the
// code_verifier + state in short-lived httpOnly cookies.
export async function GET() {
  if (!spotifyConfigured()) {
    return NextResponse.json(
      { error: "Set SPOTIFY_CLIENT_ID + SPOTIFY_REDIRECT_URI in .env.local (see README)." },
      { status: 500 }
    );
  }
  const verifier = randomString(64);
  const state = randomString(16);
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: "S256",
    code_challenge: challengeFor(verifier),
    state,
  });

  const res = NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`);
  const opts = { httpOnly: true as const, path: "/", maxAge: 600, sameSite: "lax" as const };
  res.cookies.set("spotify_verifier", verifier, opts);
  res.cookies.set("spotify_state", state, opts);
  return res;
}
