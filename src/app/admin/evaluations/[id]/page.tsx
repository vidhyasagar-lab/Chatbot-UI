import type { Metadata } from "next";
import { EvaluationRun } from "@/components/admin/evaluations";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Run ${id.slice(0, 8)}`,
    description: "Per-question scores, answers and ground truth for one evaluation run.",
  };
}

export default async function AdminEvaluationRunPage({ params }: Params) {
  const { id } = await params;
  return <EvaluationRun runId={id} />;
}
