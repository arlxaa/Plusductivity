"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/ui/Card";

type Mode = "focus" | "short" | "long";
const SETTINGS_KEY = "plusductivity-pomo-settings";
const SESSIONS_KEY = "plusductivity-pomo-demo"; // demo fallback: array of {date,type,minutes}
export const DEMO_SESSIONS_KEY = SESSIONS_KEY;
const WORK_KEY = "plusductivity-working-on";
const demoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;

const DEFAULTS = { focusMin: 25, shortMin: 5, longMin: 15, rounds: 4 };

// Soft chime with WebAudio — no audio file needed.
function chime() {
  try {
    const Ctx = window.AudioContext;
    const ctx = new Ctx();
    [523, 659, 784].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
      o.stop(ctx.currentTime + i * 0.15 + 0.45);
    });
  } catch {
    /* audio not available */
  }
}

// Demo session log shared with the stats page.
// Shape: [{date: "YYYY-MM-DD", type: "focus"|..., minutes: n}].
// Reads the legacy {date: count} map too and converts it once.
export type DemoSession = { date: string; type: string; minutes: number };

export function readDemoSessions(): DemoSession[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? "[]");
    if (Array.isArray(raw)) return raw as DemoSession[];
    // legacy map → array (assume 25 min per counted focus session)
    const out: DemoSession[] = [];
    for (const [date, count] of Object.entries(raw as Record<string, number>)) {
      for (let i = 0; i < (count || 0); i++) out.push({ date, type: "focus", minutes: 25 });
    }
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(out));
    return out;
  } catch {
    return [];
  }
}

function logDemoSession(s: DemoSession) {
  try {
    const all = readDemoSessions();
    all.push(s);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function countDemoFocus(today: string) {
  return readDemoSessions().filter((s) => s.type === "focus" && s.date === today).length;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function PomodoroTimer() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [mode, setMode] = useState<Mode>("focus");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(DEFAULTS.focusMin * 60);
  const [round, setRound] = useState(1); // 1..rounds
  const [doneToday, setDoneToday] = useState(0);
  const [workingOn, setWorkingOn] = useState("");

  // endAt timestamp keeps the timer accurate in background tabs.
  const endAt = useRef(0);
  const remainingRef = useRef(remaining);
  remainingRef.current = remaining;
  const intervalRef = useRef<number | null>(null);

  const total =
    (mode === "focus" ? settings.focusMin : mode === "short" ? settings.shortMin : settings.longMin) * 60;
  const progress = total ? 1 - remaining / total : 0;

  // Load settings + working-on + today's count once.
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
      if (s) {
        setSettings({ ...DEFAULTS, ...s });
        setRemaining((s.focusMin ?? 25) * 60);
      }
      setWorkingOn(localStorage.getItem(WORK_KEY) ?? "");
    } catch {
      /* ignore */
    }
    async function loadCount() {
      const today = new Date().toISOString().slice(0, 10);
      if (demoMode) {
        try {
          setDoneToday(countDemoFocus(today));
        } catch {
          setDoneToday(0);
        }
        return;
      }
      const supabase = createClient();
      const { count } = await supabase
        .from("pomodoro_sessions")
        .select("*", { count: "exact", head: true })
        .eq("type", "focus")
        .eq("date", today);
      setDoneToday(count ?? 0);
    }
    loadCount();
  }, []);

  // Tab title always shows the time.
  useEffect(() => {
    document.title = running || remaining < total
      ? `${fmt(remaining)} • ${mode} — plusductivity`
      : "plusductivity";
  }, [remaining, running, mode, total]);

  // Persist settings + working on.
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);
  useEffect(() => {
    localStorage.setItem(WORK_KEY, workingOn);
  }, [workingOn]);

  async function saveSession(finishedMode: Mode) {
    const mins =
      finishedMode === "focus" ? settings.focusMin : finishedMode === "short" ? settings.shortMin : settings.longMin;
    if (finishedMode === "focus") {
      setDoneToday((c) => {
        if (demoMode) {
          logDemoSession({
            date: new Date().toISOString().slice(0, 10),
            type: "focus",
            minutes: mins,
          });
        }
        return c + 1;
      });
    } else if (demoMode) {
      logDemoSession({
        date: new Date().toISOString().slice(0, 10),
        type: finishedMode,
        minutes: mins,
      });
    }
    if (demoMode) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("pomodoro_sessions").insert({
      user_id: user.id,
      type: finishedMode,
      duration_min: mins,
    });
  }

  function tick() {
    const left = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
    setRemaining(left);
    if (left <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      complete();
    }
  }

  function start() {
    if (Notification.permission === "default") Notification.requestPermission();
    endAt.current = Date.now() + remainingRef.current * 1000;
    setRunning(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(tick, 250);
  }

  function pause() {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  // Clear on unmount.
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function complete() {
    pause();
    const finished = mode;
    chime();
    if (Notification.permission === "granted")
      new Notification(`${finished === "focus" ? "Focus done +" : "Break over"}`, {
        body: finished === "focus" ? "Take a breather." : "Back to it.",
      });
    await saveSession(finished);
    // Advance: after N focus rounds → long break, else short; break → focus.
    if (finished === "focus") {
      const isLong = round % settings.rounds === 0;
      setMode(isLong ? "long" : "short");
      setRemaining((isLong ? settings.longMin : settings.shortMin) * 60);
      if (isLong) setRound(1);
      else setRound((r) => r + 1);
    } else {
      setMode("focus");
      setRemaining(settings.focusMin * 60);
    }
  }

  function reset() {
    pause();
    setRemaining(total);
  }

  function skip() {
    pause(); // skip without saving
    if (mode === "focus") {
      const isLong = round % settings.rounds === 0;
      setMode(isLong ? "long" : "short");
      setRemaining((isLong ? settings.longMin : settings.shortMin) * 60);
    } else {
      setMode("focus");
      setRemaining(settings.focusMin * 60);
    }
  }

  function switchMode(m: Mode) {
    pause();
    setMode(m);
    setRemaining(
      (m === "focus" ? settings.focusMin : m === "short" ? settings.shortMin : settings.longMin) * 60
    );
  }

  // Ring: 120px circle, stroke offset = progress.
  const R = 52;
  const CIRC = 2 * Math.PI * R;
  const color = mode === "focus" ? "#F9A8D4" : mode === "short" ? "#B8F58B" : "#D8B4FE";

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-display">Pomodoro</h2>
        <span className="text-xs text-zinc-500">
          {doneToday} focus today · round {round}/{settings.rounds}
        </span>
      </div>

      <div className="mt-2 flex gap-2 text-xs">
        {(["focus", "short", "long"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`rounded-full px-3 py-1 ${mode === m ? "bg-white/15 text-white" : "text-zinc-500"}`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-5">
        <svg width="120" height="120" viewBox="0 0 120 120" aria-label={`${fmt(remaining)} left`}>
          <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="10" className="ring-track" />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progress)}
            transform="rotate(-90 60 60)"
          />
          <text x="60" y="68" textAnchor="middle" fill="white" fontSize="20" fontWeight="700" className="ring-text">
            {fmt(remaining)}
          </text>
        </svg>

        <div className="flex flex-1 flex-col gap-2">
          <label className="text-xs text-zinc-400">
            Working on:
            <input
              value={workingOn}
              onChange={(e) => setWorkingOn(e.target.value)}
              placeholder="e.g. Calculus ch. 3"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-accent-pink"
            />
          </label>
          <div className="flex gap-2">
            {!running ? (
              <button onClick={start} className="flex-1 rounded-full bg-accent-pink py-2 font-semibold text-black">
                Start
              </button>
            ) : (
              <button onClick={pause} className="flex-1 rounded-full bg-accent-pink py-2 font-semibold text-black">
                Pause
              </button>
            )}
            <button onClick={reset} aria-label="Reset timer" className="rounded-full border border-white/15 px-4">↺</button>
            <button onClick={skip} aria-label="Skip session" className="rounded-full border border-white/15 px-4">⏭</button>
          </div>
        </div>
      </div>

      <details className="mt-4 text-sm text-zinc-400">
        <summary className="cursor-pointer">Customize lengths</summary>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {(["focusMin", "shortMin", "longMin", "rounds"] as const).map((k) => (
            <label key={k} className="text-xs">
              {k}
              <input
                type="number"
                min={1}
                max={180}
                value={settings[k]}
                onChange={(e) => {
                  const v = Math.max(1, Number(e.target.value) || 1);
                  setSettings((s) => ({ ...s, [k]: v }));
                  if ((k === "focusMin" && mode === "focus") || (k === "shortMin" && mode === "short") || (k === "longMin" && mode === "long")) {
                    if (!running) setRemaining(v * 60);
                  }
                }}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-white"
              />
            </label>
          ))}
        </div>
      </details>
    </Card>
  );
}
