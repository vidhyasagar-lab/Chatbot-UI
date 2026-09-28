import { evalData } from "./backend-stream";
import type { EvalScores, EvalVerdict } from "./chat-types";

/**
 * The quality gate's verdict, from GET /api/v1/chat/gate/{traceId}.
 *
 * The gate runs after the answer has streamed - holding the stream open for
 * it kept the sources, figures and the next question waiting ~36s - so its
 * result arrives separately, and may carry a revised answer.
 */
export type GateResult = {
  verdict: EvalVerdict;
  faithfulness: number | null;
  context_precision: number | null;
  threshold: number;
  revised_answer: string | null;
  /**
   * After a rewrite, `faithfulness` is the rewrite's own score and this is the
   * rejected draft's. Absent from backends older than the rewrite check.
   */
  draft_faithfulness?: number | null;
};

export type GateView = {
  /** The answer to show: the revision if the gate produced one. */
  text: string;
  /** The draft the gate threw out, shown struck through so the check is visible. */
  rejected: { text: string; reason: string } | null;
  /** Scores for the badge, or null while the gate is still running. */
  scores: EvalScores | null;
};

/** What to show for a streamed answer, given the gate's result so far. */
export function gateView(streamed: string, gate: GateResult | null): GateView {
  if (!gate) return { text: streamed, rejected: null, scores: null };

  const revised = gate.revised_answer;
  const scores = evalData(
    {
      faithfulness: gate.faithfulness,
      context_precision: gate.context_precision,
      threshold: gate.threshold,
      passed: gate.verdict === "passed",
    },
    gate.verdict,
    revised ? 2 : 1,
  );
  if (!revised) return { text: streamed, rejected: null, scores };

  // The reason is about the draft; an older backend has only the one score.
  const f = gate.draft_faithfulness === undefined ? gate.faithfulness : gate.draft_faithfulness;
  const reason =
    f === null
      ? "The quality gate rejected this answer."
      : `faithfulness ${f.toFixed(2)} < ${gate.threshold.toFixed(2)}`;
  return { text: revised, rejected: { text: streamed, reason }, scores };
}
