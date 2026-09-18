CREATE TYPE "LighthouseJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "LighthouseAuditJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "status" "LighthouseJobStatus" NOT NULL DEFAULT 'QUEUED',
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "result" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LighthouseAuditJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LighthouseAuditJob_userId_createdAt_idx" ON "LighthouseAuditJob"("userId", "createdAt");
CREATE INDEX "LighthouseAuditJob_cacheKey_status_completedAt_idx" ON "LighthouseAuditJob"("cacheKey", "status", "completedAt");
CREATE INDEX "LighthouseAuditJob_status_createdAt_idx" ON "LighthouseAuditJob"("status", "createdAt");

ALTER TABLE "LighthouseAuditJob" ADD CONSTRAINT "LighthouseAuditJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
