// Shared row shapes (match supabase/migrations/0001_init.sql).
export type Todo = {
  id: string;
  user_id?: string;
  subject_id: string | null;
  title: string;
  is_done: boolean;
  due_date: string | null; // YYYY-MM-DD
  priority: "low" | "normal" | "high";
  sort_order: number;
  completed_at?: string | null; // set when checked off (stats page)
  created_at?: string;
};

export type PomodoroSession = {
  id?: string;
  type: "focus" | "short" | "long";
  duration_min: number;
  completed_at?: string;
  date?: string;
};

export type Subject = {
  id: string;
  user_id?: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at?: string;
};

export type FileRow = {
  id: string;
  user_id?: string;
  subject_id: string | null;
  storage_path: string;
  filename: string;
  size_bytes: number | null;
  mime_type: string | null;
  created_at?: string;
};

export type LinkRow = {
  id: string;
  user_id?: string;
  subject_id: string | null;
  title: string;
  url: string;
  favicon_url: string | null;
  sort_order: number;
  created_at?: string;
};

export const SUBJECT_COLORS = ["#F9A8D4", "#B8F58B", "#FDF3A7", "#D8B4FE"];
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export function formatBytes(n: number | null | undefined) {
  if (!n && n !== 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// Favicon without a backend: Google's public favicon service.
export function faviconFor(url: string) {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
  } catch {
    return "🔗";
  }
}

export function normalizeUrl(raw: string) {
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}
