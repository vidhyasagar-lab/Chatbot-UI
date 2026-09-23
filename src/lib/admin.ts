/**
 * Shapes returned by the backend's /admin routes (RAG Chatbot app/api/routes/admin.py)
 * and the formatting the admin screens share.
 */

/** GET /admin/stats: system stats merged with vector-store stats. */
export type AdminStats = {
  total_users: number;
  total_docs: number;
  total_size_bytes: number;
  total_chunks: number;
  total_images: number;
  total_documents: number; // vectors in the index
  collection_name: string;
  bm25_indexed: number;
  parent_chunks_cached: number;
  images_indexed: number;
};

export type AdminUser = {
  user_id: string;
  username: string;
  role: "user" | "admin";
  created_at: string;
  doc_count: number;
  total_chunks: number;
};

export type GoldenSample = {
  id: string;
  question: string;
  ground_truth: string;
  source_doc: string;
  source: string; // "manual" | "synthetic" | ...
  created_at: string;
};

export type EvalRun = {
  id: string;
  run_type: string;
  status: "running" | "completed" | "failed" | string;
  total_samples: number;
  completed: number;
  avg_faithfulness: number | null;
  avg_relevancy: number | null;
  avg_context_precision: number | null;
  avg_context_recall: number | null;
  created_at: string;
  completed_at: string | null;
};

export type EvalResult = {
  id: string;
  run_id: string;
  golden_id: string | null;
  question: string;
  answer: string;
  contexts: string[];
  ground_truth: string;
  faithfulness: number | null;
  answer_relevancy: number | null;
  context_precision: number | null;
  context_recall: number | null;
  created_at: string;
};

export type LangfuseTrace = {
  id: string;
  name: string;
  user_id: string;
  session_id: string;
  input: string;
  output: string;
  tags: string[];
  created_at: string;
  total_cost: number;
  latency: number; // seconds
  usage: { input: number; output: number; total: number };
};

export type LangfuseTraces = { traces: LangfuseTrace[]; total: number; message?: string; error?: string };

export type LangfuseSummary =
  | { enabled: false }
  | { enabled: true; trace_count?: number; total_cost?: number; total_tokens?: number; error?: string };

/** A string field from a Python dict repr, whichever quote style repr chose for it. */
function reprField(repr: string, key: string): string | null {
  const m = repr.match(new RegExp(`['"]${key}['"]:\\s*(['"])((?:\\\\.|(?!\\1).)*)\\1`, "s"));
  return m ? m[2].replace(/\\(['"\\])/g, "$1") : null;
}

/**
 * A readable one-line title for a Langfuse trace. The backend sends
 * str(trace.input), a Python dict repr, so the useful part is pulled out:
 * the question asked, the file uploaded, or the evaluation run.
 */
export function traceTitle(input: string, name: string): string {
  const question = reprField(input, "question");
  if (question) return question;
  const filename = reprField(input, "filename");
  if (filename) return `Uploaded ${filename}`;
  const samples = input.match(/['"]total_samples['"]:\s*(\d+)/);
  if (samples && reprField(input, "run_id")) return `Evaluation run · ${samples[1]} samples`;
  const flat = input.replace(/\s+/g, " ").trim();
  return flat || name;
}

export function formatCost(usd: number | null | undefined): string {
  const v = usd ?? 0;
  // Per-trace costs are fractions of a cent; two decimals would show $0.00 for all of them.
  return v > 0 && v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(2)}`;
}

/** Langfuse latency is in seconds. */
export function formatLatency(seconds: number | null | undefined): string {
  if (!seconds) return "—";
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  return seconds < 10 ? `${seconds.toFixed(1)} s` : `${Math.round(seconds)} s`;
}

const numberFmt = new Intl.NumberFormat("en-US");

export function formatNumber(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : numberFmt.format(n);
}

export type Tone = "good" | "fair" | "poor" | "none";

/** Colour band for a 0–1 RAGAS score. 0.75 is the backend's default faithfulness threshold. */
export function scoreTone(value: number | null | undefined, good = 0.75): Tone {
  if (value === null || value === undefined) return "none";
  if (value >= good) return "good";
  return value >= 0.5 ? "fair" : "poor";
}

/** Share of a run's samples scored so far, 0–1. */
export function runProgress(run: EvalRun): number {
  if (run.status === "completed") return 1;
  if (!run.total_samples) return 0;
  return Math.min(1, run.completed / run.total_samples);
}

/** Mean of the run's scored metrics, or null if none were scored. */
export function averageScore(run: EvalRun): number | null {
  const vals = [run.avg_faithfulness, run.avg_relevancy, run.avg_context_precision, run.avg_context_recall].filter(
    (v): v is number => v !== null && v !== undefined,
  );
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

const dateTimeFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateTimeFmt.format(d);
}
