import "server-only";
import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import type { AgentType, Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId");

  const company = companyId
    ? await db.company.findFirst({ where: { id: companyId, userId: user.id } })
    : await db.company.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });

  if (!company) return Response.json({ error: "Company not found" }, { status: 404 });

  const configs = await db.agentConfig.findMany({
    where: { companyId: company.id },
  });

  return Response.json({
    companyId: company.id,
    configs,
  });
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { companyId, agentType, enabled, instructions, config } = body;

  if (!companyId || !agentType) {
    return Response.json({ error: "companyId and agentType are required" }, { status: 400 });
  }

  const company = await db.company.findFirst({
    where: { id: companyId, userId: user.id },
    select: { id: true },
  });
  if (!company) return Response.json({ error: "Company not found" }, { status: 404 });

  const existing = await db.agentConfig.findUnique({
    where: {
      companyId_agentType: {
        companyId: company.id,
        agentType: agentType as AgentType,
      },
    },
  });

  const mergedConfig = {
    ...(existing?.config && typeof existing.config === "object" && !Array.isArray(existing.config) ? (existing.config as Record<string, unknown>) : {}),
    ...(config && typeof config === "object" && !Array.isArray(config) ? config : {}),
  } as Prisma.InputJsonValue;

  const result = await db.agentConfig.upsert({
    where: {
      companyId_agentType: {
        companyId: company.id,
        agentType: agentType as AgentType,
      },
    },
    create: {
      companyId: company.id,
      agentType: agentType as AgentType,
      enabled: enabled !== undefined ? Boolean(enabled) : true,
      instructions: typeof instructions === "string" ? instructions : null,
      config: mergedConfig,
    },
    update: {
      enabled: enabled !== undefined ? Boolean(enabled) : undefined,
      instructions: typeof instructions === "string" ? instructions : undefined,
      config: mergedConfig,
    },
  });

  return Response.json({ success: true, config: result });
}
