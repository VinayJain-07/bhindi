import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { currentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export default async function OnboardingPage() {
  const user = await currentUser();
  if (user) {
    const company = await db.company.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { auditJobs: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    if (company?.status === "ACTIVE") redirect(`/dashboard/${company.id}`);
    if (company?.auditJobs[0]) redirect(`/onboarding/audit/${company.auditJobs[0].id}`);
  }

  const hasLiveProvider = Boolean(user?.llmVerifiedAt && user.llmApiKeyEnc && !user.demoMode);
  return <OnboardingFlow authenticated={Boolean(user)} verifiedProvider={hasLiveProvider && user ? { provider: user.llmProvider ?? "anthropic", preview: user.llmKeyPreview ?? "Saved key", model: user.llmModel ?? "" } : null} />;
}
