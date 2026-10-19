"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Todo, Subject, FileRow, LinkRow } from "@/lib/types";

const demoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

type Item = {
  key: string;
  icon: string;
  label: string;
  hint?: string;
  run: () => void;
};

function readDemo<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

// Global quick search: Cmd/Ctrl+K from anywhere, results grouped by kind.
// Demo mode reads the same localStorage keys the widgets use.
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [groups, setGroups] = useState<{ title: string; items: Item[] }[]>([]);
  const [active, setActive] = useState(0);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setGroups([]);
    setActive(0);
  }, []);

  // Global shortcut.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // Search on every keystroke (debounced).
  useEffect(() => {
    const q = query.trim();
    if (!open || !q) {
      setGroups([]);
      setActive(0);
      return;
    }
    const id = setTimeout(async () => {
      setBusy(true);
      const items: { title: string; items: Item[] }[] = [];
      const needle = q.toLowerCase();

      if (demoMode) {
        const todos = readDemo<Todo>("plusductivity-todos-demo").filter((t) =>
          t.title.toLowerCase().includes(needle)
        );
        const subjects = readDemo<Subject>("plusductivity-subjects-demo").filter((s) =>
          s.name.toLowerCase().includes(needle)
        );
        const links = readDemo<LinkRow>("plusductivity-links-demo").filter((l) =>
          l.title.toLowerCase().includes(needle)
        );
        const files: (FileRow & { sid: string })[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) ?? "";
          if (k.startsWith("plusductivity-files-demo-")) {
            const sid = k.replace("plusductivity-files-demo-", "");
            readDemo<FileRow>(k)
              .filter((f) => f.filename.toLowerCase().includes(needle))
              .forEach((f) => files.push({ ...f, sid }));
          }
        }
        const subName = (sid: string | null) =>
          subjects.find((s) => s.id === sid)?.name ?? "Subject";
        if (todos.length)
          items.push({
            title: "Tasks",
            items: todos.slice(0, 5).map((t) => ({
              key: `t-${t.id}`,
              icon: t.is_done ? "✅" : "☐",
              label: t.title,
              run: () => {
                close();
                router.push("/dashboard");
              },
            })),
          });
        if (subjects.length)
          items.push({
            title: "Subjects",
            items: subjects.slice(0, 5).map((s) => ({
              key: `s-${s.id}`,
              icon: s.icon || "📁",
              label: s.name,
              run: () => {
                close();
                router.push(`/subject/${s.id}`);
              },
            })),
          });
        if (files.length)
          items.push({
            title: "Files",
            items: files.slice(0, 5).map((f) => ({
              key: `f-${f.id}`,
              icon: "📎",
              label: f.filename,
              hint: subName(f.sid),
              run: () => {
                close();
                router.push(`/subject/${f.sid}`);
              },
            })),
          });
        if (links.length)
          items.push({
            title: "Links",
            items: links.slice(0, 5).map((l) => ({
              key: `l-${l.id}`,
              icon: "🔗",
              label: l.title,
              hint: l.subject_id ? subName(l.subject_id) : "Quick links",
              run: () => {
                close();
                window.open(l.url, "_blank", "noreferrer");
              },
            })),
          });
      } else {
        const supabase = createClient();
        const like = `%${q}%`;
        const [t, s, f, l] = await Promise.all([
          supabase.from("todos").select("id,title,is_done").ilike("title", like).limit(5),
          supabase.from("subjects").select("id,name,icon").ilike("name", like).limit(5),
          supabase.from("files").select("id,filename,subject_id").ilike("filename", like).limit(5),
          supabase.from("links").select("id,title,url,subject_id").ilike("title", like).limit(5),
        ]);
        const { data: subs } = await supabase.from("subjects").select("id,name");
        const nameOf = (sid: string | null) =>
          (subs as { id: string; name: string }[] | null)?.find((x) => x.id === sid)?.name ?? "Subject";
        const todos = (t.data as Pick<Todo, "id" | "title" | "is_done">[] | null) ?? [];
        const subjects = (s.data as Pick<Subject, "id" | "name" | "icon">[] | null) ?? [];
        const files = (f.data as Pick<FileRow, "id" | "filename" | "subject_id">[] | null) ?? [];
        const links = (l.data as Pick<LinkRow, "id" | "title" | "url" | "subject_id">[] | null) ?? [];
        if (todos.length)
          items.push({
            title: "Tasks",
            items: todos.map((x) => ({
              key: `t-${x.id}`,
              icon: x.is_done ? "✅" : "☐",
              label: x.title,
              run: () => {
                close();
                router.push("/dashboard");
              },
            })),
          });
        if (subjects.length)
          items.push({
            title: "Subjects",
            items: subjects.map((x) => ({
              key: `s-${x.id}`,
              icon: x.icon || "📁",
              label: x.name,
              run: () => {
                close();
                router.push(`/subject/${x.id}`);
              },
            })),
          });
        if (files.length)
          items.push({
            title: "Files",
            items: files.map((x) => ({
              key: `f-${x.id}`,
              icon: "📎",
              label: x.filename,
              hint: x.subject_id ? nameOf(x.subject_id) : undefined,
              run: () => {
                close();
                router.push(x.subject_id ? `/subject/${x.subject_id}` : "/dashboard");
              },
            })),
          });
        if (links.length)
          items.push({
            title: "Links",
            items: links.map((x) => ({
              key: `l-${x.id}`,
              icon: "🔗",
              label: x.title,
              hint: x.subject_id ? nameOf(x.subject_id) : "Quick links",
              run: () => {
                close();
                window.open(x.url, "_blank", "noreferrer");
              },
            })),
          });
      }

      setGroups(items);
      setActive(0);
      setBusy(false);
    }, 200);
    return () => clearTimeout(id);
  }, [query, open, close, router]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && flat[active]) {
      flat[active].run();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search (Ctrl+K)"
        className="btn-pill hidden items-center gap-2 border border-white/15 px-4 py-2 text-sm text-zinc-400 hover:bg-white/10 sm:flex"
      >
        🔍 <kbd className="rounded bg-white/10 px-1.5 text-xs">⌘K</kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-start justify-items-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Quick search"
        >
          <div className="bento-card w-full max-w-lg p-3" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Search tasks, subjects, files, links…"
              aria-label="Search everything"
              className="w-full rounded-xl bg-transparent px-3 py-2 text-lg outline-none placeholder:text-zinc-500"
            />
            <div className="max-h-80 overflow-auto">
              {!query.trim() ? (
                <div className="px-3 py-4 text-sm text-zinc-500">
                  <p className="font-display text-zinc-300">Jump anywhere +</p>
                  <div className="mt-2 flex gap-2">
                    {[
                      ["Dashboard", "/dashboard"],
                      ["Focus", "/focus"],
                      ["Demo subject", "/subject/demo"],
                    ].map(([label, href]) => (
                      <button
                        key={href}
                        onClick={() => {
                          close();
                          router.push(href);
                        }}
                        className="rounded-full border border-white/15 px-3 py-1 text-xs hover:bg-white/10"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : busy ? (
                <p className="animate-pulse px-3 py-4 text-sm text-zinc-500">Searching…</p>
              ) : flat.length === 0 ? (
                <p className="px-3 py-4 text-sm text-zinc-400">
                  No results for “{query.trim()}” — try another keyword +
                </p>
              ) : (
                groups.map((g) => (
                  <div key={g.title} className="mt-1">
                    <p className="px-3 pt-2 text-[11px] uppercase tracking-widest text-zinc-500">
                      {g.title}
                    </p>
                    {g.items.map((item) => {
                      const idx = flat.indexOf(item);
                      return (
                        <button
                          key={item.key}
                          onClick={item.run}
                          onMouseEnter={() => setActive(idx)}
                          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${
                            idx === active ? "bg-accent-pink/20" : ""
                          }`}
                        >
                          <span aria-hidden>{item.icon}</span>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.hint && <span className="text-xs text-zinc-500">{item.hint}</span>}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            <p className="border-t border-white/10 px-3 pt-2 text-[11px] text-zinc-500">
              ↑↓ navigate · Enter open · Esc close
            </p>
          </div>
        </div>
      )}
    </>
  );
}
