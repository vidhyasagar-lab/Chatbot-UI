import { describe, expect, it } from "vitest";
import { averageScore, formatCost, formatLatency, formatNumber, runProgress, scoreTone, traceTitle, type EvalRun } from "./admin";

describe("traceTitle", () => {
  // The backend sends str(trace.input): a Python dict repr, not JSON.
  it("shows the question a chat trace asked", () => {
    expect(traceTitle("{'question': 'What drove Q3?', 'top_k': None}", "rag-chat")).toBe("What drove Q3?");
  });

  it("copes with the double quotes Python uses when the text has an apostrophe", () => {
    expect(traceTitle(`{'question': "What's the margin?", 'top_k': 5}`, "rag-chat")).toBe("What's the margin?");
  });

  it("names the file an upload trace ingested", () => {
    expect(traceTitle("{'filename': 'q3-report.pdf', 'size_bytes': 1408607}", "document-ingest")).toBe("Uploaded q3-report.pdf");
  });

  it("summarises an evaluation run", () => {
    expect(traceTitle("{'run_id': '115044d1', 'total_samples': 21}", "rag-evaluation")).toBe("Evaluation run · 21 samples");
  });

  it("falls back to the raw input, flattened", () => {
    expect(traceTitle("plain\n  text", "x")).toBe("plain text");
  });

  it("falls back to the trace name when there is no input", () => {
    expect(traceTitle("", "rag-chat")).toBe("rag-chat");
  });
});

describe("formatCost", () => {
  it.each([
    [0, "$0.00"],
    [1.5, "$1.50"],
    [0.0042, "$0.0042"],
    [0.01, "$0.01"],
  ])("%d -> %s", (usd, want) => {
    expect(formatCost(usd)).toBe(want);
  });

  it("treats a missing cost as zero", () => {
    expect(formatCost(null)).toBe("$0.00");
  });
});

describe("formatLatency", () => {
  // Langfuse reports trace latency in seconds.
  it.each([
    [0.42, "420 ms"],
    [2.4, "2.4 s"],
    [61, "61 s"],
    [0, "—"],
  ])("%d s -> %s", (s, want) => {
    expect(formatLatency(s)).toBe(want);
  });
});

describe("formatNumber", () => {
  it("groups thousands", () => {
    expect(formatNumber(12480)).toBe("12,480");
  });

  it("shows a dash for a missing value", () => {
    expect(formatNumber(undefined)).toBe("—");
  });
});

describe("scoreTone", () => {
  it.each([
    [0.9, "good"],
    [0.75, "good"],
    [0.6, "fair"],
    [0.3, "poor"],
    [null, "none"],
  ] as const)("%s -> %s", (v, want) => {
    expect(scoreTone(v)).toBe(want);
  });
});

const run = (over: Partial<EvalRun>): EvalRun => ({
  id: "r1",
  run_type: "batch",
  status: "running",
  total_samples: 10,
  completed: 0,
  avg_faithfulness: null,
  avg_relevancy: null,
  avg_context_precision: null,
  avg_context_recall: null,
  created_at: "2026-09-23T10:00:00Z",
  completed_at: null,
  ...over,
});

describe("runProgress", () => {
  it("is the share of samples scored", () => {
    expect(runProgress(run({ completed: 4 }))).toBe(0.4);
  });

  it("is complete once the run finishes, whatever the count says", () => {
    expect(runProgress(run({ status: "completed", completed: 9 }))).toBe(1);
  });

  it("never divides by zero or exceeds one", () => {
    expect(runProgress(run({ total_samples: 0 }))).toBe(0);
    expect(runProgress(run({ completed: 12 }))).toBe(1);
  });
});

describe("averageScore", () => {
  it("averages the metrics that were scored", () => {
    expect(averageScore(run({ avg_faithfulness: 0.9, avg_relevancy: 0.7, avg_context_precision: null, avg_context_recall: 0.8 }))).toBeCloseTo(0.8);
  });

  it("is null when nothing was scored", () => {
    expect(averageScore(run({}))).toBeNull();
  });
});
