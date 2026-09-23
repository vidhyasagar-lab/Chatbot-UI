import { EvaluationRun } from "@/components/admin/evaluations";

export default async function AdminEvaluationRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EvaluationRun runId={id} />;
}
