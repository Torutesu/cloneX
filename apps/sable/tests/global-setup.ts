import { execSync } from "node:child_process";

export default function globalSetup() {
  execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
  execSync("npx tsx tests/reset-db.ts", { stdio: "inherit" });
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
}
