ALTER TABLE "WatchlistItem" ADD COLUMN "ownerKey" TEXT NOT NULL DEFAULT 'demo';

DROP INDEX "WatchlistItem_ticker_key";

CREATE UNIQUE INDEX "WatchlistItem_ownerKey_ticker_key" ON "WatchlistItem"("ownerKey", "ticker");
