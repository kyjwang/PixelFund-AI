ALTER TABLE "AnalysisRun" ADD COLUMN "ownerKey" TEXT NOT NULL DEFAULT 'demo';

CREATE INDEX "AnalysisRun_ownerKey_createdAt_idx" ON "AnalysisRun"("ownerKey", "createdAt");
CREATE INDEX "AnalysisRun_ownerKey_ticker_createdAt_idx" ON "AnalysisRun"("ownerKey", "ticker", "createdAt");
