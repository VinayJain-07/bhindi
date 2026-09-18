import "server-only";
import { requireApiUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Sign in to update opportunity." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { companyId, opportunityId, action, scheduledDate, customDraft, selectedVariant } = body;

  if (!companyId || !opportunityId || !action) {
    return Response.json({ error: "Missing required fields (companyId, opportunityId, action)." }, { status: 400 });
  }
  if (!["approve", "ready", "schedule", "dismiss", "publish"].includes(action)) {
    return Response.json({ error: "Choose a valid opportunity action." }, { status: 400 });
  }
  if (action === "publish") {
    return Response.json({ error: "Publishing is not connected for X. Mark the draft ready or add a manual planning date instead." }, { status: 409 });
  }

  const company = await db.company.findFirst({
    where: { id: companyId, userId: user.id },
    select: { id: true },
  });
  if (!company) return Response.json({ error: "Company not found." }, { status: 404 });

  // Get current agent config
  const existingConfig = await db.agentConfig.findUnique({
    where: {
      companyId_agentType: {
        companyId: company.id,
        agentType: "X",
      },
    },
  });

  const currentConfig = existingConfig?.config && typeof existingConfig.config === "object" && !Array.isArray(existingConfig.config)
    ? (existingConfig.config as Record<string, unknown>)
    : {};

  const currentCompleted = Array.isArray(currentConfig.completedOpportunities)
    ? currentConfig.completedOpportunities.filter((v): v is string => typeof v === "string")
    : [];

  const currentDismissed = Array.isArray(currentConfig.dismissedOpportunities)
    ? currentConfig.dismissedOpportunities.filter((v): v is string => typeof v === "string")
    : [];

  const scheduledOpps = Array.isArray(currentConfig.scheduledOpportunities)
    ? (currentConfig.scheduledOpportunities as Array<{ opportunityId: string; date: string }>)
    : [];

  const feedbackLog = Array.isArray(currentConfig.feedbackLog)
    ? (currentConfig.feedbackLog as Array<Record<string, unknown>>)
    : [];

  let newCompleted = [...currentCompleted];
  let newDismissed = [...currentDismissed];
  let newScheduled = [...scheduledOpps];
  const newFeedback = [
    ...feedbackLog,
    {
      opportunityId,
      action,
      timestamp: new Date().toISOString(),
      details: { scheduledDate, customDraft, selectedVariant },
    },
  ];

  if (action === "approve" || action === "ready") {
    if (!newCompleted.includes(opportunityId)) {
      newCompleted.push(opportunityId);
    }
    newDismissed = newDismissed.filter((id) => id !== opportunityId);
  } else if (action === "schedule") {
    if (!newCompleted.includes(opportunityId)) {
      newCompleted.push(opportunityId);
    }
    newDismissed = newDismissed.filter((id) => id !== opportunityId);
    newScheduled = newScheduled.filter((s) => s.opportunityId !== opportunityId);
    newScheduled.push({ opportunityId, date: scheduledDate || new Date().toISOString() });
  } else if (action === "dismiss") {
    if (!newDismissed.includes(opportunityId)) {
      newDismissed.push(opportunityId);
    }
    newCompleted = newCompleted.filter((id) => id !== opportunityId);
    newScheduled = newScheduled.filter((s) => s.opportunityId !== opportunityId);
  }

  const updatedConfig = {
    ...currentConfig,
    completedOpportunities: newCompleted,
    dismissedOpportunities: newDismissed,
    scheduledOpportunities: newScheduled,
    feedbackLog: newFeedback.slice(-100),
  } as Prisma.InputJsonValue;

  await db.agentConfig.upsert({
    where: {
      companyId_agentType: {
        companyId: company.id,
        agentType: "X",
      },
    },
    create: {
      companyId: company.id,
      agentType: "X",
      config: updatedConfig,
    },
    update: {
      config: updatedConfig,
    },
  });

  return Response.json({
    success: true,
    action,
    opportunityId,
    manualPlan: action === "schedule",
  });
}
