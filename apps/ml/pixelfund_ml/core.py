from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from math import log
from typing import Any, Iterable

HORIZONS = ("SHORT_1_3D", "SWING_5_20D", "LONG_1_3M")
_HORIZON_DAYS = {"SHORT_1_3D": 3, "SWING_5_20D": 20, "LONG_1_3M": 63}
_HOLD_BANDS = {"SHORT_1_3D": 2.0, "SWING_5_20D": 4.0, "LONG_1_3M": 7.0}


def label_forward_outcome(candles: list[dict[str, Any]], as_of_date: str, horizon: str) -> dict[str, Any] | None:
    sorted_candles = sorted(
        [item for item in candles if item.get("date") and _finite_positive(item.get("close"))],
        key=lambda item: str(item["date"]),
    )
    start_idx = next((idx for idx, item in enumerate(sorted_candles) if item["date"] == as_of_date), -1)
    if start_idx < 0:
        return None
    end_idx = start_idx + _HORIZON_DAYS[horizon]
    if end_idx >= len(sorted_candles):
        return None

    start_close = float(sorted_candles[start_idx]["close"])
    end_close = float(sorted_candles[end_idx]["close"])
    forward_return = round(((end_close - start_close) / start_close) * 100, 2)
    band = _HOLD_BANDS[horizon]
    recommendation = "BUY" if forward_return >= band else "AVOID" if forward_return <= -band else "HOLD"
    return {
        "asOfDate": as_of_date,
        "horizon": horizon,
        "startClose": start_close,
        "endClose": end_close,
        "forwardReturnPercent": forward_return,
        "recommendation": recommendation,
    }


def calibrate_confidence(observations: Iterable[dict[str, Any]]) -> dict[str, dict[str, float | int]]:
    buckets: dict[str, dict[str, float]] = defaultdict(lambda: {"count": 0, "correct": 0, "predicted": 0.0})
    for item in observations:
        key = f"{item['agentType']}:{item['horizon']}"
        buckets[key]["count"] += 1
        buckets[key]["correct"] += 1 if item.get("wasCorrect") else 0
        buckets[key]["predicted"] += _clamp(float(item.get("predictedConfidence", 0.5)), 0, 1)

    table: dict[str, dict[str, float | int]] = {}
    for key, bucket in buckets.items():
        count = int(bucket["count"])
        accuracy = bucket["correct"] / count
        predicted = bucket["predicted"] / count
        table[key] = {
            "observations": count,
            "calibratedConfidence": round(accuracy, 2),
            "reliabilityWeight": round(_clamp(accuracy / max(0.05, predicted), 0.25, 1.25), 2),
        }
    return table


def baseline_predict(payload: dict[str, Any]) -> dict[str, Any]:
    features = payload.get("features", {})
    deterministic = payload.get("deterministicRecommendation", "HOLD")
    base_confidence = _clamp(float(payload.get("deterministicConfidence", 0.5)), 0.35, 0.9)
    data_quality = _clamp(float(features.get("dataQualityScore", 0.5)), 0, 1)
    trend_bonus = 0.04 if features.get("trendUp", 0) else -0.04 if features.get("trendDown", 0) else 0
    quality_adjusted = _clamp(base_confidence * (0.75 + data_quality * 0.25) + trend_bonus, 0.35, 0.9)

    predictions = []
    for horizon in payload.get("horizons", HORIZONS):
        probabilities = _probabilities_for(deterministic, quality_adjusted)
        recommendation = max(probabilities, key=probabilities.get)
        predictions.append(
            {
                "horizon": horizon,
                "probabilities": probabilities,
                "recommendation": recommendation,
                "calibratedConfidence": round(probabilities[recommendation], 2),
                "expectedReturnBucket": "POSITIVE" if recommendation == "BUY" else "NEGATIVE" if recommendation == "AVOID" else "NEUTRAL",
                "topFeatures": _top_features(features),
            }
        )

    return {
        "modelVersion": "baseline-shadow-v1",
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "predictions": predictions,
    }


def walk_forward_backtest(payload: dict[str, Any]) -> dict[str, Any]:
    candles = payload.get("candles", [])
    deterministic = payload.get("deterministicRecommendation", "HOLD")
    deterministic_confidence = _clamp(float(payload.get("deterministicConfidence", 0.5)), 0.35, 0.9)
    horizons = payload.get("horizons", HORIZONS)

    rows = []
    for item in candles:
        as_of_date = item.get("date")
        if not as_of_date:
            continue
        prediction = baseline_predict(
            {
                "ticker": payload.get("ticker", "UNKNOWN"),
                "generatedAt": f"{as_of_date}T00:00:00Z",
                "deterministicRecommendation": deterministic,
                "deterministicConfidence": deterministic_confidence,
                "horizons": horizons,
                "features": item.get("features", {}),
            }
        )
        for signal in prediction["predictions"]:
            label = label_forward_outcome(candles, as_of_date, signal["horizon"])
            if not label:
                continue
            rows.append(
                {
                    "asOfDate": as_of_date,
                    "horizon": signal["horizon"],
                    "prediction": signal["recommendation"],
                    "actual": label["recommendation"],
                    "forwardReturnPercent": label["forwardReturnPercent"],
                    "probabilities": signal["probabilities"],
                }
            )

    return {
        "modelVersion": "baseline-shadow-v1",
        "ticker": payload.get("ticker", "UNKNOWN"),
        "rows": rows,
        "metrics": _metrics(rows),
    }


def _metrics(rows: list[dict[str, Any]]) -> dict[str, Any]:
    by_horizon: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        by_horizon[row["horizon"]].append(row)

    return {
        horizon: _metric_summary(items)
        for horizon, items in by_horizon.items()
    }


def _metric_summary(rows: list[dict[str, Any]]) -> dict[str, float | int]:
    if not rows:
        return {
            "coverage": 0,
            "hitRate": 0,
            "averageReturnPercent": 0,
            "maxDrawdownPercent": 0,
            "brierScore": 0,
            "logLoss": 0,
        }

    correctness = [1 if row["prediction"] == row["actual"] else 0 for row in rows]
    signed_returns = [
        row["forwardReturnPercent"] if row["prediction"] == "BUY" else -row["forwardReturnPercent"] if row["prediction"] == "AVOID" else 0
        for row in rows
    ]
    equity = 0.0
    peak = 0.0
    max_drawdown = 0.0
    for value in signed_returns:
        equity += value
        peak = max(peak, equity)
        max_drawdown = min(max_drawdown, equity - peak)

    brier = 0.0
    loss = 0.0
    labels = ("BUY", "HOLD", "AVOID")
    for row in rows:
        actual = row["actual"]
        probabilities = row["probabilities"]
        for label in labels:
            target = 1 if actual == label else 0
            prob = _clamp(float(probabilities.get(label, 0)), 1e-6, 1 - 1e-6)
            brier += (prob - target) ** 2
        loss += -log(_clamp(float(probabilities.get(actual, 1e-6)), 1e-6, 1 - 1e-6))

    count = len(rows)
    return {
        "coverage": count,
        "hitRate": round(sum(correctness) / count, 4),
        "averageReturnPercent": round(sum(signed_returns) / count, 4),
        "maxDrawdownPercent": round(max_drawdown, 4),
        "brierScore": round(brier / count, 4),
        "logLoss": round(loss / count, 4),
    }


def _probabilities_for(recommendation: str, confidence: float) -> dict[str, float]:
    other = round((1 - confidence) / 2, 4)
    probs = {"BUY": other, "HOLD": other, "AVOID": other}
    probs[recommendation if recommendation in probs else "HOLD"] = round(confidence, 4)
    total = sum(probs.values())
    return {key: round(value / total, 4) for key, value in probs.items()}


def _top_features(features: dict[str, Any]) -> list[dict[str, float | str]]:
    ranked = sorted(
        ((name, float(value)) for name, value in features.items() if isinstance(value, (int, float))),
        key=lambda item: abs(item[1]),
        reverse=True,
    )[:5]
    return [{"name": name, "value": value, "contribution": round(value / 100, 4)} for name, value in ranked]


def _finite_positive(value: Any) -> bool:
    return isinstance(value, (int, float)) and value > 0


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return min(max_value, max(min_value, value))
