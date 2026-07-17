import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { findOrCreateCompanyByName } from "@/lib/services/companyService";
import type { Prisma } from "@prisma/client";

export async function listContacts(workspaceId: string, q?: string) {
  const contacts = await prisma.contact.findMany({
    where: {
      workspaceId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { company: true, _count: { select: { dealLinks: true } } },
  });
  return contacts.map((c) => ({ ...c, dealCount: c._count.dealLinks }));
}

export async function getContactById(workspaceId: string, id: string) {
  const contact = await prisma.contact.findFirst({
    where: { id, workspaceId },
    include: { company: true },
  });
  if (!contact) throw Errors.notFound("コンタクト");
  const deals = await prisma.deal.findMany({
    where: { workspaceId, contacts: { some: { contactId: id } } },
    include: { stage: true },
  });
  const activities = await prisma.activity.findMany({
    where: { workspaceId, dealId: { in: deals.map((d) => d.id) } },
    orderBy: { occurredAt: "desc" },
    take: 20,
  });
  return { contact, company: contact.company, deals, activities };
}

export async function createContact(
  workspaceId: string,
  data: { name: string; email: string; title?: string; companyId?: string; companyName?: string },
) {
  const existing = await prisma.contact.findFirst({ where: { workspaceId, email: data.email } });
  if (existing) throw Errors.conflict("このメールは登録済みです");

  let companyId = data.companyId ?? null;
  if (!companyId && data.companyName) {
    const company = await prisma.$transaction((tx) =>
      findOrCreateCompanyByName(tx, workspaceId, data.companyName as string),
    );
    companyId = company.id;
  }

  return prisma.contact.create({
    data: {
      workspaceId,
      name: data.name,
      email: data.email,
      title: data.title ?? null,
      companyId,
    },
    include: { company: true },
  });
}

export async function updateContact(
  workspaceId: string,
  id: string,
  data: { name?: string; email?: string; title?: string | null; companyId?: string | null },
) {
  const existing = await prisma.contact.findFirst({ where: { id, workspaceId } });
  if (!existing) throw Errors.notFound("コンタクト");
  if (data.email) {
    const dupe = await prisma.contact.findFirst({
      where: { workspaceId, email: data.email, NOT: { id } },
    });
    if (dupe) throw Errors.conflict("このメールは登録済みです");
  }
  return prisma.contact.update({ where: { id }, data });
}

/** Used by NEW_DEAL / NEW_CONTACT materialization: match by email, else create. */
export async function findOrCreateContactForProposal(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  params: { name: string; email: string; title?: string; companyId?: string | null },
) {
  const existing = await tx.contact.findFirst({ where: { workspaceId, email: params.email } });
  if (existing) return existing;
  return tx.contact.create({
    data: {
      workspaceId,
      name: params.name,
      email: params.email,
      title: params.title ?? null,
      companyId: params.companyId ?? null,
    },
  });
}
