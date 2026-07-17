import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/api/context";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  // SCR-002: 既にワークスペースがあるユーザーが/onboardingへ来た場合 → SCR-003へリダイレクト
  if (ctx.workspace) redirect("/app");
  return <OnboardingWizard />;
}
