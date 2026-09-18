"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BorderBeam } from "@/components/ui/border-beam";
import {
  Globe,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Key,
  Sparkles,
  Search,
  Bot,
  Compass,
  FileText,
  BarChart3,
  Users,
  Check,
} from "lucide-react";

interface ProviderOption {
  id: string;
  name: string;
  models: string;
  logo: string;
  hint: string;
  recommendedModel: string;
}

const PROVIDERS: ProviderOption[] = [
  {
    id: "openai",
    name: "OpenAI",
    models: "GPT-4o, o1, and more",
    logo: "/provider-logos/openai.svg",
    hint: "Fast parallel JSON completion",
    recommendedModel: "gpt-4o-mini",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    models: "Claude Sonnet and Opus",
    logo: "/provider-logos/anthropic.svg",
    hint: "Exceptional strategic reasoning",
    recommendedModel: "claude-opus-5",
  },
  {
    id: "google",
    name: "Google Gemini",
    models: "Gemini 1.5 Pro, 2.0 Flash",
    logo: "/provider-logos/google-gemini.svg",
    hint: "Massive context & multimodal",
    recommendedModel: "gemini-1.5-flash",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    models: "Access 100+ models",
    logo: "/provider-logos/openrouter.svg",
    hint: "Unified key with smart routing",
    recommendedModel: "openai/gpt-4o-mini",
  },
];

type VerifiedProvider = { provider: string; preview: string; model: string } | null;

function suggestedName(websiteUrl: string) {
  const hostname = websiteUrl.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
  const stem = hostname.split(".")[0] ?? "";
  return stem ? stem.charAt(0).toUpperCase() + stem.slice(1) : "";
}

function OnboardingContent({ authenticated, verifiedProvider }: { authenticated: boolean; verifiedProvider: VerifiedProvider }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialUrl = searchParams.get("url") || "";
  const [currentStep, setCurrentStep] = React.useState(authenticated ? 2 : 1);

  // Form State
  const [url, setUrl] = React.useState(initialUrl);
  const [selectedProvider, setSelectedProvider] = React.useState(verifiedProvider?.provider ?? "anthropic");
  const [apiKey, setApiKey] = React.useState("");
  const [model, setModel] = React.useState(verifiedProvider?.model || PROVIDERS.find((provider) => provider.id === verifiedProvider?.provider)?.recommendedModel || PROVIDERS[1].recommendedModel);
  const [companyName, setCompanyName] = React.useState("");
  const [accountReady, setAccountReady] = React.useState(authenticated);
  const [connectedProvider, setConnectedProvider] = React.useState(verifiedProvider?.provider ?? "");
  const [connectedModel, setConnectedModel] = React.useState(verifiedProvider?.model ?? "");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState("");

  const normalizeUrl = (raw: string) => {
    let trimmed = raw.trim();
    if (!trimmed) return "";
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }
    return trimmed;
  };

  const handleAccountSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    try {
      const response = await fetch("/api/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Your account could not be created.");
      const session = await signIn("credentials", { email, password, redirect: false });
      if (session?.error) throw new Error("Your account was created, but automatic sign-in failed. Please sign in to continue.");
      setAccountReady(true);
      setCurrentStep(2);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your account could not be created.");
    } finally {
      setPending(false);
    }
  };

  const handleWebsiteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountReady) return;
    if (!url.trim()) return;
    setCompanyName(companyName.trim() || suggestedName(url));
    setUrl(normalizeUrl(url));
    setError("");
    setCurrentStep(3);
  };

  const handleProviderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      if (connectedProvider !== selectedProvider || connectedModel !== model.trim() || apiKey.trim()) {
        const response = await fetch("/api/llm/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: selectedProvider, apiKey: apiKey.trim() || undefined, model: model.trim() }) });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error ?? "The provider could not be connected.");
        setConnectedProvider(selectedProvider);
        setConnectedModel(model.trim());
        setApiKey("");
      }
      setCurrentStep(4);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The provider could not be connected.");
    } finally {
      setPending(false);
    }
  };

  const handleFinalLaunch = async () => {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyName: companyName.trim(), websiteUrl: normalizeUrl(url) }) });
      const result = await response.json() as { error?: string; jobId?: string };
      if (!response.ok || !result.jobId) throw new Error(result.error ?? "The analysis could not be started.");
      router.push(`/onboarding/audit/${result.jobId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The analysis could not be started.");
      setPending(false);
    }
  };

  const currentProviderObj = PROVIDERS.find((p) => p.id === selectedProvider) || PROVIDERS[1];

  return (
    <div className="relative min-h-screen w-full bg-[#0a0a0f] font-sans text-slate-100 selection:bg-purple-500 selection:text-white">
      {/* Sticky Main Menu Header */}
      <SiteHeader activeNav="get-started" accountReady={accountReady} />

      <main className="relative mx-auto max-w-4xl px-6 pt-28 pb-24 md:pt-32">
        {/* Step Progress Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3.5 py-1 text-xs font-semibold text-purple-300 backdrop-blur-md">
            <Sparkles className="size-3.5 text-purple-400" />
            <span>STEP 0{currentStep} OF 04 &bull; GET STARTED</span>
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            {currentStep === 1 && "Create your account"}
            {currentStep === 2 && "What website are we analyzing?"}
            {currentStep === 3 && "Choose your AI inference provider"}
            {currentStep === 4 && "Review & launch intelligence engine"}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
            {currentStep === 1 && "Create one secure account to save your company intelligence and return to your workspace."}
            {currentStep === 2 && "Smark Connect crawls up to 20 public pages to extract verified digital evidence before running strategy."}
            {currentStep === 3 && "Bring your own API key. Your credentials are encrypted at rest and used for your workspace."}
            {currentStep === 4 && "Your evidence baseline is ready to initialize. All six analyses will run concurrently."}
          </p>

          {/* Stepper Progress Bar */}
          <div className="mx-auto mt-8 flex max-w-md items-center justify-between gap-2">
            {[1, 2, 3, 4].map((step) => {
              const isDone = currentStep > step;
              const isCurrent = currentStep === step;
              return (
                <div key={step} className="flex flex-1 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentStep > step && (step !== 1 || !accountReady)) { setError(""); setCurrentStep(step); }
                    }}
                    disabled={currentStep <= step || (step === 1 && accountReady)}
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isDone
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 cursor-pointer"
                        : isCurrent
                        ? "border-2 border-purple-500 bg-purple-500/20 text-purple-300"
                        : "border border-white/10 bg-white/5 text-slate-500"
                    }`}
                  >
                    {isDone ? <Check className="size-4 stroke-[3]" /> : step}
                  </button>
                  {step < 4 && (
                    <div
                      className={`h-0.5 flex-1 rounded-full transition-all ${
                        currentStep > step ? "bg-purple-500" : "bg-white/10"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP 1: ACCOUNT */}
        {currentStep === 1 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl md:p-10">
            <form onSubmit={handleAccountSubmit} className="mx-auto max-w-lg space-y-5">
              <div>
                <label htmlFor="account-name" className="block text-xs font-bold uppercase tracking-wider text-slate-300">Your name</label>
                <input id="account-name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={80} placeholder="Your full name" className="mt-2 h-12 w-full rounded-xl border border-white/15 !bg-transparent px-4 text-sm text-white placeholder-slate-400 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
              </div>
              <div>
                <label htmlFor="account-email" className="block text-xs font-bold uppercase tracking-wider text-slate-300">Work email</label>
                <input id="account-email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" className="mt-2 h-12 w-full rounded-xl border border-white/15 !bg-transparent px-4 text-sm text-white placeholder-slate-400 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
              </div>
              <div>
                <label htmlFor="account-password" className="block text-xs font-bold uppercase tracking-wider text-slate-300">Password</label>
                <input id="account-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,128}" title="Use at least 8 characters with a letter and a number." placeholder="At least 8 characters, a letter and a number" className="mt-2 h-12 w-full rounded-xl border border-white/15 !bg-transparent px-4 text-sm text-white placeholder-slate-400 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
              </div>
              {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}
              <button type="submit" disabled={pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-7 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 disabled:opacity-50">
                <span>{pending ? "Creating account…" : "Create account & continue"}</span><ArrowRight className="size-4" />
              </button>
              <p className="text-center text-xs text-slate-400">Already have an account? <Link href={`/login?redirect=${encodeURIComponent(`/onboarding${initialUrl ? `?url=${encodeURIComponent(initialUrl)}` : ""}`)}`} className="font-semibold text-purple-300 hover:text-purple-200">Sign in</Link></p>
            </form>
          </div>
        )}

        {/* STEP 2: TARGET DOMAIN */}
        {currentStep === 2 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-10 backdrop-blur-xl shadow-2xl">
            <form onSubmit={handleWebsiteSubmit} className="space-y-6">
              <div>
                <label htmlFor="website-url" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Company or Product Website URL
                </label>

                {/* Fully Translucent BorderBeam URL Search Bar with Corner Lighting */}
                <div className="relative mt-3">
                  <BorderBeam
                    size="md"
                    colorVariant="colorful"
                    borderRadius={20}
                    className="w-full"
                  >
                    <div className="group/field relative flex w-full items-center rounded-[20px] border border-white/15 bg-[#0d0d16]/40 p-1.5 backdrop-blur-2xl transition-all hover:bg-[#0d0d16]/50 focus-within:border-purple-400/50 focus-within:bg-[#0d0d16]/60 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)]">
                      {/* Corner Lighting - Soft Internal Ambient Glow Pools */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[20px]"
                      >
                        <div className="absolute -top-3 -left-3 size-12 rounded-full bg-purple-500/25 blur-md transition-all duration-300 group-hover/field:bg-purple-500/35 group-focus-within/field:bg-purple-500/45" />
                        <div className="absolute -top-3 -right-3 size-12 rounded-full bg-indigo-500/20 blur-md transition-all duration-300 group-hover/field:bg-indigo-500/30 group-focus-within/field:bg-indigo-500/40" />
                        <div className="absolute -bottom-3 -left-3 size-12 rounded-full bg-purple-600/20 blur-md transition-all duration-300 group-hover/field:bg-purple-600/30 group-focus-within/field:bg-purple-600/40" />
                        <div className="absolute -bottom-3 -right-3 size-12 rounded-full bg-cyan-400/25 blur-md transition-all duration-300 group-hover/field:bg-cyan-400/35 group-focus-within/field:bg-cyan-400/45" />
                      </div>

                      {/* Globe Icon */}
                      <div className="pointer-events-none relative z-10 pl-3.5 pr-2 text-purple-400 flex items-center">
                        <Globe className="size-5" />
                      </div>

                      {/* Translucent URL Input (NO WHITE BAR) */}
                      <input
                        id="website-url"
                        type="text"
                        required
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Enter your website URL (e.g. stripe.com)"
                        className="relative z-10 h-12 w-full flex-1 border-0 !bg-transparent px-2 text-sm sm:text-base font-normal text-white placeholder-slate-400 outline-none transition-all tracking-[0.012em]"
                        style={{ backgroundColor: "transparent" }}
                      />

                      {/* Submit CTA button inside the translucent capsule */}
                      <button
                        type="submit"
                        className="relative z-10 group inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 px-5 sm:px-6 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all hover:brightness-110 active:scale-95 shrink-0"
                      >
                        <span>Analyze</span>
                        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </button>
                    </div>
                  </BorderBeam>
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                  <span>Quick pick:</span>
                  {["stripe.com", "linear.app", "ramp.com", "vercel.com"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setUrl(`https://${d}`)}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300 hover:border-purple-500/50 hover:bg-white/10 cursor-pointer transition-colors"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="company-name" className="block text-xs font-bold uppercase tracking-wider text-slate-300">Company / organization name</label>
                <input id="company-name" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} minLength={2} maxLength={120} placeholder={suggestedName(url) || "Your company name"} className="mt-2 h-12 w-full rounded-xl border border-white/15 !bg-transparent px-4 text-sm text-white placeholder-slate-400 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
                <p className="mt-2 text-xs text-slate-400">Leave blank to use the name from your website.</p>
              </div>

              {/* What will be analyzed */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  6-Engine Evidence Crawl Queue
                </h3>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 text-xs">
                    <Search className="size-4 text-purple-400 shrink-0" />
                    <span>Company Intelligence</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 text-xs">
                    <BarChart3 className="size-4 text-purple-400 shrink-0" />
                    <span>Technical SEO Audit</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 text-xs">
                    <Bot className="size-4 text-purple-400 shrink-0" />
                    <span>GEO & AI Answer Engines</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 text-xs">
                    <Compass className="size-4 text-purple-400 shrink-0" />
                    <span>Competitor Landscape</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 text-xs">
                    <Users className="size-4 text-purple-400 shrink-0" />
                    <span>Audience ICP Profiling</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3 text-xs">
                    <FileText className="size-4 text-purple-400 shrink-0" />
                    <span>Content Strategy Roadmap</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-purple-600 px-7 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all hover:bg-purple-500 active:scale-95 cursor-pointer"
                >
                  <span>Continue to AI Provider</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: PROVIDER SELECTION */}
        {currentStep === 3 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-10 backdrop-blur-xl shadow-2xl">
            <form onSubmit={handleProviderSubmit} className="space-y-8">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Select Your AI Provider (Bring Your Own Key)
                </label>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" role="radiogroup" aria-label="AI provider">
                  {PROVIDERS.map((prov) => {
                    const isSelected = selectedProvider === prov.id;
                    return (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => { setSelectedProvider(prov.id); setModel(prov.recommendedModel); setApiKey(""); setError(""); }}
                        role="radio"
                        aria-checked={isSelected}
                        className={`relative flex cursor-pointer items-center gap-4 rounded-2xl border p-5 transition-all ${
                          isSelected
                            ? "border-purple-500 bg-purple-950/20 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/50"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                        }`}
                      >
                        {/* Real Provider SVG Logo Container */}
                        <div className="flex size-13 shrink-0 items-center justify-center rounded-xl bg-white/10 p-2.5 backdrop-blur-md border border-white/10">
                          <Image
                            src={prov.logo}
                            alt={`${prov.name} logo`}
                            width={34}
                            height={34}
                            className="size-full object-contain"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white">{prov.name}</h3>
                            {isSelected && (
                              <span className="flex size-4 items-center justify-center rounded-full bg-purple-500 text-white">
                                <Check className="size-3 stroke-[3]" />
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-purple-300 font-medium">{prov.models}</p>
                          <p className="mt-1 text-[11px] text-slate-400 truncate">{prov.hint}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* API Key Input */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="api-key" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    {currentProviderObj.name} API Key
                  </label>
                  <span className="text-[11px] text-purple-400 font-medium">Recommended: {currentProviderObj.recommendedModel}</span>
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <Key className="size-4 text-purple-400" />
                  </div>
                  <input
                    id="api-key"
                    type="password"
                    autoComplete="off"
                    required={connectedProvider !== selectedProvider}
                    minLength={10}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={connectedProvider === selectedProvider ? `Leave blank to reuse ${verifiedProvider?.preview ?? "your verified key"}` : `Paste your ${currentProviderObj.name} key`}
                    className="h-12 w-full rounded-xl border border-white/15 !bg-transparent px-4 pl-11 text-xs font-mono text-white placeholder-slate-400 outline-none transition-all focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    style={{ backgroundColor: "transparent" }}
                  />
                </div>

                <div>
                  <label htmlFor="ai-model" className="block text-xs font-bold uppercase tracking-wider text-slate-300">Model</label>
                  <input id="ai-model" type="text" required minLength={2} maxLength={120} value={model} onChange={(e) => setModel(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/15 !bg-transparent px-4 text-xs font-mono text-white outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20" />
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Lock className="size-3.5 text-emerald-400 shrink-0" />
                  <span>
                    Zero-Trust: Your key is AES-256 encrypted at rest in your workspace and never shared with anyone.
                  </span>
                </div>
              </div>

              {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => { setError(""); setCurrentStep(2); }}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 cursor-pointer"
                >
                  <ArrowLeft className="size-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-purple-600 px-7 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all hover:bg-purple-500 active:scale-95 cursor-pointer"
                >
                  <span>{pending ? "Verifying provider…" : connectedProvider === selectedProvider && connectedModel === model && !apiKey ? "Continue with saved provider" : "Verify & continue"}</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: REVIEW & LAUNCH */}
        {currentStep === 4 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:p-10 backdrop-blur-xl shadow-2xl">
            <div className="space-y-6">
              <div className="rounded-xl border border-purple-500/30 bg-purple-950/15 p-6 backdrop-blur-md">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="size-4 text-purple-400" />
                  Ready to Synthesize Marketing Intelligence
                </h3>
                <p className="mt-1.5 text-xs text-slate-300 leading-relaxed">
                  We will crawl {url} across 20 public endpoints and initialize your AI CMO workspace powered by {currentProviderObj.name}.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-white/10 pt-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Website</span>
                    <p className="mt-1 text-xs font-semibold text-white truncate">{url}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI Provider</span>
                    <div className="mt-1 flex items-center gap-2">
                      <Image
                        src={currentProviderObj.logo}
                        alt={currentProviderObj.name}
                        width={18}
                        height={18}
                        className="object-contain"
                      />
                      <span className="text-xs font-semibold text-white">{currentProviderObj.name}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Workspace</span>
                    <p className="mt-1 text-xs font-semibold text-white">{companyName || "Marketing Team"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Deliverables generated in this workspace
                </h4>
                <ul className="mt-3 space-y-2 text-xs text-slate-400">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-purple-400" />
                    <span>6 Foundation Intelligence Documents (Positioning, SEO, GEO, Competitors, ICPs, Content)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-purple-400" />
                    <span>12+ Specialist Agents with access to company ground truth</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-purple-400" />
                    <span>Branded PDF, PPTX presentation decks, and operational XLSX workbooks</span>
                  </li>
                </ul>
              </div>

              {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{error}</p>}

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
                >
                  <ArrowLeft className="size-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  disabled={pending}
                  onClick={handleFinalLaunch}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 px-8 text-sm font-semibold text-white shadow-xl shadow-purple-600/30 transition-all hover:brightness-110 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <span>{pending ? "Starting analysis…" : "Launch Workspace Analysis"}</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Standard Footer */}
      <SiteFooter />
    </div>
  );
}

export function OnboardingFlow({ authenticated, verifiedProvider }: { authenticated: boolean; verifiedProvider: VerifiedProvider }) {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[#0a0a0f]" />}>
      <OnboardingContent authenticated={authenticated} verifiedProvider={verifiedProvider} />
    </React.Suspense>
  );
}
