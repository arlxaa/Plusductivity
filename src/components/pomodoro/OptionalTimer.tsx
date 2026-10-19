"use client";

import { useState } from "react";
import PomodoroTimer from "@/components/pomodoro/PomodoroTimer";

const KEY = "plusductivity-show-timer";

// The timer is optional: some students work better without it.
// This wrapper lets them hide it on the dashboard / focus page.
export default function OptionalTimer() {
  const [show, setShow] = useState(() => {
    try {
      return localStorage.getItem(KEY) !== "off";
    } catch {
      return true;
    }
  });

  function toggle() {
    setShow((s) => {
      try {
        localStorage.setItem(KEY, s ? "off" : "on");
      } catch {
        /* ignore */
      }
      return !s;
    });
  }

  if (!show) {
    return (
      <div className="bento-card p-5 text-sm text-zinc-400">
        Timer hidden — no pressure.{" "}
        <button onClick={toggle} className="text-accent-mint hover:underline">
          Show timer +
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 text-right">
        <button onClick={toggle} className="text-xs text-zinc-500 hover:text-white">
          Hide timer (it&apos;s optional)
        </button>
      </div>
      <PomodoroTimer />
    </div>
  );
}
