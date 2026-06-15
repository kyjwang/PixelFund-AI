from __future__ import annotations

from typing import Any, Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field

from .core import HORIZONS, baseline_predict, calibrate_confidence, walk_forward_backtest

Recommendation = Literal["BUY", "HOLD", "AVOID"]
PredictionHorizon = Literal["SHORT_1_3D", "SWING_5_20D", "LONG_1_3M"]

app = FastAPI(title="PixelFund AI ML Service", version="1.0.0")


class PredictRequest(BaseModel):
    ticker: str
    generatedAt: str
    deterministicRecommendation: Recommendation
    deterministicConfidence: float = Field(ge=0, le=1)
    horizons: list[PredictionHorizon] = Field(default_factory=lambda: list(HORIZONS))
    features: dict[str, Any] = Field(default_factory=dict)


class Candle(BaseModel):
    date: str
    close: float
    features: dict[str, Any] = Field(default_factory=dict)


class BacktestRequest(BaseModel):
    ticker: str
    candles: list[Candle]
    deterministicRecommendation: Recommendation = "HOLD"
    deterministicConfidence: float = Field(default=0.5, ge=0, le=1)
    horizons: list[PredictionHorizon] = Field(default_factory=lambda: list(HORIZONS))


class CalibrationObservation(BaseModel):
    agentType: str
    horizon: PredictionHorizon
    predictedConfidence: float = Field(ge=0, le=1)
    wasCorrect: bool


class CalibrationRequest(BaseModel):
    observations: list[CalibrationObservation]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict")
def predict(payload: PredictRequest) -> dict[str, Any]:
    return baseline_predict(payload.model_dump())


@app.post("/backtest/walk-forward")
def backtest_walk_forward(payload: BacktestRequest) -> dict[str, Any]:
    return walk_forward_backtest(payload.model_dump())


@app.post("/calibrate")
def calibrate(payload: CalibrationRequest) -> dict[str, Any]:
    return {"calibration": calibrate_confidence(item.model_dump() for item in payload.observations)}
