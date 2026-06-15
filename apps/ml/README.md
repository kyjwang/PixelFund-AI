# PixelFund AI ML Service

FastAPI research service for shadow-mode stock analysis predictions, backtesting, and confidence calibration.

The Nest API remains the deterministic source of truth. This service records horizon-level ML signals in shadow mode until out-of-sample metrics beat the deterministic baseline.

## Local Setup

```bash
cd apps/ml
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm run dev --workspace @pixelfund/ml
```

Service defaults to port `4100`.

## Endpoints

- `POST /predict` returns horizon probabilities, expected return bucket, calibrated confidence, model version, and top feature contributions.
- `POST /backtest/walk-forward` labels historical candles with time-aware forward outcomes and summarizes hit rate, average return, drawdown, Brier score, log loss, and coverage.
- `POST /calibrate` creates agent/horizon calibration tables from historical observations.

The first implementation uses a deterministic shadow baseline so the API contract, data capture, and evaluation loop are stable before adding trained LightGBM models and MLflow model promotion.
