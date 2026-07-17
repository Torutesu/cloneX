import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import type { Prisma } from "@prisma/client";

export async function listCompanies(workspaceId: string, q?: string) {
  const companies = await prisma.company.findMany({
    where: {
      workspaceId,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { contacts: true, deals: true } } },
  });
  return companies.map((c) => ({
    ...c,
    contactCount: c._count.contacts,
    dealCount: c._count.deals,
  }));
}

export async function getCompanyById(workspaceId: string, id: string) {
  const company = await prisma.company.findFirst({ where: { id, workspaceId } });
  if (!company) throw Errors.notFound("企業");
  const [contacts, deals] = await Promise.all([
    prisma.contact.findMany({ where: { companyId: id, workspaceId } }),
    prisma.deal.findMany({ where: { companyId: id, workspaceId }, include: { stage: true } }),
  ]);
  return { company, contacts, deals };
}

export async function createCompany(
  workspaceId: string,
  data: { name: string; domain?: string | null },
) {
  const existing = data.domain
    ? await prisma.company.findFirst({ where: { workspaceId, domain: data.domain } })
    : null;
  if (existing) throw Errors.conflict("このドメインは登録済みです");
  return prisma.company.create({
    data: { workspaceId, name: data.name, domain: data.domain ?? null },
  });
}

export async function updateCompany(
  workspaceId: string,
  id: string,
  data: { name?: string; domain?: string | null },
) {
  const existing = await prisma.company.findFirst({ where: { id, workspaceId } });
  if (!existing) throw Errors.notFound("企業");
  if (data.domain) {
    const dupe = await prisma.company.findFirst({
      where: { workspaceId, domain: data.domain, NOT: { id } },
    });
    if (dupe) throw Errors.conflict("このドメインは登録済みです");
  }
  return prisma.company.update({ where: { id }, data });
}

/** Used by AiProposal materialization (SCR-010 NEW_DEAL rule): match by domain, else create. */
export async function findOrCreateCompanyForProposal(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  params: { name: string; domain?: string | null },
) {
  if (params.domain) {
    const existing = await tx.company.findFirst({ where: { workspaceId, domain: params.domain } });
    if (existing) return existing;
  }
  return tx.company.create({
    data: { workspaceId, name: params.name, domain: params.domain ?? null },
  });
}

/** Used by NEW_CONTACT materialization: match by name (no domain available in that payload). */
export async function findOrCreateCompanyByName(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  name: string,
) {
  const existing = await tx.company.findFirst({
    where: { workspaceId, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) return existing;
  return tx.company.create({ data: { workspaceId, name, domain: null } });
}
