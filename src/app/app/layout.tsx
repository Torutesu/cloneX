import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/api/context";
import { listProposals } from "@/lib/services/proposalService";
import { AppShell } from "@/components/app/AppShell";
import { ToastProvider } from "@/components/ui/Toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!ctx.workspace) redirect("/onboarding");

  const { count } = (await listProposals(ctx.workspace.id, { status: "PENDING", countOnly: true })) as {
    count: number;
  };

  return (
    <ToastProvider>
      <AppShell user={ctx.user} workspace={ctx.workspace} initialReviewCount={count}>
        {children}
      </AppShell>
    </ToastProvider>
  );
}
