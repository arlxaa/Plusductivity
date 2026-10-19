# plusductivity — Study more. Switch tabs *less*.

All-in-one student dashboard: Spotify, pomodoro, todos, subject files, quick links.

## Phase 4 — what works now
Spotify card: Connect via OAuth (PKCE), Premium check, in-browser playback (desktop) with art/title/artist, seekable progress, play/pause/next/prev, volume, shuffle/repeat, playlist picker. Mobile fallback: control the Spotify app on your device from the same buttons. Tokens stay server-side (refresh token in httpOnly cookie, never in DB/client).

## Run it
```bash
cd plusductivity
npm install
npm run dev
```

## Supabase setup
1. https://supabase.com → New project → copy Project URL + anon key.
2. `.env.local` from `.env.example`, fill `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. SQL Editor → run `0001_init.sql`, then `0002_profile_trigger.sql`, then `0003_storage_policies.sql`.
4. Auth → enable Email + Google.
5. Storage → new **private** bucket `subject-files`.

## Spotify setup (step by step)
1. Go to https://developer.spotify.com/dashboard → Log in → Create app. Name it `plusductivity`, tick Web API + Web Playback SDK.
2. Open the app → Settings → Redirect URIs → add exactly:
   - `http://localhost:3000/api/spotify/callback` (dev)
   - later your Vercel URL + `/api/spotify/callback` (prod)
   Save.
3. Copy the **Client ID** (no secret needed — PKCE doesn't use one).
4. Add to `.env.local`:
   ```
   SPOTIFY_CLIENT_ID=paste-it-here
   SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
   ```
5. Still in Settings → User Management → add your Spotify email (dev-mode apps only allow listed users).
6. Restart `npm run dev` → dashboard → Connect Spotify → log in → Accept.
7. Desktop Chrome/Edge: this browser tab becomes a Spotify device (press Play to start). Mobile: open Spotify on the device, then these buttons remote-control it.

Premium is required by Spotify for any playback control. Non-Premium accounts get a clear message; everything else keeps working.

## Deploy
Push to GitHub → Vercel → Import → add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_REDIRECT_URI` (prod callback URL) → Deploy. Also add the prod redirect URI in the Spotify dashboard.

## Known limitations
- Web Playback SDK: desktop browsers only, no mobile in-browser sound (fallback remote control included).
- One upload at a time shows "Uploading…"; no byte-level % bar (Supabase JS has no progress callback).
- Single-user only: no sharing, no AI, no mobile app (out of scope).

## What to build next
- Search across tasks/files/links + `Cmd+K` palette
- Keyboard shortcuts, PWA install, weekly stats page
- Per-subject pomodoro linking + per-subject todo filter on subject pages
