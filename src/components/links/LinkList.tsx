"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import { faviconFor, normalizeUrl, type LinkRow, type Subject } from "@/lib/types";
import Card from "@/components/ui/Card";

const DEMO_KEY = "plusductivity-links-demo";
const demoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

function LinkItem({
  link,
  subjectName,
  onDelete,
  onEdit,
}: {
  link: LinkRow;
  subjectName?: string;
  onDelete: () => void;
  onEdit: (title: string, url: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: link.id });
  const [editing, setEditing] = useState(false);
  const [t, setT] = useState(link.title);
  const [u, setU] = useState(link.url);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/30 px-3 py-2"
    >
      <button {...attributes} {...listeners} aria-label="Drag to reorder" className="cursor-grab text-zinc-500">
        ⠿
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={faviconFor(link.url)} alt="" width={16} height={16} className="rounded" />
      {editing ? (
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onEdit(t.trim() || link.title, normalizeUrl(u));
            setEditing(false);
          }}
        >
          <input value={t} onChange={(e) => setT(e.target.value)} aria-label="Link title" className="w-1/3 rounded bg-black/40 px-2 py-1 text-sm outline-none" />
          <input value={u} onChange={(e) => setU(e.target.value)} aria-label="Link URL" className="flex-1 rounded bg-black/40 px-2 py-1 text-sm outline-none" />
          <button type="submit" className="text-sm text-accent-mint">Save</button>
        </form>
      ) : (
        <a href={link.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-sm hover:underline">
          {link.title}
          {subjectName && <span className="ml-2 text-xs text-zinc-500">{subjectName}</span>}
        </a>
      )}
      <button onClick={() => setEditing((v) => !v)} aria-label="Edit link" className="text-zinc-500 hover:text-white">✎</button>
      <button onClick={onDelete} aria-label="Delete link" className="text-zinc-500 hover:text-white">×</button>
    </li>
  );
}

// Global quick-links (dashboard, subjectId undefined) or per-subject (subject page).
export default function LinkList({ subjectId }: { subjectId?: string }) {
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    async function load() {
      if (demoMode) {
        try {
          const all: LinkRow[] = JSON.parse(localStorage.getItem(DEMO_KEY) ?? "[]");
          setLinks(subjectId ? all.filter((l) => l.subject_id === subjectId) : all);
        } catch {
          setLinks([]);
        }
        setLoading(false);
        return;
      }
      const supabase = createClient();
      let q = supabase.from("links").select("*").order("sort_order");
      if (subjectId) q = q.eq("subject_id", subjectId);
      const [{ data }, { data: subs }] = await Promise.all([
        q,
        supabase.from("subjects").select("id,name").order("sort_order"),
      ]);
      setLinks((data as LinkRow[]) ?? []);
      setSubjects((subs as Subject[]) ?? []);
      setLoading(false);
    }
    load();
  }, [subjectId]);

  // Demo persistence keeps the full list; this view shows a slice.
  async function saveDemo(next: LinkRow[]) {
    try {
      const all: LinkRow[] = JSON.parse(localStorage.getItem(DEMO_KEY) ?? "[]");
      const others = subjectId ? all.filter((l) => l.subject_id !== subjectId) : [];
      const merged = subjectId ? [...others, ...next] : next;
      localStorage.setItem(DEMO_KEY, JSON.stringify(merged));
    } catch {
      /* ignore */
    }
  }

  async function add() {
    const cleanTitle = title.trim();
    const cleanUrl = url.trim();
    if (!cleanTitle || !cleanUrl) return;
    const full = normalizeUrl(cleanUrl);
    setTitle("");
    setUrl("");
    const temp: LinkRow = {
      id: `temp-${Date.now()}`,
      subject_id: subjectId ?? null,
      title: cleanTitle,
      url: full,
      favicon_url: faviconFor(full),
      sort_order: links.length,
    };
    const next = [...links, temp];
    setLinks(next);
    if (demoMode) {
      saveDemo(next);
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("links")
      .insert({ user_id: user?.id, subject_id: subjectId ?? null, title: cleanTitle, url: full, sort_order: links.length })
      .select()
      .single();
    if (data) setLinks((p) => p.map((l) => (l.id === temp.id ? (data as LinkRow) : l)));
  }

  async function remove(id: string) {
    setLinks((p) => {
      const next = p.filter((l) => l.id !== id);
      if (demoMode) saveDemo(next);
      return next;
    });
    if (demoMode || id.startsWith("temp-")) return;
    const supabase = createClient();
    await supabase.from("links").delete().eq("id", id);
  }

  async function edit(id: string, newTitle: string, newUrl: string) {
    setLinks((p) => {
      const next = p.map((l) => (l.id === id ? { ...l, title: newTitle, url: newUrl } : l));
      if (demoMode) saveDemo(next);
      return next;
    });
    if (demoMode || id.startsWith("temp-")) return;
    const supabase = createClient();
    await supabase.from("links").update({ title: newTitle, url: newUrl }).eq("id", id);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = links.findIndex((l) => l.id === active.id);
    const newIdx = links.findIndex((l) => l.id === over.id);
    const order = arrayMove(links, oldIdx, newIdx).map((l, i) => ({ ...l, sort_order: i }));
    setLinks(order);
    if (demoMode) {
      saveDemo(order);
      return;
    }
    const supabase = createClient();
    order.forEach((l) => {
      if (!l.id.startsWith("temp-"))
        supabase.from("links").update({ sort_order: l.sort_order }).eq("id", l.id).then();
    });
  }

  const nameOf = (id: string | null) => subjects.find((s) => s.id === id)?.name;

  return (
    <Card>
      <h2 className="font-display">{subjectId ? "Subject links" : "Quick links"}</h2>
      {loading ? (
        <p className="mt-3 animate-pulse text-zinc-500">Loading links…</p>
      ) : (
        <>
          {links.length === 0 ? (
            <p className="mt-3 text-zinc-400">No links yet — save your first +</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                <ul className="mt-3 flex flex-col gap-2">
                  {links.map((l) => (
                    <LinkItem
                      key={l.id}
                      link={l}
                      subjectName={!subjectId && l.subject_id ? nameOf(l.subject_id) : undefined}
                      onDelete={() => remove(l.id)}
                      onEdit={(t, u) => edit(l.id, t, u)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
            className="mt-3 flex gap-2"
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              aria-label="Link title"
              className="w-1/3 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-accent-pink"
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              aria-label="Link URL"
              className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-accent-pink"
            />
            <button type="submit" aria-label="Add link" className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-pink text-xl font-bold text-black">
              +
            </button>
          </form>
        </>
      )}
    </Card>
  );
}
