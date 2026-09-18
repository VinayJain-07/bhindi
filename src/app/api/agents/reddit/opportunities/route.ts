import "server-only";
import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { runRedditOpportunityPipeline } from "@/lib/reddit/discovery-pipeline";
import type { RedditActionFeedOpportunity } from "@/lib/signals/store";
import type { Prisma } from "@prisma/client";
import { isVerifiedRedditOpportunityIdentity } from "@/lib/reddit/qualifier";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to view Reddit opportunities." }, { status: 401 });

  const url = new URL(request.url);
  const companyId = url.searchParams.get("companyId");
  if (!companyId) return Response.json({ error: "companyId is required" }, { status: 400 });

  const company = await db.company.findFirst({
    where: { id: companyId, userId: user.id },
    select: { id: true, name: true },
  });
  if (!company) return Response.json({ error: "Company not found." }, { status: 404 });

  // Get the latest REDDIT AgentRun
  const latestRun = await db.agentRun.findFirst({
    where: { companyId: company.id, agentType: "REDDIT", status: "DONE" },
    orderBy: { createdAt: "desc" },
  });

  const output = latestRun?.output && typeof latestRun.output === "object" ? (latestRun.output as Record<string, unknown>) : null;
  const opportunities = ((output && Array.isArray(output.opportunities) ? output.opportunities : []) as RedditActionFeedOpportunity[])
    .filter(isVerifiedRedditOpportunityIdentity);
  const searchMap = output?.searchMap ?? null;
  const trendSignals = output?.trendSignals ?? [];

  return Response.json({
    opportunities,
    searchMap,
    trendSignals,
    runId: latestRun?.id ?? null,
    lastScannedAt: latestRun?.completedAt ?? null,
  });
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to discover Reddit opportunities." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const companyId = body.companyId;
  if (!companyId) return Response.json({ error: "companyId is required" }, { status: 400 });

  const company = await db.company.findFirst({
    where: { id: companyId, userId: user.id },
    select: { id: true, name: true, websiteUrl: true },
  });
  if (!company) return Response.json({ error: "Company not found." }, { status: 404 });

  try {
    const pipelineResult = await runRedditOpportunityPipeline({
      companyId: company.id,
      userId: user.id,
    });

    // Save run record
    const run = await db.agentRun.create({
      data: {
        companyId: company.id,
        agentType: "REDDIT",
        status: "DONE",
        summary: `${pipelineResult.opportunities.length} high-intent Reddit opportunities discovered across ${pipelineResult.searchMap.allQueries.length} query families.`,
        output: {
          opportunities: pipelineResult.opportunities,
          searchMap: pipelineResult.searchMap,
          trendSignals: pipelineResult.trendSignals,
        } as unknown as Prisma.InputJsonValue,
        sources: Array.from(new Set(pipelineResult.opportunities.map((o) => o.sourceUrl))) as unknown as Prisma.InputJsonValue,
        skills: { count: pipelineResult.searchMap.allQueries.length } as unknown as Prisma.InputJsonValue,
        confidence: 94,
        tokensUsed: 1200,
        completedAt: new Date(),
      },
    });

    return Response.json({
      success: true,
      runId: run.id,
      opportunities: pipelineResult.opportunities,
      searchMap: pipelineResult.searchMap,
      trendSignals: pipelineResult.trendSignals,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reddit opportunity discovery failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
