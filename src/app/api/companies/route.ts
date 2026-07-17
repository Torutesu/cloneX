import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceContext } from "@/lib/api/context";
import { Errors, withErrorHandling } from "@/lib/api/errors";
import { listCompanies, createCompany } from "@/lib/services/companyService";

const createSchema = z.object({ name: z.string().min(1), domain: z.string().optional() });

export const GET = withErrorHandling(async (req: NextRequest) => {
  const { workspace } = await requireWorkspaceContext();
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const companies = await listCompanies(workspace.id, q);
  return NextResponse.json({ companies });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { workspace } = await requireWorkspaceContext();
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) throw Errors.validation("企業名を入力してください");
  const company = await createCompany(workspace.id, parsed.data);
  return NextResponse.json({ company });
});
