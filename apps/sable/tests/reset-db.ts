// テスト用DBリセット: 依存順に全行削除(ローカル開発DB専用)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.insightReport.deleteMany(),
    prisma.qualification.deleteMany(),
    prisma.sessionEvent.deleteMany(),
    prisma.transcriptTurn.deleteMany(),
    prisma.knowledgeGap.deleteMany(),
    prisma.session.deleteMany(),
    prisma.demoStep.deleteMany(),
    prisma.demoScenario.deleteMany(),
    prisma.knowledgeNode.deleteMany(),
    prisma.source.deleteMany(),
    prisma.persona.deleteMany(),
    prisma.aiEmployee.deleteMany(),
    prisma.user.deleteMany(),
  ]);
  console.log("DB cleaned");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
