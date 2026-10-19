"use client";

import { useEffect, useMemo, useState } from "react";
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
import type { Todo } from "@/lib/types";
import Card from "@/components/ui/Card";

type Filter = "all" | "today" | "done";
const DEMO_KEY = "plusductivity-todos-demo";
const demoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// One draggable row. dnd-kit gives us drag handle props.
function Row({
  todo,
  onToggle,
  onDelete,
  onEdit,
}: {
  todo: Todo;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (title: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: todo.id });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/30 px-3 py-2"
    >
      {/* drag handle */}
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="cursor-grab text-zinc-500"
      >
        ⠿
      </button>
      <input
        type="checkbox"
        checked={todo.is_done}
        onChange={onToggle}
        aria-label={`Mark ${todo.title} done`}
        className="size-4 accent-[#B8F58B] transition-transform checked:scale-125"
      />
      {editing ? (
        <form
          className="flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            onEdit(draft);
            setEditing(false);
          }}
        >
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              onEdit(draft);
              setEditing(false);
            }}
            className="w-full rounded bg-black/40 px-2 py-1 outline-none"
          />
        </form>
      ) : (
        <button
          onDoubleClick={() => setEditing(true)}
          onClick={() => setEditing(true)}
          title="Click to edit"
          className={`flex-1 text-left ${todo.is_done ? "text-zinc-500 line-through" : ""}`}
        >
          {todo.title}
          {todo.due_date && (
            <span className="ml-2 text-xs text-zinc-500">{todo.due_date}</span>
          )}
          {todo.priority !== "normal" && (
            <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">
              {todo.priority}
            </span>
          )}
        </button>
      )}
      <button onClick={onDelete} aria-label={`Delete ${todo.title}`} className="text-zinc-500 hover:text-white">
        ×
      </button>
    </li>
  );
}

export default function TodoList({ compact = false }: { compact?: boolean }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [title, setTitle] = useState("");
  const sensors = useSensors(useSensor(PointerSensor));

  // Load: Supabase if configured, else localStorage demo.
  useEffect(() => {
    async function load() {
      if (demoMode) {
        try {
          setTodos(JSON.parse(localStorage.getItem(DEMO_KEY) ?? "[]"));
        } catch {
          setTodos([]);
        }
        setLoading(false);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from("todos")
        .select("*")
        .order("sort_order")
        .order("created_at");
      setTodos((data as Todo[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  // Persist demo to localStorage.
  useEffect(() => {
    if (demoMode && !loading) localStorage.setItem(DEMO_KEY, JSON.stringify(todos));
  }, [todos, loading]);

  async function persist(order: Todo[]) {
    if (demoMode) return;
    const supabase = createClient();
    // Save new order (one update per row, fine for student scale).
    await Promise.all(
      order.map((t, i) =>
        supabase.from("todos").update({ sort_order: i }).eq("id", t.id)
      )
    );
  }

  async function add() {
    const name = title.trim();
    if (!name) return;
    setTitle("");
    const temp: Todo = {
      id: `temp-${Date.now()}`,
      subject_id: null,
      title: name,
      is_done: false,
      due_date: null,
      priority: "normal",
      sort_order: todos.length,
    };
    setTodos((p) => [...p, temp]); // optimistic
    if (demoMode) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("todos")
      .insert({
        user_id: user?.id,
        title: name,
        sort_order: todos.length,
      })
      .select()
      .single();
    if (!error && data) setTodos((p) => p.map((t) => (t.id === temp.id ? (data as Todo) : t)));
  }

  async function toggle(id: string) {
    const cur = todos.find((t) => t.id === id);
    const nowDone = !cur?.is_done;
    // completed_at powers the stats page ("tasks done per day").
    const stamp = nowDone ? new Date().toISOString() : null;
    setTodos((p) => p.map((t) => (t.id === id ? { ...t, is_done: nowDone, completed_at: stamp } : t)));
    if (demoMode || id.startsWith("temp-")) return;
    const supabase = createClient();
    await supabase.from("todos").update({ is_done: nowDone, completed_at: stamp }).eq("id", id);
  }

  async function remove(id: string) {
    setTodos((p) => p.filter((t) => t.id !== id));
    if (demoMode || id.startsWith("temp-")) return;
    const supabase = createClient();
    await supabase.from("todos").delete().eq("id", id);
  }

  async function edit(id: string, newTitle: string) {
    const clean = newTitle.trim() || todos.find((t) => t.id === id)?.title!;
    setTodos((p) => p.map((t) => (t.id === id ? { ...t, title: clean } : t)));
    if (demoMode || id.startsWith("temp-")) return;
    const supabase = createClient();
    await supabase.from("todos").update({ title: clean }).eq("id", id);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = todos.findIndex((t) => t.id === active.id);
    const newIdx = todos.findIndex((t) => t.id === over.id);
    const order = arrayMove(todos, oldIdx, newIdx).map((t, i) => ({
      ...t,
      sort_order: i,
    }));
    setTodos(order);
    persist(order);
  }

  const shown = useMemo(() => {
    if (filter === "done") return todos.filter((t) => t.is_done);
    if (filter === "today")
      return todos.filter((t) => !t.is_done && (!t.due_date || t.due_date <= todayStr()));
    return todos;
  }, [todos, filter]);

  return (
    <Card>
      <h2 className="font-display">To-do</h2>
      {loading ? (
        <p className="mt-3 animate-pulse text-zinc-500">Loading tasks…</p>
      ) : (
        <>
          {!compact && (
            <div className="mt-3 flex gap-2 text-xs" role="tablist" aria-label="Filter tasks">
              {(["all", "today", "done"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 ${filter === f ? "bg-accent-mint text-black" : "border border-white/15 text-zinc-400"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
          {shown.length === 0 ? (
            <p className="mt-4 text-zinc-400">No tasks yet, add your first +</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={shown.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <ul className="mt-3 flex flex-col gap-2">
                  {shown.map((t) => (
                    <Row
                      key={t.id}
                      todo={t}
                      onToggle={() => toggle(t.id)}
                      onDelete={() => remove(t.id)}
                      onEdit={(v) => edit(t.id, v)}
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
              placeholder="New task +"
              aria-label="New task"
              className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-accent-pink"
            />
            <button
              type="submit"
              aria-label="Add task"
              className="grid size-9 place-items-center rounded-full bg-accent-pink text-xl font-bold text-black"
            >
              +
            </button>
          </form>
        </>
      )}
    </Card>
  );
}
