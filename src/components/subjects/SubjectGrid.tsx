"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { SUBJECT_COLORS, type Subject } from "@/lib/types";
import Card from "@/components/ui/Card";

const DEMO_KEY = "plusductivity-subjects-demo";
const demoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

function SubjectRow({
  subject,
  onRename,
  onRecolor,
  onDelete,
}: {
  subject: Subject;
  onRename: (name: string) => void;
  onRecolor: (color: string) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: subject.id });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(subject.name);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/30 px-3 py-2"
    >
      <button {...attributes} {...listeners} aria-label="Drag to reorder" className="cursor-grab text-zinc-500">
        ⠿
      </button>
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-lg text-lg"
        style={{ background: `${subject.color}33` }}
      >
        {subject.icon}
      </span>
      <span className="size-3 shrink-0 rounded-full" style={{ background: subject.color }} />
      {editing ? (
        <form
          className="flex flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onRename(draft.trim() || subject.name);
            setEditing(false);
          }}
        >
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              onRename(draft.trim() || subject.name);
              setEditing(false);
            }}
            aria-label="Subject name"
            className="w-full rounded bg-black/40 px-2 py-1 outline-none"
          />
        </form>
      ) : (
        <Link href={`/subject/${subject.id}`} className="flex-1 font-medium hover:underline">
          {subject.name}
        </Link>
      )}
      <div className="flex gap-1" aria-label="Recolor subject">
        {SUBJECT_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onRecolor(c)}
            aria-label={`Color ${c}`}
            className="size-4 rounded-full border border-white/20"
            style={{ background: c, outline: subject.color === c ? "2px solid white" : "none" }}
          />
        ))}
      </div>
      <button onClick={() => setEditing((v) => !v)} aria-label="Rename subject" className="text-zinc-500 hover:text-white">
        ✎
      </button>
      <button onClick={onDelete} aria-label={`Delete ${subject.name}`} className="text-zinc-500 hover:text-white">
        ×
      </button>
    </li>
  );
}

export default function SubjectGrid() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    async function load() {
      if (demoMode) {
        try {
          const raw = localStorage.getItem(DEMO_KEY);
          if (raw) {
            setSubjects(JSON.parse(raw));
          } else {
            // Seed two cute demo subjects so the UI isn't empty.
            setSubjects([
              { id: "demo-calc", name: "Calculus", color: "#F9A8D4", icon: "📐", sort_order: 0, subject_id: null } as unknown as Subject,
              { id: "demo-algo", name: "Algorithms", color: "#B8F58B", icon: "💻", sort_order: 1, subject_id: null } as unknown as Subject,
            ]);
          }
        } catch {
          setSubjects([]);
        }
        setLoading(false);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase.from("subjects").select("*").order("sort_order");
      setSubjects((data as Subject[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (demoMode && !loading) localStorage.setItem(DEMO_KEY, JSON.stringify(subjects));
  }, [subjects, loading]);

  async function add() {
    const clean = name.trim();
    if (!clean) return;
    setName("");
    const temp: Subject = {
      id: `temp-${Date.now()}`,
      name: clean,
      color: SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length],
      icon: "📁",
      sort_order: subjects.length,
      subject_id: null,
    } as unknown as Subject;
    setSubjects((p) => [...p, temp]);
    if (demoMode) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("subjects")
      .insert({ user_id: user?.id, name: clean, color: temp.color, sort_order: subjects.length })
      .select()
      .single();
    if (data) setSubjects((p) => p.map((s) => (s.id === temp.id ? (data as Subject) : s)));
  }

  async function rename(id: string, newName: string) {
    setSubjects((p) => p.map((s) => (s.id === id ? { ...s, name: newName } : s)));
    if (demoMode || id.startsWith("temp-")) return;
    const supabase = createClient();
    await supabase.from("subjects").update({ name: newName }).eq("id", id);
  }

  async function recolor(id: string, color: string) {
    setSubjects((p) => p.map((s) => (s.id === id ? { ...s, color } : s)));
    if (demoMode || id.startsWith("temp-")) return;
    const supabase = createClient();
    await supabase.from("subjects").update({ color }).eq("id", id);
  }

  async function remove(id: string) {
    if (!confirm("Delete this subject and its files/links?")) return;
    setSubjects((p) => p.filter((s) => s.id !== id));
    if (demoMode || id.startsWith("temp-")) return;
    const supabase = createClient();
    // Best effort: delete stored bytes under this subject, then the row
    // (DB cascade removes file/link rows pointing at it).
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: objs } = await supabase.storage
        .from("subject-files")
        .list(`${user.id}/${id}`);
      if (objs?.length) {
        await supabase.storage
          .from("subject-files")
          .remove(objs.map((o) => `${user.id}/${id}/${o.name}`));
      }
    }
    await supabase.from("subjects").delete().eq("id", id);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = subjects.findIndex((s) => s.id === active.id);
    const newIdx = subjects.findIndex((s) => s.id === over.id);
    const order = arrayMove(subjects, oldIdx, newIdx).map((s, i) => ({ ...s, sort_order: i }));
    setSubjects(order);
    if (demoMode) return;
    const supabase = createClient();
    order.forEach((s) => {
      if (!s.id.startsWith("temp-"))
        supabase.from("subjects").update({ sort_order: s.sort_order }).eq("id", s.id).then();
    });
  }

  return (
    <Card>
      <h2 className="font-display">Subjects</h2>
      {loading ? (
        <p className="mt-3 animate-pulse text-zinc-500">Loading subjects…</p>
      ) : (
        <>
          {subjects.length === 0 ? (
            <p className="mt-3 text-zinc-400">No subjects yet — add your first +</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={subjects.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <ul className="mt-3 flex flex-col gap-2">
                  {subjects.map((s) => (
                    <SubjectRow
                      key={s.id}
                      subject={s}
                      onRename={(v) => rename(s.id, v)}
                      onRecolor={(c) => recolor(s.id, c)}
                      onDelete={() => remove(s.id)}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New subject +"
              aria-label="New subject"
              className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-accent-pink"
            />
            <button type="submit" aria-label="Add subject" className="grid size-9 place-items-center rounded-full bg-accent-pink text-xl font-bold text-black">
              +
            </button>
          </form>
        </>
      )}
    </Card>
  );
}
