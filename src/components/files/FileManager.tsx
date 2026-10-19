"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MAX_FILE_BYTES, formatBytes, type FileRow, type Subject } from "@/lib/types";
import Card from "@/components/ui/Card";

const demoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL;
const demoKey = (subjectId: string) => `plusductivity-files-demo-${subjectId}`;

function iconFor(mime: string | null, name: string) {
  if (mime?.startsWith("image/")) return "🖼";
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "📄";
  return "📎";
}

// Files for one subject: drag-drop upload → Supabase Storage,
// preview (image/PDF), download, delete, move to another subject.
export default function FileManager({ subjectId }: { subjectId: string }) {
  const [files, setFiles] = useState<(FileRow & { url?: string })[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (demoMode) {
        try {
          setFiles(JSON.parse(localStorage.getItem(demoKey(subjectId)) ?? "[]"));
        } catch {
          setFiles([]);
        }
        setLoading(false);
        return;
      }
      const supabase = createClient();
      const [{ data: subs }, { data: rows }] = await Promise.all([
        supabase.from("subjects").select("id,name").order("sort_order"),
        supabase
          .from("files")
          .select("*")
          .eq("subject_id", subjectId)
          .order("created_at", { ascending: false }),
      ]);
      setSubjects((subs as Subject[]) ?? []);
      // Signed URLs since the bucket is private (1h expiry, enough for preview).
      const withUrls = await Promise.all(
        (((rows as FileRow[]) ?? []).map(async (f) => {
          const { data } = await supabase.storage
            .from("subject-files")
            .createSignedUrl(f.storage_path, 3600);
          return { ...f, url: data?.signedUrl };
        })),
      );
      setFiles(withUrls);
      setLoading(false);
    }
    load();
  }, [subjectId]);

  async function uploadList(list: FileList | File[]) {
    setError(null);
    const arr = Array.from(list);
    for (const file of arr) {
      if (file.size > MAX_FILE_BYTES) {
        setError(`"${file.name}" is too big (max 10 MB).`);
        continue;
      }
      const id = `temp-${Date.now()}-${file.name}`;
      setUploading((p) => [...p, file.name]);

      if (demoMode) {
        // Demo: keep it in memory with a blob URL so preview still works.
        const url = URL.createObjectURL(file);
        const row = {
          id,
          subject_id: subjectId,
          storage_path: id,
          filename: file.name,
          size_bytes: file.size,
          mime_type: file.type,
          created_at: new Date().toISOString(),
          url,
        } as FileRow & { url: string };
        setFiles((p) => {
          const next = [row, ...p];
          try {
            // Persist metadata only (bytes live for this session).
            localStorage.setItem(
              demoKey(subjectId),
              JSON.stringify(next.map(({ url: _u, ...m }) => m))
            );
          } catch {
            /* ignore */
          }
          return next;
        });
        setUploading((p) => p.filter((n) => n !== file.name));
        continue;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Log in to upload.");
        setUploading((p) => p.filter((n) => n !== file.name));
        continue;
      }
      const path = `${user.id}/${subjectId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("subject-files")
        .upload(path, file);
      if (upErr) {
        setError(upErr.message);
        setUploading((p) => p.filter((n) => n !== file.name));
        continue;
      }
      const { data: inserted } = await supabase
        .from("files")
        .insert({
          user_id: user.id,
          subject_id: subjectId,
          storage_path: path,
          filename: file.name,
          size_bytes: file.size,
          mime_type: file.type,
        })
        .select()
        .single();
      const { data: signed } = await supabase.storage
        .from("subject-files")
        .createSignedUrl(path, 3600);
      if (inserted)
        setFiles((p) => [{ ...(inserted as FileRow), url: signed?.signedUrl }, ...p]);
      setUploading((p) => p.filter((n) => n !== file.name));
    }
  }

  async function remove(f: FileRow) {
    setFiles((p) => p.filter((x) => x.id !== f.id));
    if (demoMode || f.id.startsWith("temp-")) return;
    const supabase = createClient();
    await supabase.storage.from("subject-files").remove([f.storage_path]);
    await supabase.from("files").delete().eq("id", f.id);
  }

  async function move(f: FileRow, toSubject: string) {
    if (!toSubject || toSubject === subjectId) return;
    setFiles((p) => p.filter((x) => x.id !== f.id)); // optimistic: disappears here
    if (demoMode || f.id.startsWith("temp-")) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const newPath = `${user?.id}/${toSubject}/${Date.now()}-${f.filename}`;
    await supabase.storage.from("subject-files").move(f.storage_path, newPath);
    await supabase
      .from("files")
      .update({ subject_id: toSubject, storage_path: newPath })
      .eq("id", f.id);
  }

  return (
    <Card>
      <h2 className="font-display">Files</h2>
      {/* Dropzone: drag files from your computer here, or click to browse. */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          uploadList(e.dataTransfer.files);
        }}
        className={`mt-3 rounded-2xl border-2 border-dashed p-6 text-center text-sm ${
          dragOver ? "border-accent-mint bg-white/5" : "border-white/15 text-zinc-400"
        }`}
      >
        Drop files here or{" "}
        <label className="cursor-pointer text-accent-pink hover:underline">
          browse
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && uploadList(e.target.files)}
          />
        </label>
        <p className="mt-1 text-xs">Max 10 MB each · images + PDFs preview inline</p>
      </div>

      {uploading.map((n) => (
        <p key={n} className="mt-2 animate-pulse text-sm text-zinc-400">
          Uploading {n}…
        </p>
      ))}
      {error && <p className="mt-2 text-sm text-accent-yellow">{error}</p>}

      {loading ? (
        <p className="mt-3 animate-pulse text-zinc-500">Loading files…</p>
      ) : files.length === 0 ? (
        <p className="mt-3 text-zinc-400">No files yet — drop your first one +</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {files.map((f) => (
            <li key={f.id} className="rounded-xl border border-white/8 bg-black/30 px-3 py-2">
              <div className="flex items-center gap-2">
                <span aria-hidden>{iconFor(f.mime_type, f.filename)}</span>
                <span className="flex-1 truncate text-sm" title={f.filename}>
                  {f.filename}
                </span>
                <span className="text-xs text-zinc-500">{formatBytes(f.size_bytes)}</span>
                {f.url && (f.mime_type?.startsWith("image/") || f.filename.endsWith(".pdf")) && (
                  <button
                    onClick={() => setPreviewId(previewId === f.id ? null : f.id)}
                    className="text-xs text-accent-mint hover:underline"
                  >
                    {previewId === f.id ? "Hide" : "Preview"}
                  </button>
                )}
                {f.url && (
                  <a href={f.url} download={f.filename} target="_blank" rel="noreferrer" className="text-xs text-zinc-400 hover:text-white">
                    Download
                  </a>
                )}
                <button onClick={() => remove(f)} aria-label={`Delete ${f.filename}`} className="text-zinc-500 hover:text-white">
                  ×
                </button>
              </div>
              {previewId === f.id && f.url && (
                <div className="mt-2">
                  {f.mime_type?.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.url} alt={f.filename} className="max-h-64 rounded-lg" />
                  ) : (
                    <iframe src={f.url} title={f.filename} className="h-64 w-full rounded-lg bg-white" />
                  )}
                </div>
              )}
              {!demoMode && subjects.length > 1 && (
                <label className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                  Move to:
                  <select
                    defaultValue=""
                    onChange={(e) => move(f, e.target.value)}
                    className="rounded bg-black/40 px-2 py-1 text-white"
                  >
                    <option value="">…</option>
                    {subjects.filter((s) => s.id !== subjectId).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
