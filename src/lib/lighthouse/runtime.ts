import { LighthouseAuditError } from "./types";

export const LIGHTHOUSE_OVERALL_TIMEOUT_MS = 180_000;

export async function runWithAuditTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs = LIGHTHOUSE_OVERALL_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new LighthouseAuditError("TIMEOUT", "The Lighthouse audit exceeded the 180-second limit."));
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation(controller.signal), timeoutPromise]);
  } catch (error) {
    if (controller.signal.aborted) throw new LighthouseAuditError("TIMEOUT", "The Lighthouse audit exceeded the 180-second limit.");
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
