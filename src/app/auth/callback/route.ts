import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// After Google login Supabase redirects here with ?code=...
// We exchange the code for a session cookie, then go to /dashboard.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
