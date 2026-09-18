export type LighthouseStrategy = "mobile" | "desktop";
export type LighthouseProvider = "lighthouse" | "pagespeed";

export type LighthouseMetric = {
  value: number | null;
  displayValue: string | null;
};

export type LighthouseAuditSummary = {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string | null;
  savingsMs?: number | null;
  savingsBytes?: number | null;
};

export type LighthouseReport = {
  requestedUrl: string;
  finalUrl: string;
  strategy: LighthouseStrategy;
  fetchedAt: string;
  lighthouseVersion: string;
  provider?: LighthouseProvider;
  scores: {
    performance: number | null;
    accessibility: number | null;
    seo: number | null;
    bestPractices: number | null;
  };
  metrics: {
    firstContentfulPaint: LighthouseMetric;
    largestContentfulPaint: LighthouseMetric;
    cumulativeLayoutShift: LighthouseMetric;
    totalBlockingTime: LighthouseMetric;
    speedIndex: LighthouseMetric;
    timeToInteractive: LighthouseMetric;
    totalPageSize: LighthouseMetric;
    requestCount: LighthouseMetric;
  };
  opportunities: LighthouseAuditSummary[];
  warnings: string[];
  failedAudits: LighthouseAuditSummary[];
  passedAudits: LighthouseAuditSummary[];
};

export type LighthouseErrorCode =
  | "INVALID_URL"
  | "PRIVATE_URL"
  | "UNREACHABLE"
  | "TIMEOUT"
  | "BROWSER_FAILURE"
  | "UNSUPPORTED_WEBSITE"
  | "STORAGE_UNAVAILABLE"
  | "SERVER_OVERLOAD"
  | "RATE_LIMITED"
  | "AUDIT_FAILED";

export class LighthouseAuditError extends Error {
  constructor(public readonly code: LighthouseErrorCode, message: string) {
    super(message);
    this.name = "LighthouseAuditError";
  }
}
