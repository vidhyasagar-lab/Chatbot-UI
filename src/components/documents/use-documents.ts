"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type DocumentRecord, validateUpload } from "@/lib/documents";

export type UploadItem = {
  id: string;
  name: string;
  size: number;
  /** uploading: bytes in flight · indexing: backend chunking/embedding · error: failed */
  phase: "queued" | "uploading" | "indexing" | "error";
  progress: number;
  error?: string;
};

async function detailOf(status: number, body: string): Promise<string> {
  try {
    const d = JSON.parse(body)?.detail;
    if (typeof d === "string") return d;
  } catch {
    // not JSON
  }
  if (status === 413) return "The file is too large.";
  if (status === 429) return "Too many requests. Wait a minute, then try again.";
  if (status === 401) return "Your session has expired. Sign in again.";
  return "The document couldn't be processed. Try again.";
}

/** XHR rather than fetch: only XHR reports upload progress. */
function send(file: File, onProgress: (p: number) => void, onSent: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v1/documents/upload");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.upload.onload = onSent;
    xhr.onload = async () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(await detailOf(xhr.status, xhr.responseText))));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

/** The signed-in user's documents, or null if the request failed (keep the last known list). */
async function fetchDocuments(): Promise<DocumentRecord[] | null> {
  try {
    const res = await fetch("/api/v1/documents/history", { cache: "no-store" });
    return res.ok ? ((await res.json()) as { documents: DocumentRecord[] }).documents : null;
  } catch {
    return null;
  }
}

export function useDocuments() {
  const [docs, setDocs] = useState<DocumentRecord[] | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const refresh = useCallback(async () => {
    const list = await fetchDocuments();
    if (list) setDocs(list);
  }, []);

  useEffect(() => {
    let alive = true;
    fetchDocuments().then((list) => alive && list && setDocs(list));
    return () => {
      alive = false;
    };
  }, []);

  const patch = (id: string, change: Partial<UploadItem>) =>
    setUploads((list) => list.map((u) => (u.id === id ? { ...u, ...change } : u)));

  const add = useCallback(
    (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        const id = `${file.name}-${file.size}-${crypto.randomUUID()}`;
        const invalid = validateUpload(file.name, file.size);
        setUploads((list) => [
          ...list,
          { id, name: file.name, size: file.size, phase: invalid ? "error" : "queued", progress: 0, error: invalid ?? undefined },
        ]);
        if (invalid) continue;
        // One at a time: indexing runs vision calls, and the VM has a single core.
        queue.current = queue.current.then(async () => {
          patch(id, { phase: "uploading" });
          try {
            await send(
              file,
              (p) => patch(id, { progress: p }),
              () => patch(id, { phase: "indexing", progress: 1 }),
            );
            setUploads((list) => list.filter((u) => u.id !== id));
            await refresh();
          } catch (e) {
            patch(id, { phase: "error", error: (e as Error).message });
          }
        });
      }
    },
    [refresh],
  );

  const dismiss = useCallback((id: string) => setUploads((list) => list.filter((u) => u.id !== id)), []);

  const remove = useCallback(
    async (docId: string) => {
      setError(null);
      setDocs((list) => list?.filter((d) => d.doc_id !== docId) ?? null); // optimistic
      try {
        const res = await fetch(`/api/v1/documents/${encodeURIComponent(docId)}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
      } catch {
        setError("Couldn't delete that document. It's back in the list.");
        await refresh();
      }
    },
    [refresh],
  );

  return { docs, uploads, error, add, dismiss, remove, busy: uploads.some((u) => u.phase !== "error") };
}

export type DocumentsState = ReturnType<typeof useDocuments>;
