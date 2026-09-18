"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  RotateCcw,
  Square,
  ArrowRight,
  Plus,
  Loader2,
  Sparkles,
  FileText,
} from "lucide-react";
import { ModuleIcon } from "./module-icon";
import { LogoutButton } from "./logout-button";

type JobState = {
  status: string;
  progress: number;
  step: string;
  error?: string | null;
  requiresProvider: boolean;
  requiresModelChange: boolean;
  companyId: string;
  companyName: string;
  pagesRead: number;
  agentsReady: number;
  documents: Array<{ type: string; title: string }>;
};

const documentPipeline = [
  ["COMPETITOR_ANALYSIS", "Competitive Landscape and Comparison Playbook"],
  ["COMPANY_INTELLIGENCE", "Company and Product Intelligence"],
  ["MARKETING_STRATEGY", "Strategic Intelligence Report"],
  ["SEO_AUDIT", "SEO Audit"],
  ["GEO_AUDIT", "GEO and AI Visibility"],
  ["AUDIENCE_ANALYSIS", "Audience Analysis"],
  ["CONTENT_AUDIT", "Content Audit and Full-Funnel Strategy"],
  ["DESIGN_GUIDE", "Brand and Visual Design Guide"],
] as const;

export function AuditProgress({ jobId, initial }: { jobId: string; initial: JobState }) {
  const router = useRouter();
  const [job, setJob] = useState(initial);
  const [retrying, setRetrying] = useState(false);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    if (["DONE", "PARTIAL", "ERROR", "STOPPED"].includes(job.status)) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/audits/${jobId}`, { cache: "no-store" });
      if (!response.ok) return;
      const next = (await response.json()) as JobState;
      setJob(next);
      const firstReportReady = next.documents.length >= 1;
      if (["DONE", "PARTIAL"].includes(next.status) || firstReportReady) {
        window.clearInterval(timer);
        window.setTimeout(() => router.push(`/dashboard/${next.companyId}`), 700);
      }
    }, 1800);
    return () => window.clearInterval(timer);
  }, [job.status, jobId, router]);

  async function retry() {
    setRetrying(true);
    const response = await fetch(`/api/audits/${jobId}`, { method: "POST" });
    const data = (await response.json()) as {
      jobId?: string;
      error?: string;
      requiresProvider?: boolean;
      requiresModelChange?: boolean;
    };
    if (response.ok && data.jobId) {
      router.replace(`/onboarding/audit/${data.jobId}`);
    } else {
      setJob((current) => ({
        ...current,
        error: data.error ?? "Retry failed.",
        requiresProvider: Boolean(data.requiresProvider) || current.requiresProvider,
        requiresModelChange: Boolean(data.requiresModelChange) || current.requiresModelChange,
      }));
    }
    setRetrying(false);
  }

  async function stopAudit() {
    setStopping(true);
    try {
      const response = await fetch(`/api/audits/${jobId}`, { method: "DELETE" });
      const data = (await response.json()) as { status?: string; step?: string };
      setJob((current) => ({
        ...current,
        status: data.status ?? "STOPPED",
        step: data.step ?? "Audit stopped by user",
      }));
    } catch {
      setJob((current) => ({ ...current, status: "STOPPED", step: "Audit stopped by user" }));
    } finally {
      setStopping(false);
    }
  }

  const finished = ["DONE", "PARTIAL"].includes(job.status);
  const isStopped =
    job.status === "STOPPED" ||
    job.step === "Audit stopped by user" ||
    job.error === "Audit was stopped by user.";
  const providerError = job.requiresProvider;
  const modelError = job.requiresModelChange;
  const nextDocumentType = documentPipeline.find(
    ([type]) => !job.documents.some((document) => document.type === type)
  )?.[0];

  const errorMessage = isStopped
    ? "Audit was paused. You can resume processing, switch AI models, or add another company workspace."
    : modelError
    ? "The selected AI model returned an error or is unsupported. Choose and verify another model, then retry using the saved website evidence."
    : providerError
    ? "Connect and verify a live AI provider to generate this company’s skill-backed documents."
    : job.error;

  const milestones = [
    {
      num: "01",
      label: "Website safety check",
      isDone: job.progress >= 8,
      isActive: job.progress < 8 && job.status === "RUNNING",
    },
    {
      num: "02",
      label: "Research crawl",
      isDone: job.progress >= 28,
      isActive: job.progress >= 8 && job.progress < 28 && job.status === "RUNNING",
    },
    {
      num: "03",
      label: "Foundational intelligence ready",
      isDone: job.documents.length >= 1,
      isActive: job.progress >= 28 && job.documents.length < 1 && job.status === "RUNNING",
    },
    {
      num: "04",
      label: "Background report queue",
      isDone: job.documents.length >= documentPipeline.length,
      isActive:
        job.documents.length >= 1 &&
        job.documents.length < documentPipeline.length &&
        job.status === "RUNNING",
    },
  ];

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const progressClamped = Math.min(100, Math.max(0, job.progress));
  const strokeOffset = circumference - (circumference * progressClamped) / 100;

  return (
    <div className="relative w-full rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 md:p-10 backdrop-blur-xl shadow-2xl text-slate-100 overflow-hidden">
      {/* Subtle background ambient lights */}
      <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-purple-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-64 rounded-full bg-indigo-600/10 blur-3xl" />

      {/* Eyebrow & Live status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/15 px-3 py-1 text-xs font-semibold tracking-wider uppercase text-purple-300">
          <span className="size-2 rounded-full bg-purple-400 animate-pulse shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
          <span>Live Company Audit</span>
        </div>
        {job.companyName && (
          <span className="text-xs font-medium text-slate-300 truncate max-w-[220px]">
            {job.companyName}
          </span>
        )}
      </div>

      {/* Main Title */}
      <h2 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-white leading-snug">
        {job.status === "ERROR" ? (
          modelError ? (
            "Choose a different AI model"
          ) : providerError ? (
            "Connect your AI provider"
          ) : (
            "We hit a snag"
          )
        ) : isStopped ? (
          "Audit paused"
        ) : finished ? (
          "Your workspace is ready!"
        ) : (
          <>
            Learning{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-white to-purple-200">
              {job.companyName || "company"}
            </span>
          </>
        )}
      </h2>

      {/* Step description / Error message */}
      <p
        className={`mt-2.5 text-sm sm:text-base leading-relaxed ${
          job.status === "ERROR" || isStopped ? "text-rose-300" : "text-slate-200"
        }`}
      >
        {job.status === "ERROR" || isStopped
          ? errorMessage
          : finished
          ? "Opening the dashboard with your foundational intelligence. Background reports will continue compiling live."
          : job.step || "Initializing crawler and reading public website evidence…"}
      </p>

      {/* Circular Progress Gauge */}
      <div className="relative mx-auto my-7 flex size-44 sm:size-48 items-center justify-center">
        <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-purple-600/25 via-indigo-500/20 to-emerald-400/20 blur-xl pointer-events-none" />

        <svg className="size-full -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="9"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="url(#audit-progress-gradient)"
            strokeWidth="9"
            strokeDasharray={circumference}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
          <defs>
            <linearGradient id="audit-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B2CE0" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#34D399" />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute flex flex-col items-center justify-center text-center select-none">
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
            {job.progress}%
          </span>
          <span className="mt-1 text-xs font-semibold text-purple-300">
            {job.pagesRead} {job.pagesRead === 1 ? "page" : "pages"} read
          </span>
        </div>
      </div>

      {/* Linear Track bar */}
      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(168,85,247,0.5)]"
          style={{ width: `${Math.min(100, Math.max(3, job.progress))}%` }}
        />
      </div>

      {/* Milestone Checkboxes */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
        {milestones.map((m) => (
          <div
            key={m.num}
            className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
              m.isDone
                ? "border-emerald-500/30 bg-emerald-950/20 text-slate-200"
                : m.isActive
                ? "border-purple-500/50 bg-purple-950/30 text-white shadow-md shadow-purple-500/10 ring-1 ring-purple-500/40"
                : "border-white/5 bg-white/[0.02] text-slate-400"
            }`}
          >
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                m.isDone
                  ? "bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  : m.isActive
                  ? "bg-purple-500/30 text-purple-300 border border-purple-400/50"
                  : "bg-white/5 text-slate-400"
              }`}
            >
              {m.isDone ? <Check className="size-3.5 stroke-[3]" /> : m.num}
            </span>
            <div className="min-w-0 flex-1">
              <span
                className={`block text-xs sm:text-sm font-medium ${
                  m.isDone ? "text-emerald-300" : m.isActive ? "text-white font-semibold" : "text-slate-300"
                }`}
              >
                {m.label}
              </span>
            </div>
            {m.isDone && (
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                Done
              </span>
            )}
            {m.isActive && (
              <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-purple-400 animate-ping" />
                Active
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Sequential Background Report Queue */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-purple-400" />
            <strong className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
              Background Intelligence Pipeline
            </strong>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-300">
            {job.documents.length}/{documentPipeline.length} ready
          </span>
        </div>

        <div className="divide-y divide-white/5">
          {documentPipeline.map(([type, label]) => {
            const ready = job.documents.some((d) => d.type === type);
            const running =
              !ready && type === nextDocumentType && job.progress >= 34 && job.status === "RUNNING";

            return (
              <div
                key={type}
                className={`flex items-center justify-between py-2.5 px-2 rounded-lg transition-colors ${
                  ready
                    ? "bg-emerald-950/15 text-slate-200"
                    : running
                    ? "bg-purple-950/20 text-white ring-1 ring-purple-500/30"
                    : "text-slate-400 hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <div
                    className={`size-7 rounded-lg flex items-center justify-center shrink-0 ${
                      ready
                        ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                        : running
                        ? "text-purple-400 bg-purple-500/15 border border-purple-500/30"
                        : "text-slate-500 bg-white/5 border border-white/5"
                    }`}
                  >
                    <ModuleIcon type={type} size={15} />
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-medium truncate ${
                      ready ? "text-slate-200" : running ? "text-white font-semibold" : "text-slate-300"
                    }`}
                  >
                    {label}
                  </span>
                </div>

                <div className="shrink-0">
                  {ready ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      <Check className="size-3 stroke-[3]" /> Ready
                    </span>
                  ) : running ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                      <Loader2 className="size-3 animate-spin text-purple-400" /> Generating
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[11px] font-medium text-slate-400 bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full">
                      Queued
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Research Coverage Metric Cards */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
          <strong className="block text-xl sm:text-2xl font-bold text-white tracking-tight">
            {job.pagesRead}
          </strong>
          <span className="block mt-0.5 text-xs font-medium text-slate-400">
            Pages crawled & indexed
          </span>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
          <strong className="block text-xl sm:text-2xl font-bold text-purple-400 tracking-tight">
            {job.agentsReady}
          </strong>
          <span className="block mt-0.5 text-xs font-medium text-slate-400">
            Specialist agents primed
          </span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="mt-6 pt-5 border-t border-white/10">
        {job.status === "ERROR" || isStopped ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {modelError ? (
                <Link
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition-all"
                  href={`/settings/credits?reason=model&returnTo=${encodeURIComponent(
                    `/onboarding/audit/${jobId}`
                  )}`}
                >
                  <span>Change AI model</span>
                  <ArrowRight className="size-4" />
                </Link>
              ) : providerError ? (
                <Link
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition-all"
                  href="/settings/credits"
                >
                  <span>Connect provider</span>
                  <ArrowRight className="size-4" />
                </Link>
              ) : (
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition-all cursor-pointer disabled:opacity-50"
                  type="button"
                  disabled={retrying}
                  onClick={retry}
                >
                  <RotateCcw className={`size-4 ${retrying ? "animate-spin" : ""}`} />
                  <span>{retrying ? "Restarting…" : isStopped ? "Resume audit" : "Retry audit"}</span>
                </button>
              )}

              <Link
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs sm:text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all"
                href="/onboarding/company?mode=add"
                title="Add another company workspace"
              >
                <Plus className="size-4" />
                <span>Add another company</span>
              </Link>
            </div>

            <LogoutButton
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
              label="Sign out"
            />
          </div>
        ) : !finished ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all cursor-pointer disabled:opacity-50"
                  type="button"
                  disabled={stopping}
                  onClick={stopAudit}
                  title="Stop current audit processing"
                >
                  <Square className="size-3.5 fill-rose-300/80" />
                  <span>{stopping ? "Stopping…" : "Stop audit"}</span>
                </button>

                <Link
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all"
                  href={`/settings/credits?reason=model&returnTo=${encodeURIComponent(
                    `/onboarding/audit/${jobId}`
                  )}`}
                  title="Stuck or taking too long? Switch to a faster AI model anytime"
                >
                  <Sparkles className="size-3.5" />
                  <span>Switch AI model</span>
                </Link>

                <Link
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all"
                  href="/onboarding/company?mode=add"
                  title="Add another company workspace while processing"
                >
                  <Plus className="size-3.5" />
                  <span>Add another company</span>
                </Link>
              </div>

              <LogoutButton
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                label="Sign out"
              />
            </div>

            <p className="text-center text-xs leading-relaxed text-slate-400">
              The workspace opens instantly once Document #1 is ready. Background reports continue
              processing seamlessly in real-time.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-end">
            <Link
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition-all"
              href="/onboarding/company?mode=add"
              title="Add another company workspace"
            >
              <span>Add another company workspace</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
