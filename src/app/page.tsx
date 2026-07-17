import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/api/context";

// Root entry point: routes to the right screen based on auth-guard rules
// (未ログイン→/login、ワークスペース未作成→/onboarding、それ以外→/app).
export default async function RootPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  redirect(ctx.workspace ? "/app" : "/onboarding");
}
