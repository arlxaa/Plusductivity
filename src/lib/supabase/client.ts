import { createBrowserClient } from "@supabase/ssr";

// Client-side Supabase (browser). Uses the public anon key only.
// Never put service_role or Spotify secrets here.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
