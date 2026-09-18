export const LIGHTHOUSE_STORAGE_MESSAGE = "Lighthouse audit storage is not initialized. Apply the database migrations, then retry.";

export function isLighthouseStorageMissing(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "P2021");
}
