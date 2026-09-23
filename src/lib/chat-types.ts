import type { UIMessage } from "ai";

/**
 * Pipeline stage. The backend names these explicitly now, rather than the UI
 * inferring one: tokens stream before the gate runs, so "drafting" no longer
 * describes the whole wait.
 */
export type ChatStage = "retrieving" | "generating" | "scoring" | "regenerating";

/**
 * Why the gate reached its conclusion.
 *  - passed            faithfulness met the threshold
 *  - rejected          ungrounded, and a replacement was generated
 *  - retrieval_failed  nothing relevant was retrieved, so no retry could help
 *  - unscored          the metric errored or timed out; the answer stands
 */
export type EvalVerdict = "passed" | "rejected" | "retrieval_failed" | "unscored";

export type EvalScores = {
  faithfulness: number | null;
  contextPrecision: number | null;
  threshold: number;
  passed: boolean;
  verdict?: EvalVerdict;
  attempt?: number;
};

export type VerityDataTypes = {
  /** Transient: never stored on the message, only delivered to onData. */
  status: { stage: ChatStage };
  meta: { traceId: string; sessionId: string };
  eval: EvalScores;
  /** A draft the gate rejected, kept visible so the check is legible. */
  rejected: { attempt: number; reason: string };
};

/** Per-source details the backend sends that SourceDocumentUIPart has no field for. */
export type SourceDetails = { page: string | number; contentType: string };

export type VerityMessage = UIMessage<unknown, VerityDataTypes>;
