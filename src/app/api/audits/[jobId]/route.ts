import { after } from "next/server";
import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { runInitialAudit } from "@/lib/audit/run-initial-audit";
import { createOrReuseAuditJob } from "@/lib/audit/jobs";

const STALE_AUDIT_MS = 2 * 60 * 60 * 1000;

export const maxDuration = 1800;

function requiresProviderReconnect(user: { demoMode: boolean; llmVerifiedAt: Date | null; llmProvider: string | null; llmApiKeyEnc: string | null; llmModel: string | null }, job: { error: string | null; completedAt: Date | null }) {
  if (user.demoMode || !user.llmVerifiedAt || !user.llmProvider || !user.llmApiKeyEnc || !user.llmModel) return true;
  const credentialFailure = /api[ -]?key|provider|authentication|unauthorized/i.test(job.error ?? "");
  return credentialFailure && (!job.completedAt || user.llmVerifiedAt <= job.completedAt);
}

function requiresModelChange(user: { llmProvider: string | null; llmVerifiedAt: Date | null }, job: { error: string | null; completedAt: Date | null }) {
  const modelFailure = user.llmProvider === "openrouter" && /model returned no usable content|supports long structured responses|structured report support/i.test(job.error ?? "");
  const modelWasChanged = Boolean(user.llmVerifiedAt && job.completedAt && user.llmVerifiedAt > job.completedAt);
  return modelFailure && !modelWasChanged;
}

export async function GET(_request: Request, context: RouteContext<"/api/audits/[jobId]">) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { jobId } = await context.params;
  const job = await db.auditJob.findFirst({ where: { id: jobId, company: { userId: user.id } }, include: { company: { include: { documents: { select: { type: true, title: true } }, _count: { select: { crawlPages: true, agentRuns: true } } } } } });
  if (!job) return Response.json({ error: "Audit not found" }, { status: 404 });
  if (["QUEUED", "RUNNING"].includes(job.status) && Date.now() - job.updatedAt.getTime() > STALE_AUDIT_MS) {
    const error = "This audit stopped responding after 2 hours. Retry the audit to continue using the saved research evidence.";
    await db.$transaction([
      db.auditJob.update({ where: { id: job.id }, data: { status: "ERROR", error, step: "Audit stopped responding", completedAt: new Date() } }),
      db.company.update({ where: { id: job.companyId }, data: { status: "ERROR", crawlStatus: "ERROR", crawlError: error, crawlStep: "Audit stopped responding" } }),
    ]);
    job.status = "ERROR";
    job.error = error;
    job.step = "Audit stopped responding";
    job.completedAt = new Date();
  }
  return Response.json({ status: job.status, progress: job.progress, step: job.step, error: job.error, requiresProvider: requiresProviderReconnect(user, job), requiresModelChange: requiresModelChange(user, job), companyId: job.companyId, companyName: job.company.name, pagesRead: job.company._count.crawlPages, agentsReady: job.company._count.agentRuns, documents: job.company.documents });
}

export async function POST(_request: Request, context: RouteContext<"/api/audits/[jobId]">) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { jobId } = await context.params;
  const previous = await db.auditJob.findFirst({ where: { id: jobId, company: { userId: user.id } } });
  if (!previous) return Response.json({ error: "Audit not found" }, { status: 404 });
  if (requiresProviderReconnect(user, previous)) {
    return Response.json({ error: "Connect and verify a live AI provider before retrying this audit.", requiresProvider: true }, { status: 409 });
  }
  if (requiresModelChange(user, previous)) {
    return Response.json({ error: "Choose and verify a different OpenRouter model before retrying this audit.", requiresModelChange: true }, { status: 409 });
  }
  const reuseEvidence = previous.progress >= 28;
  const result = await createOrReuseAuditJob({ companyId: previous.companyId, progress: reuseEvidence ? 28 : 0, step: reuseEvidence ? "Reusing saved website evidence" : "Queued" });
  if (result.resumed) return Response.json({ jobId: result.job.id, resumed: true });
  await db.company.update({ where: { id: previous.companyId }, data: { status: "ONBOARDING", crawlStatus: "QUEUED", crawlProgress: reuseEvidence ? 28 : 0, crawlStep: reuseEvidence ? "Reusing saved website evidence" : "Queued", crawlError: null } });
  after(() => runInitialAudit(result.job.id));
  return Response.json({ jobId: result.job.id }, { status: 202 });
}

export async function DELETE(_request: Request, context: RouteContext<"/api/audits/[jobId]">) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { jobId } = await context.params;
  const job = await db.auditJob.findFirst({ where: { id: jobId, company: { userId: user.id } } });
  if (!job) return Response.json({ error: "Audit not found" }, { status: 404 });

  const message = "Audit was stopped by user.";
  await db.$transaction([
    db.auditJob.update({
      where: { id: job.id },
      data: { status: "ERROR", error: message, step: "Audit stopped by user", completedAt: new Date() },
    }),
    db.company.update({
      where: { id: job.companyId },
      data: { status: "ERROR", crawlStatus: "ERROR", crawlError: message, crawlStep: "Audit stopped by user" },
    }),
  ]);

  return Response.json({ ok: true, status: "STOPPED", step: "Audit stopped by user" });
}

