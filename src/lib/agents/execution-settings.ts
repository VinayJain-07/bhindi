import "server-only";

import type { AgentType } from "@prisma/client";
import { db } from "@/lib/db";

export type AgentExecutionSettings = { instructions: string | null; config: Record<string, unknown> };

// Discovery endpoints can run outside the generic agent runner. Keep the
// persisted enable switch authoritative at that shared boundary as well.
export async function requireEnabledAgent(companyId: string, agentType: AgentType): Promise<AgentExecutionSettings> {
  const agentConfig = await db.agentConfig.findUnique({ where: { companyId_agentType: { companyId, agentType } } });
  if (agentConfig?.enabled === false) throw new Error(`${agentType} is disabled in Agent Settings.`);
  return {
    instructions: agentConfig?.instructions?.trim() || null,
    config: agentConfig?.config && typeof agentConfig.config === "object" && !Array.isArray(agentConfig.config)
      ? agentConfig.config as Record<string, unknown>
      : {},
  };
}
