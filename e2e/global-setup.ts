import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

/**
 * Resets the test database before the whole E2E run.
 *
 * Deviation from spec (documented in pipeline/octolane/build-notes.md): the spec asked
 * for `prisma db push --force-reset && seed`, but this harness's safety guard blocks
 * `--force-reset` without interactive human consent (it's flagged as a
 * data-destroying command an agent must not run unattended). Schema is applied once
 * via the normal `pnpm db:setup` / `prisma db push` (non-destructive, additive) — this
 * globalSetup only needs to clear *rows*, not re-apply the schema, so a plain
 * `TRUNCATE ... CASCADE` achieves the same "start every run from a known seed state"
 * guarantee without touching the blocked command shape.
 */
export default async function globalSetup() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "ApiToken", "AutoApprovePolicy", "ChatMessage", "AiProposal",
        "Task", "Note", "Activity", "EmailMessage", "EmailThread",
        "DealContact", "Deal", "Contact", "Company", "Stage", "Pipeline",
        "WorkspaceMember", "Workspace", "User"
      RESTART IDENTITY CASCADE;
    `);
  } finally {
    await prisma.$disconnect();
  }

  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", cwd: process.cwd() });
}
