ALTER TABLE "PageSpeedAudit" ADD COLUMN "statusCode" INTEGER;
ALTER TABLE "PageSpeedAudit" ADD COLUMN "responseTime" DOUBLE PRECISION;
ALTER TABLE "PageSpeedAudit" ADD COLUMN "ttfb" DOUBLE PRECISION;
ALTER TABLE "PageSpeedAudit" ADD COLUMN "transferSize" INTEGER;
ALTER TABLE "PageSpeedAudit" ALTER COLUMN "source" SET DEFAULT 'Python URL timing test';
