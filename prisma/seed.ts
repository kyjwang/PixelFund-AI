import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const DEFAULT_DEMO_CASH = 100000;

async function main() {
  const existing = await prisma.demoAccount.findFirst();
  const account = existing
    ? existing
    : await prisma.demoAccount.create({
        data: { cash: DEFAULT_DEMO_CASH }
      });

  console.log(`Seed complete for account ${account.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
