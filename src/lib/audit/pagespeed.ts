import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { assertPublicUrl } from "@/lib/crawl/url-safety";

export type PageSpeedResult = {
  strategy: "mobile" | "desktop";
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
  lcp: number | null;
  fcp: number | null;
  tbt: number | null;
  cls: number | null;
  statusCode: number | null;
  responseTime: number | null;
  ttfb: number | null;
  transferSize: number | null;
  source: string;
};

type PythonTimingReceipt = PageSpeedResult & { finalUrl?: string };

function pythonExecutable() {
  if (process.env.SMARK_SPEED_PYTHON) return process.env.SMARK_SPEED_PYTHON;
  if (process.env.NODE_ENV === "production") return "python3";
  const reportPython = process.platform === "win32"
    ? path.join(process.cwd(), ".venv-report", "Scripts", "python.exe")
    : path.join(process.cwd(), ".venv-report", "bin", "python");
  return existsSync(reportPython) ? reportPython : process.platform === "win32" ? "python" : "python3";
}

function runPythonTiming(websiteUrl: string, strategy: "mobile" | "desktop"): Promise<PythonTimingReceipt> {
  const script = path.join(process.cwd(), "scripts", "simple-page-speed.py");
  return new Promise((resolve, reject) => {
    const child = spawn(/*turbopackIgnore: true*/ pythonExecutable(), [script], { cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`Python URL timing test failed${stderr.trim() ? `: ${stderr.trim().slice(-1200)}` : ` with exit code ${code}`}`));
      try { resolve(JSON.parse(stdout.trim().split(/\r?\n/).filter(Boolean).at(-1) ?? "") as PythonTimingReceipt); }
      catch { reject(new Error(`Python URL timing test returned an invalid receipt: ${stdout.slice(-600)}`)); }
    });
    child.stdin.end(JSON.stringify({ websiteUrl, strategy }));
  });
}

export async function runPageSpeed(websiteUrl: string, strategy: "mobile" | "desktop"): Promise<PageSpeedResult> {
  const publicUrl = await assertPublicUrl(websiteUrl);
  const result = await runPythonTiming(publicUrl.href, strategy);
  return {
    strategy,
    performance: result.performance,
    accessibility: null,
    bestPractices: null,
    seo: null,
    lcp: null,
    fcp: null,
    tbt: null,
    cls: null,
    statusCode: result.statusCode,
    responseTime: result.responseTime,
    ttfb: result.ttfb,
    transferSize: result.transferSize,
    source: "Python URL timing test",
  };
}
