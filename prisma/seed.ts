import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { DEFAULT_STAGES } from "../src/lib/services/pipelineService";

const prisma = new PrismaClient();

const DEMO_TOKEN_PLAINTEXT = "clonex-dev-token";

function hashToken(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log("Seeding cloneX demo data...");

  // ----- User + Workspace + Pipeline -----
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const user = await prisma.user.upsert({
    where: { email: "demo@clonex.dev" },
    update: {},
    create: { email: "demo@clonex.dev", passwordHash, name: "Demo User" },
  });

  const workspace = await prisma.workspace.create({ data: { name: "Demo Inc" } });
  await prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId: workspace.id, role: "OWNER" },
  });

  const pipeline = await prisma.pipeline.create({
    data: { workspaceId: workspace.id, name: "Sales", isDefault: true },
  });
  const stages = await Promise.all(
    DEFAULT_STAGES.map((s) =>
      prisma.stage.create({
        data: { pipelineId: pipeline.id, name: s.name, order: s.order, probability: s.probability, isWon: s.isWon, isLost: s.isLost },
      }),
    ),
  );
  const stageByName = Object.fromEntries(stages.map((s) => [s.name, s]));
  function getStage(name: (typeof DEFAULT_STAGES)[number]["name"]) {
    const stage = stageByName[name];
    if (!stage) throw new Error(`Stage ${name} not found`);
    return stage;
  }

  // ----- Companies (3) -----
  const acme = await prisma.company.create({
    data: { workspaceId: workspace.id, name: "Acme", domain: "acme.example" },
  });
  const gamma = await prisma.company.create({
    data: { workspaceId: workspace.id, name: "Gamma Inc", domain: "gamma.example" },
  });
  const delta = await prisma.company.create({
    data: { workspaceId: workspace.id, name: "Delta LLC", domain: "delta.example" },
  });

  // ----- Contacts (5) -----
  const taro = await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      name: "田中太郎",
      email: "taro@acme.example",
      title: "購買部長",
      companyId: acme.id,
    },
  });
  const misaki = await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      name: "高橋美咲",
      email: "misaki@acme.example",
      title: "経営企画",
      companyId: acme.id,
    },
  });
  const hanako = await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      name: "鈴木花子",
      email: "hanako@gamma.example",
      title: "VP of Sales",
      companyId: gamma.id,
    },
  });
  const jiro = await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      name: "佐藤次郎",
      email: "jiro@delta.example",
      title: "情シス部長",
      companyId: delta.id,
    },
  });
  await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      name: "伊藤健一",
      email: "kenichi@gamma.example",
      title: "エンジニアリング",
      companyId: gamma.id,
    },
  });

  // ----- Deals (4) -----
  const acmeDeal = await prisma.deal.create({
    data: {
      workspaceId: workspace.id,
      pipelineId: pipeline.id,
      stageId: getStage("Qualified").id,
      name: "Acme社導入",
      amount: 12000,
      currency: "USD",
      companyId: acme.id,
      contacts: { create: [{ contactId: taro.id, role: "champion" }, { contactId: misaki.id, role: "influencer" }] },
    },
  });

  const gammaDeal = await prisma.deal.create({
    data: {
      workspaceId: workspace.id,
      pipelineId: pipeline.id,
      stageId: getStage("Qualified").id,
      name: "Gamma社導入",
      amount: 8000,
      currency: "USD",
      companyId: gamma.id,
      contacts: { create: [{ contactId: hanako.id, role: "champion" }] },
    },
  });

  const deltaDeal = await prisma.deal.create({
    data: {
      workspaceId: workspace.id,
      pipelineId: pipeline.id,
      stageId: getStage("Negotiation").id,
      name: "Delta社更新",
      amount: 5000,
      currency: "USD",
      companyId: delta.id,
      contacts: { create: [{ contactId: jiro.id, role: "decision_maker" }] },
    },
  });
  // E2E-010 "stuck deals": force updatedAt to 12 days ago via raw SQL, bypassing
  // Prisma's @updatedAt auto-management which would otherwise stamp "now" on write.
  await prisma.$executeRaw`UPDATE "Deal" SET "updatedAt" = ${daysAgo(12)} WHERE id = ${deltaDeal.id}`;

  await prisma.deal.create({
    data: {
      workspaceId: workspace.id,
      pipelineId: pipeline.id,
      stageId: getStage("Lead").id,
      name: "Zeta社検討",
      amount: 3000,
      currency: "USD",
    },
  });

  // ----- Email activity on "Acme社導入" (already processed, for E2E-007 timeline) -----
  const acmeThread = await prisma.emailThread.create({
    data: { workspaceId: workspace.id, subject: "Re: Acme社導入のお見積りについて" },
  });
  const acmeEmail = await prisma.emailMessage.create({
    data: {
      threadId: acmeThread.id,
      fromEmail: taro.email,
      fromName: taro.name,
      toEmails: [user.email],
      sentAt: daysAgo(3),
      bodyText:
        "田中です。先日ご案内いただいた見積もりを社内で確認しました。概ね問題ないので、来週改めて詳細を詰めさせてください。",
      processedAt: daysAgo(3),
    },
  });
  await prisma.activity.create({
    data: {
      workspaceId: workspace.id,
      dealId: acmeDeal.id,
      type: "EMAIL",
      summary: `メール受信: ${taro.name} — 見積もり確認`,
      refId: acmeEmail.id,
      occurredAt: daysAgo(3),
    },
  });
  await prisma.activity.create({
    data: {
      workspaceId: workspace.id,
      dealId: acmeDeal.id,
      type: "SYSTEM",
      summary: "ディールを作成",
      occurredAt: daysAgo(5),
    },
  });
  await prisma.activity.create({
    data: {
      workspaceId: workspace.id,
      dealId: gammaDeal.id,
      type: "SYSTEM",
      summary: "ディールを作成",
      occurredAt: daysAgo(6),
    },
  });
  await prisma.activity.create({
    data: {
      workspaceId: workspace.id,
      dealId: deltaDeal.id,
      type: "SYSTEM",
      summary: "ディールを作成",
      occurredAt: daysAgo(20),
    },
  });

  // ----- API token (plaintext logged once here + documented in README) -----
  await prisma.apiToken.create({
    data: {
      workspaceId: workspace.id,
      name: "Dev token (seed)",
      tokenHash: hashToken(DEMO_TOKEN_PLAINTEXT),
    },
  });

  console.log("Seed complete.");
  console.log(`  Login: demo@clonex.dev / demo1234`);
  console.log(`  Workspace: ${workspace.name} (${workspace.id})`);
  console.log(`  API token (plaintext, shown once): ${DEMO_TOKEN_PLAINTEXT}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
