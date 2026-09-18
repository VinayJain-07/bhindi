import { z } from "zod";
import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/crypto";
import { DEFAULT_MODELS, getProvider } from "@/lib/llm";
import type { ProviderName } from "@/lib/llm";

const schema = z.object({ provider: z.enum(["anthropic", "openai", "openrouter", "google"]), apiKey: z.string().trim().min(10).optional(), model: z.string().trim().min(2).max(120).optional() });

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to connect a provider." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Choose a provider and enter a valid API key." }, { status: 400 });
  const model = parsed.data.model || DEFAULT_MODELS[parsed.data.provider as ProviderName];
  const canReuseSavedKey = user.llmProvider === parsed.data.provider && Boolean(user.llmApiKeyEnc);
  if (!parsed.data.apiKey && !canReuseSavedKey) return Response.json({ error: "Enter an API key for the selected provider." }, { status: 400 });
  const apiKey = parsed.data.apiKey ?? decryptSecret(user.llmApiKeyEnc!);
  try {
    await getProvider(parsed.data.provider).validateKey(apiKey, model);
    const preview = parsed.data.apiKey ? maskSecret(apiKey) : user.llmKeyPreview;
    await db.user.update({ where: { id: user.id }, data: { llmProvider: parsed.data.provider, llmApiKeyEnc: parsed.data.apiKey ? encryptSecret(apiKey) : user.llmApiKeyEnc, llmKeyPreview: preview, llmModel: model, llmVerifiedAt: new Date(), demoMode: false } });
    return Response.json({ ok: true, preview, model });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The provider rejected this key." }, { status: 400 });
  }
}
