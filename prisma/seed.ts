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

  const watchlist = ["AAPL", "MSFT", "NVDA", "TSLA"];
  for (const ticker of watchlist) {
    await prisma.watchlistItem.upsert({
      where: { ownerKey_ticker: { ownerKey: account.ownerKey, ticker } },
      create: { ownerKey: account.ownerKey, ticker },
      update: {}
    });
  }

  const priorRun = await prisma.analysisRun.findFirst();
  if (!priorRun) {
    await prisma.analysisRun.create({
      data: {
        ticker: "AAPL",
        status: "COMPLETED",
        finalRec: "HOLD",
        finalSummary: "Seeded sample recommendation for demo UX",
        recommendations: {
          create: [
            {
              agentType: "TECHNICAL_ANALYST",
              status: "COMPLETED",
              summary: "Trend is neutral in seeded dataset",
              confidence: 0.58,
              recommendation: "HOLD",
              reasons: ["Seeded data"] as any
            },
            {
              agentType: "NEWS_ANALYST",
              status: "COMPLETED",
              summary: "News sentiment mixed",
              confidence: 0.54,
              recommendation: "HOLD",
              reasons: ["Seeded data"] as any
            },
            {
              agentType: "FUNDAMENTALS_ANALYST",
              status: "COMPLETED",
              summary: "Valuation near fair value",
              confidence: 0.61,
              recommendation: "HOLD",
              reasons: ["Seeded data"] as any
            },
            {
              agentType: "RISK_ANALYST",
              status: "COMPLETED",
              summary: "Risk profile moderate",
              confidence: 0.63,
              recommendation: "HOLD",
              reasons: ["Seeded data"] as any
            },
            {
              agentType: "PORTFOLIO_MANAGER",
              status: "COMPLETED",
              summary: "Balanced signals suggest HOLD",
              confidence: 0.59,
              recommendation: "HOLD",
              reasons: ["Seeded consensus"] as any
            }
          ]
        }
      }
    });
  }

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
