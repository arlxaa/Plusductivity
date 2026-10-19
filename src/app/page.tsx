import Link from "next/link";
import Logo from "@/components/ui/Logo";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { Sparkle, Starburst, Asterisk, SketchLines, Dots, Sparkline } from "@/components/ui/Decor";

// Landing in the Cryptoflow style: dark premium, pink + mint headline
// highlights, pill buttons, floating sparkles, and a bento preview.
// All preview cards are static; the real app lives at /dashboard.
export default function LandingPage() {
  return (
    <main className="relative mx-auto max-w-6xl overflow-clip px-6 py-8">
      {/* floating decor, desktop only so mobile stays calm */}
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden select-none md:block">
        <Sparkle className="absolute left-[8%] top-40 size-5 text-accent-mint animate-float-slow" />
        <Sparkle className="absolute right-[10%] top-28 size-4 text-accent-pink animate-float-fast" />
        <Starburst className="absolute right-[4%] top-56 size-16 text-accent-yellow animate-spin-slower" />
        <Asterisk className="absolute left-[3%] top-[26rem] size-10 text-accent-pink animate-float-slow" />
        <SketchLines className="absolute left-0 top-64 w-28 text-white/25" />
        <Dots className="absolute left-[16%] top-96 w-14 text-white/20" />
        <span className="absolute right-[6%] top-[30rem] size-4 rounded-full bg-accent-pink/80" />
        <span className="absolute bottom-40 left-[5%] size-2.5 rounded-full bg-accent-mint/70" />
      </div>

      <nav className="relative flex items-center justify-between">
        <Logo />
        <div className="hidden items-center gap-7 text-sm text-zinc-400 lg:flex">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#how" className="hover:text-white">How it works</a>
          <a href="#demo" className="hover:text-white">Demo</a>
          <a href="#faq" className="hover:text-white">FAQ</a>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="btn-pill border border-white/20 px-5 py-2 text-sm hover:bg-white/10">
            Get the App
          </Link>
        </div>
      </nav>

      <section className="relative mt-14 text-center">
        <div className="flex items-center justify-center gap-3 text-xs">
          <span className="btn-pill border border-white/15 bg-white/5 px-4 py-1.5 text-zinc-300">
            ✨ What&apos;s new? v1.0
          </span>
          <a href="#features" className="btn-pill border border-white/15 px-4 py-1.5 text-zinc-300 hover:bg-white/10">
            Explore Features
          </a>
        </div>

        <h1 className="font-display mx-auto mt-6 max-w-3xl text-4xl leading-[1.15] md:text-6xl">
          Study <span className="text-accent-pink">more.</span>
          <br />
          Switch tabs <span className="text-accent-mint">less.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-zinc-400">
          Timer, tasks, files, links + music — one calm dark dashboard, no tab-switching.
        </p>
        <div id="demo" className="mt-7 flex items-center justify-center gap-3">
          <Link href="/login" className="btn-pill bg-accent-pink px-7 py-3 font-semibold text-black hover:opacity-90">
            Get started +
          </Link>
          <Link href="/dashboard" className="btn-pill border border-white/20 px-7 py-3 hover:bg-white/10">
            ▶ Show demo
          </Link>
        </div>
      </section>

      {/* Bento preview, mirroring the reference's overlapping card strip */}
      <section id="features" aria-label="Dashboard preview" className="relative mt-14 grid scroll-mt-20 gap-4 md:grid-cols-12">
        {/* icon chips */}
        <div className="bento-card tilt-left p-4 md:col-span-3">
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] text-zinc-400">
            {[["⏱", "mint", "Quick timer"], ["✔", "pink", "Tasks"], ["📁", "yellow", "Subjects"], ["🔗", "lavender", "Links"]].map(([icon, tint, label]) => (
              <div key={label}>
                <span
                  className="mx-auto grid size-10 place-items-center rounded-full text-lg"
                  style={{ background: `var(--color-accent-${tint})`, color: "#0b0b0d" }}
                >
                  {icon}
                </span>
                <p className="mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* hero focus card */}
        <div className="bento-card card-tint-pink overflow-hidden p-5 md:col-span-6">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/25 blur-2xl" />
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-white text-2xl font-black text-black">+</div>
          <p className="mt-2 text-center text-sm text-black/70">Today&apos;s focus 04:23:12</p>
          <p className="font-display text-center text-4xl text-black">25:00</p>
          <div className="mx-auto mt-3 max-w-xs">
            <div className="flex justify-between text-[11px] font-medium text-black/70">
              <span>Today&apos;s progress</span>
              <span>80%</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-black/15">
              <div className="h-full w-4/5 rounded-full bg-black/70" />
            </div>
          </div>
        </div>

        {/* buddies */}
        <div className="bento-card tilt-right p-4 md:col-span-3">
          <div className="flex items-center">
            {["🧑‍🎓", "👩‍🎓", "🧑‍💻"].map((e) => (
              <span key={e} className="-ml-1 grid size-10 place-items-center rounded-full border-2 border-ink bg-white/10 text-xl first:ml-0">
                {e}
              </span>
            ))}
            <span className="-ml-1 grid size-10 place-items-center rounded-full border-2 border-ink bg-accent-mint text-xl font-bold text-black">+</span>
          </div>
          <p className="mt-2 text-sm text-zinc-400">Study with friends, zero distractions</p>
        </div>

        {/* analyze */}
        <Link href="/stats" className="bento-card block p-4 md:col-span-3">
          <p className="font-display text-sm">Analyze progress</p>
          <p className="mt-1 text-xs text-zinc-400">Discover hidden study streaks →</p>
          <Sparkline className="mt-2 h-8 w-full" />
        </Link>

        {/* tasks mini */}
        <div className="bento-card card-tint-mint p-4 md:col-span-3">
          <p className="text-xs text-zinc-400">Tasks</p>
          <p className="font-display text-2xl">12/18</p>
          <Sparkline className="mt-1 h-7 w-full" stroke="#0B0B0D" />
        </div>

        {/* streak */}
        <div className="bento-card p-4 md:col-span-3">
          <span className="grid size-10 place-items-center rounded-full bg-accent-mint text-xl">🔥</span>
          <p className="mt-2 text-xs text-zinc-400">Study streak</p>
          <p className="font-display text-2xl">12 days</p>
        </div>

        {/* links mini */}
        <div className="bento-card card-tint-yellow p-4 md:col-span-3">
          <p className="text-xs text-zinc-600">Quick links</p>
          <p className="font-display text-2xl">8 saved</p>
          <p className="mt-1 text-xs text-zinc-500">One click, new tab, back to work</p>
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="relative mt-14 scroll-mt-20 text-center">
        <h2 className="font-display text-2xl md:text-3xl">
          From chaos to <span className="text-accent-mint">calm</span> in three steps
        </h2>
        <div className="mt-6 grid gap-4 text-left md:grid-cols-3">
          {[
            ["1", "Add your subjects", "Create Calculus, Algorithms… each with its own color, files + links."],
            ["2", "Connect Spotify", "Premium unlocks in-app playback. Mobile? Control the app remotely."],
            ["3", "Hit focus mode", "Timer (optional) + current task + music. Nothing else on screen."],
          ].map(([n, title, body]) => (
            <div key={n} className="bento-card p-5">
              <span className="font-display text-accent-pink">{n}</span>
              <p className="font-display mt-1">{title}</p>
              <p className="mt-1 text-sm text-zinc-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* faq */}
      <section id="faq" className="relative mx-auto mt-14 max-w-2xl scroll-mt-20">
        <h2 className="font-display text-center text-2xl">
          Quick answers <span className="text-accent-pink">+</span>
        </h2>
        <div className="mt-6 flex flex-col gap-3">
          {[
            ["Is the timer mandatory?", "No. Hide it with one click — tasks, files and links work perfectly without it."],
            ["Do I need Spotify Premium?", "Only for playback. Everything else (timer, tasks, files, links) is free forever."],
            ["Does it work on mobile?", "Yes, responsive. Only in-browser Spotify sound needs desktop; mobile remote-controls the app."],
          ].map(([q, a]) => (
            <details key={q} className="bento-card px-5 py-4">
              <summary className="cursor-pointer font-medium">{q}</summary>
              <p className="mt-2 text-sm text-zinc-400">{a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link href="/login" className="btn-pill inline-block bg-accent-pink px-8 py-3 font-semibold text-black hover:opacity-90">
            Get started — it&apos;s free +
          </Link>
        </div>
      </section>

      <footer className="mt-14 flex items-center justify-between border-t border-white/10 py-6 text-xs text-zinc-500">
        <span className="font-display text-sm text-zinc-300"><span className="text-accent-pink">plus</span>ductivity</span>
        <span>Study more. Switch tabs less.</span>
      </footer>
    </main>
  );
}
