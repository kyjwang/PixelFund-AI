ALTER TABLE "CryptoTraderSettings"
ADD COLUMN "strategyMode" TEXT NOT NULL DEFAULT 'BALANCED',
ADD COLUMN "aggressiveStartedAt" TIMESTAMP(3),
ADD COLUMN "aggressiveExpiresAt" TIMESTAMP(3);
