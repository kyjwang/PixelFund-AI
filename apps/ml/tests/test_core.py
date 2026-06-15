import unittest

from pixelfund_ml.core import (
    HORIZONS,
    baseline_predict,
    calibrate_confidence,
    label_forward_outcome,
)


class CoreTests(unittest.TestCase):
    def test_horizons_are_stable(self):
        self.assertEqual(HORIZONS, ("SHORT_1_3D", "SWING_5_20D", "LONG_1_3M"))

    def test_label_forward_outcome_uses_requested_horizon(self):
        candles = [
            {"date": "2026-01-01", "close": 100},
            {"date": "2026-01-02", "close": 101},
            {"date": "2026-01-03", "close": 102},
            {"date": "2026-01-04", "close": 106},
            {"date": "2026-01-05", "close": 120},
        ]

        label = label_forward_outcome(candles, "2026-01-01", "SHORT_1_3D")

        self.assertEqual(label["recommendation"], "BUY")
        self.assertEqual(label["endClose"], 106)
        self.assertEqual(label["forwardReturnPercent"], 6.0)

    def test_calibration_reduces_overconfident_signal(self):
        table = calibrate_confidence(
            [
                {"agentType": "TECHNICAL_ANALYST", "horizon": "SWING_5_20D", "predictedConfidence": 0.8, "wasCorrect": True},
                {"agentType": "TECHNICAL_ANALYST", "horizon": "SWING_5_20D", "predictedConfidence": 0.8, "wasCorrect": False},
                {"agentType": "TECHNICAL_ANALYST", "horizon": "SWING_5_20D", "predictedConfidence": 0.8, "wasCorrect": False},
                {"agentType": "TECHNICAL_ANALYST", "horizon": "SWING_5_20D", "predictedConfidence": 0.8, "wasCorrect": True},
            ]
        )

        entry = table["TECHNICAL_ANALYST:SWING_5_20D"]
        self.assertEqual(entry["observations"], 4)
        self.assertLess(entry["calibratedConfidence"], 0.8)
        self.assertLess(entry["reliabilityWeight"], 1)

    def test_baseline_predict_returns_all_horizons(self):
        result = baseline_predict(
            {
                "ticker": "AAPL",
                "deterministicRecommendation": "BUY",
                "deterministicConfidence": 0.7,
                "horizons": list(HORIZONS),
                "features": {
                    "quoteChangePercent": 1.2,
                    "trendUp": 1,
                    "dataQualityScore": 0.9,
                },
            }
        )

        self.assertEqual(result["modelVersion"], "baseline-shadow-v1")
        self.assertEqual([item["horizon"] for item in result["predictions"]], list(HORIZONS))
        self.assertEqual(result["predictions"][0]["recommendation"], "BUY")


if __name__ == "__main__":
    unittest.main()
