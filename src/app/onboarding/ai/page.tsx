import { redirect } from "next/navigation";
import { AIConnectionForm } from "@/components/ai-connection-form";
import { OnboardingLayout } from "@/components/onboarding-layout";
import { requireUser } from "@/lib/auth-helpers";

export default async function AIOnboardingPage() {
  const user = await requireUser();
  if (user.llmVerifiedAt) redirect("/onboarding/company");
  return <OnboardingLayout activeStep={0}><AIConnectionForm /></OnboardingLayout>;
}
