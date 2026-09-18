export const LIGHTHOUSE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const STALE_AUDIT_JOB_MS = 180 * 1000; // 3 minutes

export function isReusableAudit(job: { status: string; expiresAt: Date | null; result: unknown }, now = new Date()) {
  return job.status === "COMPLETED" && job.result !== null && Boolean(job.expiresAt && job.expiresAt.getTime() > now.getTime());
}

export function isActiveDuplicate(
  job: { status: string; createdAt?: Date; startedAt?: Date | null } | null | undefined,
  now = new Date(),
) {
  if (!job) return false;
  if (job.status !== "QUEUED" && job.status !== "RUNNING") return false;
  const timestamp = job.startedAt ? job.startedAt.getTime() : job.createdAt ? job.createdAt.getTime() : null;
  if (timestamp !== null && now.getTime() - timestamp > STALE_AUDIT_JOB_MS) {
    return false;
  }
  return true;
}

