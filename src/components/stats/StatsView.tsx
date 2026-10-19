"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { readDemoSessions } from "@/components/pomodoro/PomodoroTimer";
import type { Todo } from "@/lib/types";
import Card from "@/components/ui/Card";

const demoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;
const DEMO_TODOS = "plusductivity-todos-demo";

type Day = { date: string; dow: string; num: string; focusMin: number; sessions: number; tasks: number };

function last7(): { date: string; dow: string; num: string }[] {
  const out: { date: string; dow: string; num: string }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    out.push({
      date: iso,
      dow: "SMTWTFS"[d.getDay()],
      num: String(d.getDate()),
    });
  }
  return out;
}

// Weekly stats: focus minutes + sessions per day, day streak,
// tasks completed per day. Demo mode reads the same localStorage keys.
export default function StatsView() {
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const base = last7();
      const byDate: Record<string, Day> = Object.fromEntries(
        base.map((d) => [d.date, { ...d, focusMin: 0, sessions: 0, tasks: 0 }])
      );

      if (demoMode) {
        for (const s of readDemoSessions()) {
          const d = byDate[s.date];
          if (!d) continue;
          if (s.type === "focus") {
            d.focusMin += s.minutes;
            d.sessions += 1;
          }
        }
        try {
          const todos = JSON.parse(localStorage.getItem(DEMO_TODOS) ?? "[]") as Todo[];
          for (const t of todos) {
            const day = (t.completed_at ?? "").slice(0, 10);
            if (day && byDate[day]) byDate[day].tasks += 1;
          }
        } catch {
          /* ignore */
        }
      } else {
        const supabase = createClient();
        const since = base[0].date;
        const [{ data: sessions }, { data: todos }] = await Promise.all([
          supabase.from("pomodoro_sessions").select("type,duration_min,date").gte("date", since),
          supabase.from("todos").select("completed_at").not("completed_at", "is", null),
        ]);
        for (const s of ((sessions as { type: string; duration_min: number; date: string }[] | null) ?? [])) {
          const d = byDate[s.date];
          if (d && s.type === "focus") {
            d.focusMin += s.duration_min;
            d.sessions += 1;
          }
        }
        for (const t of ((todos as { completed_at: string }[] | null) ?? [])) {
          const day = t.completed_at.slice(0, 10);
          if (byDate[day]) byDate[day].tasks += 1;
        }
      }

      setDays(base.map((d) => byDate[d.date]));
      setLoading(false);
    }
    load();
  }, []);

  const totals = useMemo(() => {
    const focusMin = days.reduce((a, d) => a + d.focusMin, 0);
    const sessions = days.reduce((a, d) => a + d.sessions, 0);
    const tasks = days.reduce((a, d) => a + d.tasks, 0);
    // Streak: consecutive days with ≥1 focus session, ending today/yesterday.
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].sessions > 0) streak++;
      else if (i === days.length - 1) continue; // today may still be empty
      else break;
    }
    const best = days.reduce((a, d) => (d.focusMin > a.focusMin ? d : a), days[0] ?? { date: "", focusMin: 0 } as Day);
    return { focusMin, sessions, tasks, streak, best };
  }, [days]);

  const maxFocus = Math.max(1, ...days.map((d) => d.focusMin));
  const maxTasks = Math.max(1, ...days.map((d) => d.tasks));
  const hours = Math.floor(totals.focusMin / 60);
  const mins = totals.focusMin % 60;

  if (loading) {
    return (
      <Card>
        <p className="animate-pulse text-zinc-500">Crunching your numbers…</p>
      </Card>
    );
  }

  if (totals.sessions === 0 && totals.tasks === 0) {
    return (
      <Card>
        <p className="font-display text-xl">No data yet +</p>
        <p className="mt-2 text-sm text-zinc-400">
          Finish a pomodoro or check off a task and your week will paint itself here.
        </p>
        <Link href="/dashboard" className="btn-pill mt-4 inline-block bg-accent-pink px-5 py-2 text-sm font-semibold text-black">
          Back to dashboard
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["⏱", hours > 0 ? `${hours}h ${mins}m` : `${mins}m`, "focus this week"],
          ["▶", String(totals.sessions), "sessions"],
          ["🔥", String(totals.streak), "day streak"],
          ["✔", String(totals.tasks), "tasks done"],
        ].map(([icon, value, label]) => (
          <Card key={label} className="text-center">
            <span className="text-2xl" aria-hidden>{icon}</span>
            <p className="font-display mt-1 text-2xl">{value}</p>
            <p className="text-xs text-zinc-500">{label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-baseline justify-between">
          <h2 className="font-display">Focus minutes</h2>
          <p className="text-xs text-zinc-500">
            Best day: {totals.best.date ? `${totals.best.focusMin} min` : "—"}
          </p>
        </div>
        <div className="mt-4 flex h-36 items-end gap-2" role="img" aria-label={`Focus minutes per day, total ${totals.focusMin}`}>
          {days.map((d, i) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[11px] text-zinc-500">{d.focusMin > 0 ? d.focusMin : ""}</span>
              <div
                title={`${d.date}: ${d.focusMin} min`}
                className={`w-full rounded-t-lg ${i === days.length - 1 ? "bg-accent-pink" : "bg-accent-mint/50"}`}
                style={{ height: `${Math.max(4, (d.focusMin / maxFocus) * 100)}%` }}
              />
              <span className={`text-[11px] ${i === days.length - 1 ? "font-bold text-accent-pink" : "text-zinc-500"}`}>
                {i === days.length - 1 ? "Today" : d.dow}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-display">Tasks completed</h2>
        <div className="mt-4 flex h-24 items-end gap-2" role="img" aria-label={`Tasks completed per day, total ${totals.tasks}`}>
          {days.map((d, i) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                title={`${d.date}: ${d.tasks} tasks`}
                className={`w-full rounded-t-lg ${i === days.length - 1 ? "bg-accent-lavender" : "bg-accent-lavender/40"}`}
                style={{ height: `${Math.max(6, (d.tasks / maxTasks) * 100)}%` }}
              />
              <span className="text-[11px] text-zinc-500">{d.num}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
