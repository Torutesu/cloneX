import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceContext } from "@/lib/api/context";
import { withErrorHandling } from "@/lib/api/errors";
import { listContacts, createContact } from "@/lib/services/contactService";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  title: z.string().optional(),
  companyId: z.string().optional(),
  companyName: z.string().optional(),
});

export const GET = withErrorHandling(async (req: NextRequest) => {
  const { workspace } = await requireWorkspaceContext();
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const contacts = await listContacts(workspace.id, q);
  return NextResponse.json({ contacts });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { workspace } = await requireWorkspaceContext();
  const parsed = createSchema.parse(await req.json());
  const contact = await createContact(workspace.id, parsed);
  return NextResponse.json({ contact });
});
