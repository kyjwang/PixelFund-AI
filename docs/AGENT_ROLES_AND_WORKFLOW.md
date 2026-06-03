# PixelFund AI Agent Roles and Team Workflow

PixelFund AI uses a two-layer agent team:

- **Analysis pipeline agents** are real backend agents. They run during `Run Analysis`, produce stored `AgentResult` records, and feed the final Portfolio Manager recommendation.
- **Pixel-office specialist characters** are frontend/game UI agents. They make the trading floor easier to understand, add personality, and support mock terminal/team-meeting interactions.

The project is an educational stock simulation. No agent places real trades or connects to a brokerage.

## Core Analysis Agents

These agents are part of the backend analysis pipeline.

| Agent ID | Display Role | Job |
|---|---|---|
| `TECHNICAL_ANALYST` | Technical Analyst | Reads price action, short-term momentum, 52-week positioning, volume behavior, and technical indicators. Produces a signal based on trend and timing evidence. |
| `NEWS_ANALYST` | News Analyst | Reviews recent headlines, sentiment, and analyst trend data. Looks for catalysts, tone shifts, and event risk. |
| `FUNDAMENTALS_ANALYST` | Fundamentals Analyst | Reviews valuation, growth, margins, profitability, balance sheet health, market cap, and quality of business evidence. |
| `RISK_ANALYST` | Risk Analyst / Risk Manager | Checks beta, volatility, drawdown, valuation risk, event risk, and data-quality warnings. Pushes back when downside risk is too high. |
| `BULL_RESEARCHER` | Bull Researcher | Builds the strongest upside case from completed specialist evidence. Focuses on why the trade could work. |
| `BEAR_RESEARCHER` | Bear Researcher | Builds the strongest downside case from weak evidence, valuation concerns, risk signals, or unsupported data. Focuses on what could go wrong. |
| `TRADER_AGENT` | Trader Agent | Converts the analyst debate into a simulated trade plan: action, sizing hint, entry rationale, invalidation point, and holding horizon. |
| `AGGRESSIVE_RISK` | Aggressive Risk | Reviews the trade from an opportunity-first risk posture. More willing to accept volatility when upside is strong. |
| `NEUTRAL_RISK` | Neutral Risk | Reviews the trade from a balanced risk posture. Weighs reward, uncertainty, and evidence quality evenly. |
| `CONSERVATIVE_RISK` | Conservative Risk | Reviews the trade from a capital-preservation posture. Cares most about drawdown, weak data, and avoiding bad entries. |
| `PORTFOLIO_MANAGER` | Portfolio Manager | Final decision maker. Aggregates all completed agent opinions into the final `BUY`, `HOLD`, or `AVOID` recommendation. |

## Pixel-Office Specialist Characters

These characters appear in the UI to make the team easier to read. Some map directly to backend agents, while others are game/UI specialists that enrich the trading floor.

| Character | Role | Job in the UI |
|---|---|---|
| Tessa Trend | Technical Analyst | Represents chart reading, momentum, and price-action thinking. |
| Felix Ledger | Fundamentals Analyst | Represents valuation, financial statement quality, margins, and business strength. |
| Nia Wire | News Analyst | Represents headlines, catalysts, sentiment shifts, and analyst news. |
| Rhea Guard | Risk Manager | Represents downside control, volatility, drawdown, and sizing discipline. |
| Parker Alloc | Portfolio Manager | Represents final allocation, portfolio fit, and approval discipline. |
| Mara Globe | Macro Analyst | Represents rates, market regime, dollar strength, and broad economic context. |
| Sami Signal | Sentiment Analyst | Represents crowd psychology, social tone, and contrarian readouts. |
| Quinn Matrix | Quant Analyst | Represents factor ranking, numerical signals, and model-style scoring. |
| Cora Chain | Crypto Specialist | Represents liquidity spillover, crypto beta, and risk-asset appetite. |
| Lena Lead | Team Lead | Represents meeting coordination and turning agent input into a readable team summary. |
| Basil Breakout | Bull Researcher | Represents the strongest upside thesis and positive interpretation of evidence. |
| Bryn Redline | Bear Researcher | Represents the strongest objection, skeptical review, and downside thesis. |
| Theo Ticket | Trader Agent | Represents trade execution, timing, position sizing, and invalidation planning. |
| Axel Heat | Aggressive Risk | Represents high-conviction risk-taking when reward justifies volatility. |
| Nora Balance | Neutral Risk | Represents balanced risk review and scenario weighing. |
| Celia Lock | Conservative Risk | Represents capital preservation and strict drawdown control. |

## How the Team Works Together

### 1. Market data is collected

When the user selects a ticker, the app builds market context from:

- Quote data
- Fundamentals
- News and sentiment
- Analyst trend data
- Historical candles and technical indicators
- Data-quality status such as `LIVE`, `PARTIAL`, `UNSUPPORTED`, or `DEMO`

The agents do not treat all evidence equally. If data is partial, unsupported, or demo fallback, confidence is intentionally reduced.

### 2. Specialist analysts run first

The first stage is the four specialist analysts:

1. Technical Analyst checks price action and trend.
2. News Analyst checks headlines and analyst sentiment.
3. Fundamentals Analyst checks business quality and valuation.
4. Risk Analyst checks downside risk and evidence weakness.

Each specialist produces:

- Summary
- Recommendation: `BUY`, `HOLD`, or `AVOID`
- Confidence score
- Evidence-based reasons

### 3. Bull and Bear Researchers debate the evidence

After the specialists finish, the debate layer runs:

- **Bull Researcher** argues the strongest positive case.
- **Bear Researcher** argues the strongest negative case.

This makes the analysis less one-sided. A stock can have strong fundamentals but still face valuation risk, weak data quality, or poor timing.

### 4. Trader Agent creates a simulated plan

The Trader Agent reads the specialist and debate outputs and converts them into a practical simulated trade plan.

It focuses on:

- Action: buy, hold, or avoid
- Position size hint
- Entry rationale
- Invalidation point
- Holding horizon

The Trader Agent does not execute a trade automatically. The user still decides whether to use the trade ticket.

### 5. Risk Council reviews the plan

The Risk Council gives three separate critiques:

- **Aggressive Risk** asks whether the upside is worth accepting volatility.
- **Neutral Risk** checks whether reward and uncertainty are balanced.
- **Conservative Risk** asks whether capital should be protected instead.

This creates a clearer view of how different risk profiles would react to the same trade setup.

### 6. Portfolio Manager makes the final recommendation

The Portfolio Manager aggregates all completed agent opinions.

The final output is still deterministic and auditable:

- The model may polish wording.
- The deterministic scoring system remains the source of truth.
- The final recommendation is based on specialist evidence, debate, trade plan, risk council, confidence, and data quality.

The result becomes the final recommendation shown in the UI.

## UI Interaction Flow

### Agent Terminal

Clicking an office character opens that agent in the terminal. The terminal shows:

- Agent name
- Role
- Personality
- Current status
- Current signal
- Confidence score
- Analysis paragraph
- `Ask this agent`
- `Pin insight`

If the selected character maps to a backend analysis result, the terminal shows real backend output after analysis runs. If no backend result exists yet, it shows the designed mock personality and signal.

### Ask This Agent

When the user clicks `Ask this agent`:

1. The selected character changes to `THINKING`.
2. After a short timeout, the terminal updates with a mock analysis paragraph.
3. The character status changes to `COMPLETED`.

This is a UI interaction only. It does not change the backend recommendation.

### Pin Insight

`Pin insight` saves the current terminal insight into the Pinned Insights panel so the user can compare multiple agent comments.

### Team Meeting

When the user starts a Team Meeting:

1. Agents are activated one by one.
2. Each character briefly changes to `THINKING`.
3. The meeting log updates step by step.
4. The Team Lead prepares the final summary.

Example flow:

- Technical Analyst is checking price action.
- Fundamentals Analyst is reviewing valuation.
- News Analyst is scanning headlines.
- Risk Manager is checking downside risk.
- Bull Researcher is building the upside case.
- Bear Researcher is challenging the setup.
- Trader Agent is converting debate into a trade plan.
- Risk Council is reviewing the plan.
- Portfolio Manager is checking allocation impact.
- Team Lead is preparing the final summary.

## Design Intent

The team is designed to feel like a small pixel-art trading floor:

- Analysts gather evidence.
- Researchers debate the case.
- Trader turns evidence into a plan.
- Risk council challenges the plan.
- Portfolio Manager decides.
- Team Lead makes the process readable.

This keeps the product playful and visual while preserving a clear, evidence-based analysis pipeline.
