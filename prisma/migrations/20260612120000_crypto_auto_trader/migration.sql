CREATE TYPE "CryptoTraderAction" AS ENUM ('BUY', 'SELL', 'HOLD');

ALTER TABLE "Position" ALTER COLUMN "quantity" TYPE DOUBLE PRECISION USING "quantity"::DOUBLE PRECISION;
ALTER TABLE "Trade" ALTER COLUMN "quantity" TYPE DOUBLE PRECISION USING "quantity"::DOUBLE PRECISION;
ALTER TABLE "Order" ALTER COLUMN "quantity" TYPE DOUBLE PRECISION USING "quantity"::DOUBLE PRECISION;
ALTER TABLE "Order" ALTER COLUMN "filledQuantity" TYPE DOUBLE PRECISION USING "filledQuantity"::DOUBLE PRECISION;

CREATE TABLE "CryptoTraderSettings" (
    "id" TEXT NOT NULL,
    "ownerKey" TEXT NOT NULL DEFAULT 'demo',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "selectedCoins" TEXT[] DEFAULT ARRAY['BTC']::TEXT[],
    "maxTradesPerDay" INTEGER NOT NULL DEFAULT 4,
    "stopLossPercent" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "maxPortfolioPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CryptoTraderSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CryptoTraderLog" (
    "id" TEXT NOT NULL,
    "ownerKey" TEXT NOT NULL DEFAULT 'demo',
    "swedenDay" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "coinId" TEXT NOT NULL,
    "action" "CryptoTraderAction" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "reasons" JSONB NOT NULL,
    "price" DOUBLE PRECISION,
    "quantity" DOUBLE PRECISION,
    "notional" DOUBLE PRECISION,
    "tradeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CryptoTraderLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CryptoTraderSettings_ownerKey_key" ON "CryptoTraderSettings"("ownerKey");
CREATE INDEX "CryptoTraderLog_ownerKey_swedenDay_idx" ON "CryptoTraderLog"("ownerKey", "swedenDay");
CREATE INDEX "CryptoTraderLog_ownerKey_createdAt_idx" ON "CryptoTraderLog"("ownerKey", "createdAt");
CREATE INDEX "CryptoTraderLog_ownerKey_ticker_createdAt_idx" ON "CryptoTraderLog"("ownerKey", "ticker", "createdAt");
