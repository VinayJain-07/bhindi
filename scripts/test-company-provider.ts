import { PrismaClient } from "@prisma/client";
import { decryptSecret } from "../src/lib/crypto";
import { getProvider } from "../src/lib/llm";

process.loadEnvFile?.(".env.local");
const db = new PrismaClient();

async function main() {
  const companyId = process.argv[2];
  const company = await db.company.findUnique({ where: { id: companyId }, include: { user: true } });
  if (!company?.user.llmProvider || !company.user.llmApiKeyEnc || !company.user.llmModel) throw new Error("Verified provider not found.");
  const output = await getProvider(company.user.llmProvider).complete({ apiKey: decryptSecret(company.user.llmApiKeyEnc), model: company.user.llmModel, messages: [{ role: "user", content: "Return a JSON object whose ok field is the string OK." }], maxTokens: 128, temperature: 0, jsonSchema: { name: "provider_check", schema: { type: "object", additionalProperties: false, properties: { ok: { type: "string" } }, required: ["ok"] } } });
  process.stdout.write(`${JSON.stringify({ provider: company.user.llmProvider, model: company.user.llmModel, response: output.slice(0, 80) })}\n`);
}

main().finally(() => db.$disconnect());
