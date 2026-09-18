import { PrismaClient } from "@prisma/client";

process.loadEnvFile?.(".env.local");
const db = new PrismaClient();

async function main() {
  const companies = await db.company.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      crawlStatus: true,
      crawlProgress: true,
      crawlStep: true,
      crawlError: true,
      user: { select: { email: true, llmProvider: true, llmModel: true, llmVerifiedAt: true, demoMode: true } },
      _count: { select: { documents: true, crawlPages: true, agentRuns: true } },
      documents: { select: { type: true, title: true, updatedAt: true } },
      agentRuns: { orderBy: { createdAt: "desc" }, take: 16, select: { agentType: true, status: true, error: true, createdAt: true } },
      auditJobs: { orderBy: { createdAt: "desc" }, take: 3, select: { id: true, status: true, progress: true, step: true, error: true, attempts: true, createdAt: true, startedAt: true, completedAt: true } },
    },
  });
  process.stdout.write(`${JSON.stringify(companies, null, 2)}\n`);
}

main().finally(() => db.$disconnect());
