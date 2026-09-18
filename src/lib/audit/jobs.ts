import "server-only";

import type { AuditJob } from "@prisma/client";
import { db } from "@/lib/db";

export type AuditJobRequest = { companyId: string; progress?: number; step?: string };

function uniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "P2002");
}

// The database also has a partial unique index for this invariant. The read is
// a fast path; the unique-index retry is what makes concurrent requests safe.
export async function createOrReuseAuditJob(args: AuditJobRequest): Promise<{ job: AuditJob; resumed: boolean }> {
  const active = await db.auditJob.findFirst({
    where: { companyId: args.companyId, status: { in: ["QUEUED", "RUNNING"] } },
    orderBy: { createdAt: "desc" },
  });
  if (active) return { job: active, resumed: true };

  try {
    return { job: await db.auditJob.create({ data: { companyId: args.companyId, progress: args.progress ?? 0, step: args.step ?? "Queued" } }), resumed: false };
  } catch (error) {
    if (!uniqueViolation(error)) throw error;
    const current = await db.auditJob.findFirst({
      where: { companyId: args.companyId, status: { in: ["QUEUED", "RUNNING"] } },
      orderBy: { createdAt: "desc" },
    });
    if (current) return { job: current, resumed: true };
    throw error;
  }
}
