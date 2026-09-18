import "server-only";
import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { runInstagramOpportunityPipeline } from "@/lib/instagram/discovery-pipeline";
import type { InstagramOpportunity } from "@/lib/instagram/types";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to view Instagram opportunities." }, { status: 401 });

  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId");
  if (!companyId) return Response.json({ error: "companyId is required" }, { status: 400 });

  const company = await db.company.findFirst({
    where: { id: companyId, userId: user.id },
    select: { id: true, name: true },
  });
  if (!company) return Response.json({ error: "Company not found." }, { status: 404 });

  // Get the latest INSTAGRAM AgentRun
  const latestRun = await db.agentRun.findFirst({
    where: { companyId: company.id, agentType: "INSTAGRAM", status: "DONE" },
    orderBy: { createdAt: "desc" },
  });

  const output = latestRun?.output && typeof latestRun.output === "object" ? (latestRun.output as Record<string, unknown>) : null;
  const opportunities = (output && Array.isArray(output.opportunities) ? output.opportunities : []) as InstagramOpportunity[];
  const opportunityMap = output?.opportunityMap ?? null;

  return Response.json({
    opportunities,
    opportunityMap,
    runId: latestRun?.id ?? null,
    lastScannedAt: latestRun?.completedAt ?? null,
  });
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to discover Instagram opportunities." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const companyId = body.companyId;
  if (!companyId) return Response.json({ error: "companyId is required" }, { status: 400 });

  const company = await db.company.findFirst({
    where: { id: companyId, userId: user.id },
    select: { id: true, name: true, websiteUrl: true },
  });
  if (!company) return Response.json({ error: "Company not found." }, { status: 404 });

  try {
    const pipelineResult = await runInstagramOpportunityPipeline({
      companyId: company.id,
      userId: user.id,
    });

    // Save run record
    const run = await db.agentRun.create({
      data: {
        companyId: company.id,
        agentType: "INSTAGRAM",
        status: "DONE",
        summary: `${pipelineResult.opportunities.length} Instagram opportunities generated across ${pipelineResult.opportunityMap.themes.length} strategic themes.`,
        output: {
          opportunities: pipelineResult.opportunities,
          opportunityMap: pipelineResult.opportunityMap,
        } as unknown as Prisma.InputJsonValue,
        sources: [company.websiteUrl] as unknown as Prisma.InputJsonValue,
        skills: { count: pipelineResult.opportunityMap.themes.length } as unknown as Prisma.InputJsonValue,
        confidence: 95,
        tokensUsed: 1400,
        completedAt: new Date(),
      },
    });

    return Response.json({
      success: true,
      runId: run.id,
      opportunities: pipelineResult.opportunities,
      opportunityMap: pipelineResult.opportunityMap,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Instagram opportunity discovery failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
