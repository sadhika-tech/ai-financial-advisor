# AI Personal Financial Advisor

An end-to-end fintech application that analyzes personal spending,
detects patterns, forecasts future expenses, and generates
personalized budget recommendations.

**Live demo**: https://ai-financial-advisor-jet.vercel.app
**Backend API**: https://ai-financial-advisor-production-b3fc.up.railway.app
---

## What it does

- Upload any bank CSV export — columns are auto-detected
- Automatically categorizes transactions using NLP regex rules
- Clusters spending behavior into personas (K-Means)
- Forecasts next 3 months of spend per category (Facebook Prophet)
- Generates prioritized budget tips based on actual patterns
- Flags anomalous transactions with an alert banner

---

## Architecture
```
CSV Upload → Data Cleaning Pipeline → ML Models → FastAPI → React Dashboard
```

| Layer    | Tech                              |
|----------|-----------------------------------|
| Data     | pandas, numpy, scikit-learn       |
| ML       | K-Means clustering, Prophet       |
| Backend  | FastAPI, uvicorn, joblib          |
| Frontend | React, Recharts, React Router     |
| Deploy   | Railway (API), Vercel (frontend)  |

---

## ML model performance

| Category      | MAPE  | Reliability |
|---------------|-------|-------------|
| Entertainment | 13.2% | High        |
| Food & Dining | 26.7% | High        |
| Fitness       | 41.9% | Medium      |
| Transport     | 58.6% | Medium      |
| Investments   | 76.6% | Low         |

Fixed categories (Rent, Subscriptions, Loan EMI) use
a 3-month average fallback — more accurate than ML for
perfectly regular payments.

## Setup after cloning

The trained models and data files are not in the repo (too large).
To regenerate them:

1. Run the data pipeline:
```bash
   python finance_data_pipeline.py
```

2. Run notebooks in order:
   - `notebooks/03_clustering.ipynb` → saves models to `backend/models/`
   - `notebooks/04_forecasting.ipynb` → saves Prophet models to `backend/models/prophet/`

3. Start the backend:
```bash
   uvicorn backend.main:app --reload --port 8000
```

---
## Run locally
```bash
# Backend
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm start
```

---

## Key learnings

- Real financial data is messy — 40% of pipeline code is cleaning
- Autocorrelation in spending patterns matters more than model choice
- Prophet works well for variable spend; fails on fixed costs — hybrid approach needed
- Feature engineering (spend ratios, lag features) matters more than algorithm selection