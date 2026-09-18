import { describe, expect, it, vi } from "vitest";
import { runWithAuditTimeout } from "./runtime";

describe("Lighthouse overall timeout", () => {
  it("aborts an audit and returns the recoverable TIMEOUT code", async () => {
    vi.useFakeTimers();
    let observedAbort = false;
    const audit = runWithAuditTimeout((signal) => new Promise<never>((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        observedAbort = true;
        reject(new Error("browser operation aborted"));
      }, { once: true });
    }), 25);
    const rejection = expect(audit).rejects.toMatchObject({ code: "TIMEOUT" });

    await vi.advanceTimersByTimeAsync(25);
    await rejection;
    expect(observedAbort).toBe(true);
    vi.useRealTimers();
  });

  it("rejects even when the underlying browser operation ignores abort", async () => {
    vi.useFakeTimers();
    const audit = runWithAuditTimeout(() => new Promise<never>(() => undefined), 25);
    const rejection = expect(audit).rejects.toMatchObject({ code: "TIMEOUT" });

    await vi.advanceTimersByTimeAsync(25);
    await rejection;
    vi.useRealTimers();
  });
});
