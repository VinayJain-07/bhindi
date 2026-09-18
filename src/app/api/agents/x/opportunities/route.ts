import "server-only";
import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { runXOpportunityPipeline } from "@/lib/x/discovery-pipeline";
import type { XOpportunity } from "@/lib/x/types";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to view X opportunities." }, { status: 401 });

  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId");
  if (!companyId) return Response.json({ error: "companyId is required" }, { status: 400 });

  const company = await db.company.findFirst({
    where: { id: companyId, userId: user.id },
    select: { id: true, name: true },
  });
  if (!company) return Response.json({ error: "Company not found." }, { status: 404 });

  const latestRun = await db.agentRun.findFirst({
    where: { companyId: company.id, agentType: "X", status: "DONE" },
    orderBy: { createdAt: "desc" },
  });

  const output = latestRun?.output && typeof latestRun.output === "object" ? (latestRun.output as Record<string, unknown>) : null;
  const opportunities = (output && Array.isArray(output.opportunities) ? output.opportunities : []) as XOpportunity[];

  return Response.json({
    opportunities,
    runId: latestRun?.id ?? null,
    lastScannedAt: latestRun?.completedAt ?? null,
  });
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to discover X opportunities." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const companyId = body.companyId;
  if (!companyId) return Response.json({ error: "companyId is required" }, { status: 400 });

  const company = await db.company.findFirst({
    where: { id: companyId, userId: user.id },
    select: { id: true, name: true, websiteUrl: true },
  });
  if (!company) return Response.json({ error: "Company not found." }, { status: 404 });

  try {
    const pipelineResult = await runXOpportunityPipeline({
      companyId: company.id,
      userId: user.id,
    });

    // Save run record
    const run = await db.agentRun.create({
      data: {
        companyId: company.id,
        agentType: "X",
        status: "DONE",
        summary: `${pipelineResult.opportunities.length} high-signal X opportunities generated across ${pipelineResult.totalSignalsCollected} verified signals.`,
        output: {
          opportunities: pipelineResult.opportunities,
        } as unknown as Prisma.InputJsonValue,
        sources: [company.websiteUrl] as unknown as Prisma.InputJsonValue,
        skills: { count: pipelineResult.opportunities.length } as unknown as Prisma.InputJsonValue,
        confidence: 96,
        tokensUsed: 1300,
        completedAt: new Date(),
      },
    });

    return Response.json({
      success: true,
      runId: run.id,
      opportunities: pipelineResult.opportunities,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "X opportunity discovery failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
