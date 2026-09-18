import { SettingsShell } from "@/components/settings-shell";
import { AgentSettingsClient } from "@/components/agent-settings-client";
import { requireUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export default async function AgentsSettingsPage() {
  const user = await requireUser();

  const company = await db.company.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      agentConfigs: true,
    },
  });

  const redditConfig = company?.agentConfigs.find((c) => c.agentType === "REDDIT");
  const seoConfig = company?.agentConfigs.find((c) => c.agentType === "SEO");
  const xConfig = company?.agentConfigs.find((c) => c.agentType === "X");

  const redditData =
    redditConfig?.config && typeof redditConfig.config === "object" && !Array.isArray(redditConfig.config)
      ? (redditConfig.config as Record<string, unknown>)
      : {};

  const seoData =
    seoConfig?.config && typeof seoConfig.config === "object" && !Array.isArray(seoConfig.config)
      ? (seoConfig.config as Record<string, unknown>)
      : {};

  const initialConfig = {
    seoEnabled: seoConfig?.enabled ?? true,
    seoRegion: (seoData.market as string) || "United States (English)",
    redditEnabled: redditConfig?.enabled ?? true,
    redditVoice:
      redditConfig?.instructions ||
      "Sound like a helpful user, keep replies concise, avoid over-promotional language...",
    redditRegion: (redditData.searchRegion as string) || "Global (no filter)",
    prioritySubreddits: Array.isArray(redditData.customSubreddits)
      ? (redditData.customSubreddits as string[])
      : ["r/SEO", "r/agency", "r/marketing", "r/SaaS", "r/webdev"],
    searchKeywords: Array.isArray(redditData.customKeywords)
      ? (redditData.customKeywords as string[])
      : [
          "best SEO audit tool",
          "automated client SEO reporting",
          "Screaming Frog alternative",
          "how agencies automate reporting",
        ],
    xEnabled: xConfig?.enabled ?? true,
    xVoice: xConfig?.instructions || "Crisp, counter-intuitive architecture breakdowns for technical marketers.",
  };

  return (
    <SettingsShell active="Agents">
      <AgentSettingsClient
        companyId={company?.id || ""}
        initialConfig={initialConfig}
      />
    </SettingsShell>
  );
}
