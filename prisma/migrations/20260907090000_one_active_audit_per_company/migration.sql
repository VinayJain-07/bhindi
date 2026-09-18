-- Prevent simultaneous audit workers from replacing the same company evidence.
CREATE UNIQUE INDEX "AuditJob_one_active_per_company"
ON "AuditJob" ("companyId")
WHERE "status" IN ('QUEUED', 'RUNNING');
