import { PrismaClient } from "@prisma/client";
import { runInitialAudit } from "../src/lib/audit/run-initial-audit";

process.loadEnvFile?.(".env.local");
const db = new PrismaClient();

async function main() {
  const companyId = process.argv[2];
  if (!companyId) throw new Error("Pass one exact company id.");
  const company = await db.company.findUnique({ where: { id: companyId }, include: { user: true } });
  if (!company) throw new Error("Company not found.");
  if (!company.user.llmVerifiedAt || !company.user.llmProvider || !company.user.llmApiKeyEnc || !company.user.llmModel) throw new Error("The company owner does not have a verified provider.");
  const existing = await db.auditJob.findFirst({ where: { companyId, status: { in: ["QUEUED", "RUNNING"] } }, orderBy: { createdAt: "desc" } });
  const job = existing ?? await db.$transaction(async (tx) => {
    const created = await tx.auditJob.create({ data: { companyId } });
    await tx.company.update({ where: { id: companyId }, data: { status: "ONBOARDING", crawlStatus: "QUEUED", crawlProgress: 0, crawlStep: "Queued for expanded research", crawlError: null } });
    return created;
  });
  process.stdout.write(`Running audit ${job.id} for ${company.name}.\n`);
  await runInitialAudit(job.id);
  const finished = await db.auditJob.findUnique({ where: { id: job.id } });
  process.stdout.write(`${JSON.stringify({ id: finished?.id, status: finished?.status, progress: finished?.progress, step: finished?.step, error: finished?.error })}\n`);
}

main().finally(() => db.$disconnect());
