import { redirect } from "next/navigation";
import { CompanyForm } from "@/components/company-form";
import { OnboardingLayout } from "@/components/onboarding-layout";
import { requireUser } from "@/lib/auth-helpers";

export default async function CompanyOnboardingPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const user = await requireUser();
  if (!user.llmVerifiedAt) redirect("/onboarding/ai");
  const { mode } = await searchParams;
  return <OnboardingLayout activeStep={1}><CompanyForm additional={mode === "add"} /></OnboardingLayout>;
}
