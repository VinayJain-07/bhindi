import { after } from "next/server";
import { requireApiUser } from "@/lib/auth-helpers";
import { runInitialAudit } from "@/lib/audit/run-initial-audit";
import { db } from "@/lib/db";
import { createOrReuseAuditJob } from "@/lib/audit/jobs";

export const maxDuration = 1800;

export async function POST(_request: Request, context: { params: Promise<{ companyId: string }> }) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to run company research." }, { status: 401 });
  const { companyId } = await context.params;
  const company = await db.company.findFirst({ where: { id: companyId, userId: user.id } });
  if (!company) return Response.json({ error: "Company not found." }, { status: 404 });
  if (user.demoMode || !user.llmVerifiedAt || !user.llmProvider || !user.llmApiKeyEnc || !user.llmModel) return Response.json({ error: "Connect and verify a live AI provider before running company research.", requiresProvider: true }, { status: 409 });
  const result = await createOrReuseAuditJob({ companyId, step: "Queued for expanded research" });
  if (result.resumed) return Response.json({ jobId: result.job.id, resumed: true });
  await db.company.update({ where: { id: companyId }, data: { status: "ONBOARDING", crawlStatus: "QUEUED", crawlProgress: 0, crawlStep: "Queued for expanded research", crawlError: null } });
  after(() => runInitialAudit(result.job.id));
  return Response.json({ jobId: result.job.id }, { status: 202 });
}
