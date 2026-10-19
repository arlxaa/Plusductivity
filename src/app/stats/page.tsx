import Link from "next/link";
import { redirect } from "next/navigation";
import StatsView from "@/components/stats/StatsView";
import ThemeToggle from "@/components/ui/ThemeToggle";
import CommandPalette from "@/components/search/CommandPalette";
import { Sparkle } from "@/components/ui/Decor";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const instant = false;

// Weekly stats: focus minutes, sessions, streak, tasks done.
export default async function StatsPage() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  }

  return (
    <main className="relative mx-auto max-w-4xl overflow-clip px-6 py-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden select-none sm:block">
        <Sparkle className="absolute right-[8%] top-24 size-4 text-accent-yellow animate-float-slow" />
      </div>

      <nav className="relative flex items-center justify-between">
        <Link href="/dashboard" className="btn-pill border border-white/15 px-4 py-2 text-sm hover:bg-white/10">
          ← Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <CommandPalette />
          <ThemeToggle />
        </div>
      </nav>

      <header className="relative mt-8">
        <h1 className="font-display text-3xl">
          Your week in <span className="text-accent-mint">numbers</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-400">Last 7 days of focus + finished tasks.</p>
      </header>

      <div className="relative mt-6">
        <StatsView />
      </div>
    </main>
  );
}
