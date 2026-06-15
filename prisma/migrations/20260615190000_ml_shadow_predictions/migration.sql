CREATE TYPE "PredictionHorizon" AS ENUM ('SHORT_1_3D', 'SWING_5_20D', 'LONG_1_3M');

CREATE TABLE "MlPrediction" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "horizon" "PredictionHorizon" NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "recommendation" "Recommendation" NOT NULL,
    "probabilities" JSONB NOT NULL,
    "calibratedConfidence" DOUBLE PRECISION NOT NULL,
    "expectedReturnBucket" TEXT NOT NULL,
    "topFeatures" JSONB NOT NULL,
    "shadowMode" BOOLEAN NOT NULL DEFAULT true,
    "errorReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MlPrediction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MlPrediction_analysisRunId_idx" ON "MlPrediction"("analysisRunId");
CREATE INDEX "MlPrediction_horizon_createdAt_idx" ON "MlPrediction"("horizon", "createdAt");

ALTER TABLE "MlPrediction" ADD CONSTRAINT "MlPrediction_analysisRunId_fkey"
  FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
