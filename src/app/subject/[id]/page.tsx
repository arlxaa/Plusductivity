import Link from "next/link";
import { redirect } from "next/navigation";
import FileManager from "@/components/files/FileManager";
import LinkList from "@/components/links/LinkList";
import ThemeToggle from "@/components/ui/ThemeToggle";
import CommandPalette from "@/components/search/CommandPalette";
import { Sparkle, Dots } from "@/components/ui/Decor";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const instant = false;

// One subject: tinted header in its own color, live file/link counts,
// then its files + links. Todos per subject arrive with later polish.
export default async function SubjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let subject: { name: string; color: string; icon: string } | null = null;
  let fileCount: number | null = null;
  let linkCount: number | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const [{ data: row }, { count: fc }, { count: lc }] = await Promise.all([
      supabase.from("subjects").select("name,color,icon").eq("id", id).single(),
      supabase.from("files").select("id", { count: "exact", head: true }).eq("subject_id", id),
      supabase.from("links").select("id", { count: "exact", head: true }).eq("subject_id", id),
    ]);
    subject = (row as { name: string; color: string; icon: string } | null) ?? null;
    fileCount = fc;
    linkCount = lc;
  }

  const name = subject?.name ?? (isSupabaseConfigured() ? "Subject not found" : "Demo subject");
  const color = subject?.color ?? "#F9A8D4";
  const icon = subject?.icon ?? "📁";

  return (
    <main className="relative mx-auto max-w-4xl overflow-clip px-6 py-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 hidden select-none sm:block">
        <Sparkle className="absolute right-[6%] top-32 size-4 text-accent-mint animate-float-slow" />
        <Dots className="absolute left-[2%] top-64 w-12 text-white/15" />
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

      {/* header band tinted with the subject's own color */}
      <header
        className="bento-card relative mt-6 overflow-hidden p-6"
        style={{ background: `linear-gradient(135deg, ${color}2e, transparent 65%)` }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full blur-3xl"
          style={{ background: `${color}55` }}
        />
        <div className="relative flex items-center gap-4">
          <span
            aria-hidden
            className="grid size-16 shrink-0 place-items-center rounded-2xl text-3xl"
            style={{ background: `${color}33`, border: `1px solid ${color}66` }}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Subject</p>
            <h1 className="font-display truncate text-2xl md:text-3xl">{name}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="btn-pill border border-white/15 px-3 py-1 text-zinc-300">
                📄 {fileCount ?? "–"} files
              </span>
              <span className="btn-pill border border-white/15 px-3 py-1 text-zinc-300">
                🔗 {linkCount ?? "–"} links
              </span>
              <span
                className="btn-pill px-3 py-1 font-semibold text-black"
                style={{ background: color }}
              >
                {color}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="relative mt-4 grid gap-4 md:grid-cols-2">
        <FileManager subjectId={id} />
        <LinkList subjectId={id} />
      </div>
    </main>
  );
}
