/**
 * Upload rules mirrored from the backend (RAG Chatbot app/core/document_loader.py
 * and app/api/routes/documents.py) so a bad file is rejected before a long upload.
 * The backend still enforces them; this only saves the round trip.
 */

export const SUPPORTED_EXTENSIONS = [
  ".pdf", ".docx", ".doc", ".txt", ".md",
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".tiff", ".tif",
] as const;

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export type DocumentRecord = {
  doc_id: string;
  filename: string;
  file_size: number;
  chunks_added: number;
  images_extracted: number;
  status: string;
  uploaded_at: string;
};

/** Human-readable reason the file can't be uploaded, or null if it can. */
export function validateUpload(name: string, size: number): string | null {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return `“${name}”: add a file extension such as .pdf or .txt.`;
  const ext = name.slice(dot).toLowerCase();
  if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)) return `“${name}”: ${ext} files aren't supported.`;
  if (size === 0) return `“${name}” is empty.`;
  if (size > MAX_UPLOAD_BYTES) return `“${name}” is larger than 50 MB.`;
  return null;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`;
}
