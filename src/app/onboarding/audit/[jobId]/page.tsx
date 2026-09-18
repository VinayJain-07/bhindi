import { notFound, redirect } from "next/navigation";
import { MinimalCompanyLoading } from "@/components/minimal-company-loading";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export default async function AuditPage({ params }: PageProps<"/onboarding/audit/[jobId]">) {
  const user = await requireUser();
  const { jobId } = await params;
  const job = await db.auditJob.findFirst({
    where: { id: jobId, company: { userId: user.id } },
    include: {
      company: {
        include: {
          documents: { select: { type: true, title: true } },
          _count: { select: { crawlPages: true, agentRuns: true } },
        },
      },
    },
  });
  if (!job) notFound();
  if (job.status === "DONE") redirect(`/dashboard/${job.companyId}`);
  const credentialFailure = /api[ -]?key|provider|authentication|unauthorized/i.test(job.error ?? "");
  const providerWasReconnected = Boolean(user.llmVerifiedAt && job.completedAt && user.llmVerifiedAt > job.completedAt);
  const requiresProvider = user.demoMode || !user.llmVerifiedAt || !user.llmProvider || !user.llmApiKeyEnc || !user.llmModel || (credentialFailure && !providerWasReconnected);
  const modelFailure = /model|not found|does not exist|invalid model|unsupported|supports long structured/i.test(job.error ?? "");
  const requiresModelChange = modelFailure && !providerWasReconnected;
  return (
    <MinimalCompanyLoading
      jobId={job.id}
      initial={{
        status: job.status,
        progress: job.progress,
        step: job.step,
        error: job.error,
        requiresProvider,
        requiresModelChange,
        companyId: job.companyId,
        companyName: job.company.name,
        websiteUrl: job.company.websiteUrl,
        pagesRead: job.company._count.crawlPages,
        agentsReady: job.company._count.agentRuns,
        documents: job.company.documents,
      }}
    />
  );
}
