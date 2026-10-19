import { NextResponse } from "next/server";
import { clearStoredTokens } from "@/lib/spotify";

export async function POST(request: Request) {
  await clearStoredTokens();
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/dashboard`, { status: 303 });
}
