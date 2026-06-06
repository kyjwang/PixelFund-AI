CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'FILLED', 'PARTIALLY_FILLED', 'CANCELED', 'REJECTED', 'EXPIRED');

CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "side" "TradeSide" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "filledQuantity" INTEGER NOT NULL DEFAULT 0,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "orderType" "OrderType" NOT NULL DEFAULT 'MARKET',
    "limitPrice" DOUBLE PRECISION,
    "stopPrice" DOUBLE PRECISION,
    "averageFillPrice" DOUBLE PRECISION,
    "lastCheckedPrice" DOUBLE PRECISION,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "filledAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Trade" ADD COLUMN "orderId" TEXT;

CREATE INDEX "Order_accountId_status_createdAt_idx" ON "Order"("accountId", "status", "createdAt");
CREATE INDEX "Order_ticker_status_idx" ON "Order"("ticker", "status");
CREATE INDEX "Trade_orderId_idx" ON "Trade"("orderId");

ALTER TABLE "Order" ADD CONSTRAINT "Order_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "DemoAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
