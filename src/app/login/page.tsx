import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/api/context";
import { AuthForm } from "@/components/AuthForm";

// SCR-001: 認証済みユーザーが/loginに来た場合 → SCR-003(workspaceなければSCR-002)へリダイレクト
export default async function LoginPage() {
  const ctx = await getAuthContext();
  if (ctx) {
    redirect(ctx.workspace ? "/app" : "/onboarding");
  }
  return <AuthForm mode="login" />;
}
