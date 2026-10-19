import { redirect } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import TodoList from "@/components/todos/TodoList";
import OptionalTimer from "@/components/pomodoro/OptionalTimer";
import SubjectGrid from "@/components/subjects/SubjectGrid";
import LinkList from "@/components/links/LinkList";
import SpotifyCard from "@/components/spotify/SpotifyCard";
import ThemeToggle from "@/components/ui/ThemeToggle";
import CommandPalette from "@/components/search/CommandPalette";
import { Sparkle, Asterisk, Dots } from "@/components/ui/Decor";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const instant = false; // reads auth cookie, so must render dynamically

export default async function DashboardPage() {
  let email = "demo mode — add Supabase keys to log in";

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    email = user.email ?? "student";
  }

  return (
    <main className="relative mx-auto max-w-6xl overflow-clip px-6 py-8">
      {/* sparse floating decor, desktop only */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden select-none md:block">
        <Sparkle className="absolute right-[8%] top-24 size-4 text-accent-mint animate-float-slow" />
        <Asterisk className="absolute left-[2%] top-72 size-8 text-accent-pink/70 animate-float-fast" />
        <Dots className="absolute right-[3%] top-96 w-12 text-white/15" />
      </div>

      <nav className="relative flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2 text-sm">
          <CommandPalette />
          <ThemeToggle />
          <span className="mr-1 hidden rounded-full border border-accent-mint/40 bg-accent-mint/10 px-3 py-1 text-xs text-accent-mint sm:inline">
            {email}
          </span>
          <Link href="/focus" className="btn-pill border border-white/15 px-4 py-2 hover:bg-white/10">
            ✦ Focus mode
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn-pill border border-white/15 px-4 py-2 hover:bg-white/10">
              Log out
            </button>
          </form>
        </div>
      </nav>

      <header className="relative mt-10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">
            Good evening <span className="text-accent-pink">+</span> let&apos;s focus
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Everything in <span className="text-accent-mint">one place</span> — no tab-switching.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="btn-pill bg-accent-pink px-3 py-1 font-semibold text-black">Today</span>
          <Link href="/stats" className="btn-pill border border-white/15 px-3 py-1 text-zinc-400 hover:bg-white/10">
            This week →
          </Link>
        </div>
      </header>

      <div className="relative mt-6 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <OptionalTimer />
        </div>
        <SpotifyCard />
        <div className="md:col-span-2">
          <TodoList />
        </div>
        <SubjectGrid />
        <div className="md:col-span-3">
          <LinkList />
        </div>
      </div>

      <footer className="mt-10 border-t border-white/10 py-5 text-center text-xs text-zinc-500">
        <span className="text-accent-pink">+</span> plusductivity — study more, switch tabs less.
      </footer>
    </main>
  );
}
