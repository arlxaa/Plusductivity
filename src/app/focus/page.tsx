import Link from "next/link";
import { redirect } from "next/navigation";
import OptionalTimer from "@/components/pomodoro/OptionalTimer";
import TodoList from "@/components/todos/TodoList";
import SpotifyCard from "@/components/spotify/SpotifyCard";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { Sparkle, Asterisk, Dots } from "@/components/ui/Decor";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const instant = false;

// Focus mode: a calm full-screen room with only timer + task + music.
// Timer stays optional — hide it and the page still works.
export default async function FocusPage() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
  }

  return (
    <main className="relative mx-auto max-w-3xl overflow-clip px-6 py-8">
      {/* ambient decor */}
      <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
        <div className="breathe absolute left-1/2 top-24 -z-10 size-72 -translate-x-1/2 rounded-full bg-accent-pink/15 blur-3xl" />
        <div className="breathe absolute bottom-10 right-0 -z-10 size-56 rounded-full bg-accent-mint/10 blur-3xl" style={{ animationDelay: "-3s" }} />
        <Sparkle className="absolute left-[6%] top-32 hidden size-5 text-accent-mint animate-float-slow sm:block" />
        <Asterisk className="absolute right-[4%] top-56 hidden size-8 text-accent-pink/70 animate-float-fast sm:block" />
        <Dots className="absolute bottom-24 left-[4%] hidden w-12 text-white/15 sm:block" />
      </div>

      <nav className="relative flex items-center justify-between">
        <Link href="/dashboard" className="btn-pill border border-white/15 px-4 py-2 text-sm hover:bg-white/10">
          ← Dashboard
        </Link>
        <span className="flex items-center gap-2 rounded-full border border-accent-mint/40 bg-accent-mint/10 px-4 py-1.5 text-xs font-semibold tracking-widest text-accent-mint">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-mint opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-accent-mint" />
          </span>
          FOCUS
        </span>
        <ThemeToggle />
      </nav>

      <header className="relative mt-10 text-center">
        <h1 className="font-display text-3xl md:text-4xl">
          One thing <span className="text-accent-mint">at a time.</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Timer, current task, music — <span className="text-accent-pink">nothing else.</span>
        </p>
      </header>

      <div className="relative mt-6 flex flex-col gap-4">
        <OptionalTimer />
        <div className="grid gap-4 md:grid-cols-2">
          <SpotifyCard compact />
          <TodoList compact />
        </div>
      </div>

      <footer className="relative mt-8 text-center">
        <p className="text-xs text-zinc-500">“Slow is smooth, smooth is fast.”</p>
        <Link href="/dashboard" className="btn-pill mt-3 inline-block bg-accent-pink px-6 py-2.5 text-sm font-semibold text-black hover:opacity-90">
          Done focusing ✓
        </Link>
      </footer>
    </main>
  );
}
