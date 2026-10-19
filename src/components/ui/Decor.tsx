// Playful floating shapes from the Cryptoflow reference, as tiny SVGs:
// 4-point sparkles, starburst, asterisk, dots, sketchy lines.
// Decorative only — always render with aria-hidden (parents handle that).

export function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 0c.9 6.5 4.6 10.2 11.1 11.1-6.5.9-10.2 4.6-11.1 11.1C11.1 15.7 7.4 12 0.9 11.1 7.4 10.2 11.1 6.5 12 0Z" />
    </svg>
  );
}

export function Starburst({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="currentColor" className={className} aria-hidden>
      <path d="M24 0l3.5 10.2 7.5-7.5 1.2 10.7 10.7 1.2-7.5 7.5L49.6 25l-10.2 3.5 7.5 7.5-10.7 1.2-1.2 10.7-7.5-7.5L24 50.6l-3.5-10.2-7.5 7.5-1.2-10.7-10.7-1.2 7.5-7.5L-2.6 25l10.2-3.5-7.5-7.5 10.7-1.2 1.2-10.7 7.5 7.5L24 0Z" transform="translate(0.5 -1.3) scale(0.96)" />
    </svg>
  );
}

export function Asterisk({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" className={className} aria-hidden>
      <path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1" />
    </svg>
  );
}

export function SketchLines({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 60" fill="none" stroke="currentColor" strokeWidth={1.4} className={className} aria-hidden>
      <path d="M4 8c22-6 48-8 72-4s30 4 40 2M4 22c26-8 60-10 112-4M4 36c20-6 52-9 84-6s26 3 28 3M10 50c30-8 66-9 100-5" strokeLinecap="round" />
    </svg>
  );
}

export function Dots({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 20" fill="currentColor" className={className} aria-hidden>
      <circle cx={5} cy={10} r={2.4} />
      <circle cx={20} cy={10} r={2.4} />
      <circle cx={35} cy={10} r={2.4} />
      <circle cx={50} cy={10} r={2.4} />
    </svg>
  );
}

// Tiny sparkline for mini stat cards (tasks, streaks).
export function Sparkline({ className = "", stroke = "#B8F58B" }: { className?: string; stroke?: string }) {
  return (
    <svg viewBox="0 0 100 32" fill="none" className={className} aria-hidden>
      <path d="M2 26c12-2 16-14 26-14s12 10 22 8 12-12 22-12 14 6 26 4" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  );
}
