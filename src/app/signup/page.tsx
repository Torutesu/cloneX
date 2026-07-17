import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/api/context";
import { AuthForm } from "@/components/AuthForm";

export default async function SignupPage() {
  const ctx = await getAuthContext();
  if (ctx) {
    redirect(ctx.workspace ? "/app" : "/onboarding");
  }
  return <AuthForm mode="signup" />;
}
