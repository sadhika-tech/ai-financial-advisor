import io, re, sys, warnings
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

warnings.filterwarnings("ignore")

ROOT        = Path(__file__).parent.parent
DATA_DIR    = ROOT / "data"
MODELS_DIR  = ROOT / "backend" / "models"
PROPHET_DIR = MODELS_DIR / "prophet"
CLEAN_CSV   = DATA_DIR / "clean_transactions.csv"
METRICS_CSV = DATA_DIR / "forecast_metrics.csv"

sys.path.insert(0, str(ROOT))

app = FastAPI(title="AI Finance Advisor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["http://localhost:3000"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

CATEGORY_RULES = [
    (r"swiggy|zomato|food|restaurant|cafe|pizza|kfc|burger|bakery",    "Food & Dining"),
    (r"uber|ola|taxi|cab|metro|train|flight|petrol|fuel|parking",       "Transport"),
    (r"amazon|flipkart|myntra|shopping|mall|store|retail|cloth|shoe",   "Shopping"),
    (r"netflix|spotify|prime|hotstar|subscription|membership",          "Subscriptions"),
    (r"electricity|water\s*bill|internet|broadband|airtel|jio|utility", "Utilities"),
    (r"rent|pg |hostel|apartment|flat\s*rent|housing",                  "Rent & Housing"),
    (r"doctor|hospital|pharmacy|medicine|clinic|dental|apollo",         "Healthcare"),
    (r"gym|yoga|fitness|workout",                                        "Fitness"),
    (r"movie|cinema|pvr|inox|bookmyshow|concert|entertainment|gaming",  "Entertainment"),
    (r"school|college|tuition|udemy|coursera|education|exam",           "Education"),
    (r"salary|payroll|income|credited\s*by\s*employer",                 "Income"),
    (r"transfer|neft|imps|upi|rtgs|paytm|gpay|phonepe",                "Transfers"),
    (r"atm|cash\s*with",                                                "Cash Withdrawal"),
    (r"emi|loan|mortgage|repayment",                                    "Loan / EMI"),
    (r"mutual\s*fund|sip|stocks?|zerodha|groww|investment|dividend",    "Investments"),
    (r"grocery|bigbasket|blinkit|zepto|dmart|vegetables|fruits",        "Groceries"),
    (r"travel|hotel|airbnb|oyo|makemytrip|holiday|resort|vacation",     "Travel"),
    (r"insurance|lic|premium|policy",                                   "Insurance"),
    (r"gift|donation|charity|ngo",                                      "Gifts & Charity"),
]

FIXED_CATEGORIES = {
    "Rent & Housing", "Loan / EMI", "Loan / Emi",
    "Insurance", "Subscriptions", "Fitness"
}

def _load_clean_data() -> pd.DataFrame:
    if not CLEAN_CSV.exists():
        raise HTTPException(
            status_code=404,
            detail="No data found. Upload a CSV first via POST /upload"
        )
    return pd.read_csv(CLEAN_CSV, parse_dates=["date"])


def _auto_categorize(description: str) -> str:
    desc = str(description).lower()
    for pattern, label in CATEGORY_RULES:
        if re.search(pattern, desc, re.I):
            return label
    return "Other"


def _clean_uploaded_df(df: pd.DataFrame) -> pd.DataFrame:
    # Detect and rename columns
    col_patterns = {
        "date"        : r"date|dt|time|day",
        "description" : r"desc|narr|merchant|payee|detail|remark|note|name",
        "amount"      : r"amount|amt|value|debit|credit|sum|inr|rs\b",
        "category"    : r"categ|label|tag|class",
        "txn_type"    : r"txn.?type|transaction.?type|dr.?cr|mode|type",
    }
    rename_map, used = {}, set()
    for canonical, pattern in col_patterns.items():
        for col in df.columns:
            if col not in used and re.search(pattern, str(col), re.I):
                rename_map[col] = canonical
                used.add(col)
                break
    df = df.rename(columns=rename_map)
    for col in ["date", "description", "amount", "category", "txn_type"]:
        if col not in df.columns:
            df[col] = None

    # Clean dates
    df["date"] = pd.to_datetime(df["date"], infer_datetime_format=True, errors="coerce")
    df = df.dropna(subset=["date"]).sort_values("date").reset_index(drop=True)

    # Clean amounts
    df["amount"] = (
        df["amount"].astype(str)
        .str.replace(r"[^\d.\-]", "", regex=True)
        .replace("", np.nan)
    )
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").abs()
    df = df.dropna(subset=["amount"])

    # Clean descriptions
    df["description"] = (
        df["description"].fillna("Unknown").astype(str)
        .str.strip().str.lower()
        .str.replace(r"\s{2,}", " ", regex=True)
    )

    # Categorize
    def assign_cat(row):
        existing = str(row.get("category", "") or "").strip()
        if existing and existing.lower() not in ("nan", "none", ""):
            return existing.title()
        return _auto_categorize(row.get("description", ""))
    df["category"] = df.apply(assign_cat, axis=1)

    # Txn type
    def infer_type(row):
        t = str(row.get("txn_type", "") or "").lower().strip()
        if "credit" in t or t == "cr":  return "credit"
        if "debit"  in t or t == "dr":  return "debit"
        if row.get("category") in {"Income", "Transfers"}: return "credit"
        return "debit"
    df["txn_type"] = df.apply(infer_type, axis=1)

    return df.drop_duplicates().reset_index(drop=True)


def _get_forecast_for_category(category: str, expenses_df: pd.DataFrame) -> dict:
    # Check reliability from saved metrics
    show_prophet = False
    if METRICS_CSV.exists():
        m   = pd.read_csv(METRICS_CSV)
        row = m[m["category"] == category]
        if not row.empty:
            show_prophet = bool(row.iloc[0].get("show_in_ui", False))

    # Average fallback (used for fixed/unreliable categories)
    def average_fallback():
        recent = (
            expenses_df[expenses_df["category"] == category]
            .groupby(expenses_df["date"].dt.to_period("M"))["amount"]
            .sum().tail(3)
        )
        avg = round(float(recent.mean()), 2) if len(recent) > 0 else 0.0
        next_months = pd.date_range(
            pd.Timestamp.today().to_period("M").to_timestamp() + pd.DateOffset(months=1),
            periods=3, freq="MS"
        )
        return {
            "method": "average_fallback",
            "predictions": [
                {"month": str(m)[:7], "amount": avg,
                 "lower": round(avg * 0.85, 2), "upper": round(avg * 1.15, 2)}
                for m in next_months
            ]
        }

    if not show_prophet or category in FIXED_CATEGORIES:
        return average_fallback()

    # Try Prophet model
    fname      = category.lower().replace(" ","_").replace("/","_").replace("&","and")
    model_path = PROPHET_DIR / f"{fname}.pkl"
    if not model_path.exists():
        return average_fallback()

    try:
        model    = joblib.load(model_path)
        future   = model.make_future_dataframe(periods=3, freq="MS")
        forecast = model.predict(future)
        future_only = forecast[forecast["ds"] > model.history["ds"].max()].head(3)
        return {
            "method": "prophet",
            "predictions": [
                {
                    "month" : str(r["ds"])[:7],
                    "amount": round(max(0.0, r["yhat"]), 2),
                    "lower" : round(max(0.0, r["yhat_lower"]), 2),
                    "upper" : round(max(0.0, r["yhat_upper"]), 2),
                }
                for _, r in future_only.iterrows()
            ]
        }
    except Exception:
        return average_fallback()

@app.get("/health")
def health():
    prophet_models = list(PROPHET_DIR.glob("*.pkl")) if PROPHET_DIR.exists() else []
    kmeans_exists  = (MODELS_DIR / "kmeans_model.pkl").exists()
    return {
        "status"      : "ok",
        "data_loaded" : CLEAN_CSV.exists(),
        "models_found": len(prophet_models) + (1 if kmeans_exists else 0),
    }


@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files accepted.")

    contents = await file.read()
    try:
        df_raw = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse CSV.")

    if df_raw.empty:
        raise HTTPException(status_code=400, detail="Uploaded CSV is empty.")

    df = _clean_uploaded_df(df_raw)
    DATA_DIR.mkdir(exist_ok=True)
    df.to_csv(CLEAN_CSV, index=False)

    expenses = df[df["txn_type"] == "debit"]
    income   = df[df["txn_type"] == "credit"]
    cat_summary = (
        expenses.groupby("category")["amount"]
        .agg(total="sum", count="count")
        .sort_values("total", ascending=False)
        .reset_index()
    )

    return {
        "message"          : "Uploaded and cleaned successfully",
        "rows_uploaded"    : len(df_raw),
        "rows_after_clean" : len(df),
        "date_range"       : {"start": str(df["date"].min().date()),
                               "end"  : str(df["date"].max().date())},
        "total_expense"    : round(float(expenses["amount"].sum()), 2),
        "total_income"     : round(float(income["amount"].sum()), 2),
        "categories"       : [
            {"category": r["category"],
             "total"   : round(float(r["total"]), 2),
             "count"   : int(r["count"])}
            for _, r in cat_summary.iterrows()
        ],
    }

@app.get("/summary")
def summary(months: int = Query(default=3, ge=1, le=36)):
    df       = _load_clean_data()
    expenses = df[df["txn_type"] == "debit"].copy()
    income   = df[df["txn_type"] == "credit"].copy()

    cutoff  = df["date"].max() - pd.DateOffset(months=months)
    recent  = expenses[expenses["date"] >= cutoff]
    prev    = expenses[
        (expenses["date"] >= cutoff - pd.DateOffset(months=months)) &
        (expenses["date"] <  cutoff)
    ]

    current_total  = float(recent["amount"].sum())
    previous_total = float(prev["amount"].sum())
    mom_pct = round((current_total - previous_total) / previous_total * 100, 1) \
              if previous_total > 0 else 0.0

    total_income = float(income[income["date"] >= cutoff]["amount"].sum())
    savings_rate = round((total_income - current_total) / total_income * 100, 1) \
                   if total_income > 0 else 0.0

    n_days    = max((recent["date"].max() - recent["date"].min()).days, 1)
    cat_break = (
        recent.groupby("category")["amount"].sum()
        .sort_values(ascending=False).reset_index()
    )

    return {
        "period_months"       : months,
        "total_spend"         : round(current_total, 2),
        "total_income"        : round(total_income, 2),
        "savings_rate"        : savings_rate,
        "mom_change_pct"      : mom_pct,
        "daily_average"       : round(current_total / n_days, 2),
        "top_category"        : cat_break.iloc[0]["category"] if len(cat_break) > 0 else "N/A",
        "transaction_count"   : len(recent),
        "category_breakdown"  : [
            {"category"  : r["category"],
             "total"     : round(float(r["amount"]), 2),
             "percentage": round(float(r["amount"]) / current_total * 100, 1)
                           if current_total > 0 else 0.0}
            for _, r in cat_break.iterrows()
        ],
    }


@app.get("/categories")
def categories(category: Optional[str] = Query(default=None)):
    df       = _load_clean_data()
    expenses = df[df["txn_type"] == "debit"].copy()

    if category:
        expenses = expenses[expenses["category"].str.lower() == category.lower()]
        if expenses.empty:
            raise HTTPException(404, f"Category '{category}' not found.")

    monthly = (
        expenses
        .groupby([expenses["date"].dt.to_period("M"), "category"])["amount"]
        .sum().reset_index()
    )
    monthly["date"] = monthly["date"].dt.to_timestamp()

    return {
        "data": [
            {"month"   : str(r["date"])[:7],
             "category": r["category"],
             "amount"  : round(float(r["amount"]), 2)}
            for _, r in monthly.sort_values("date").iterrows()
        ]
    }

@app.get("/forecast")
def forecast(category: Optional[str] = Query(default=None)):
    df       = _load_clean_data()
    expenses = df[df["txn_type"] == "debit"]
    all_cats = sorted(expenses["category"].unique().tolist())

    if category:
        if category not in all_cats:
            raise HTTPException(404, f"Category '{category}' not found.")
        return {"category": category,
                **_get_forecast_for_category(category, expenses)}

    return {
        "forecasts": {
            cat: _get_forecast_for_category(cat, expenses)
            for cat in all_cats
        }
    }

@app.get("/cluster")
def cluster():
    df       = _load_clean_data()
    expenses = df[df["txn_type"] == "debit"].copy()

    total_spend  = float(expenses["amount"].sum())
    avg_txn      = float(expenses["amount"].mean())
    cat_totals   = expenses.groupby("category")["amount"].sum()
    cat_ratios   = (cat_totals / total_spend).to_dict() if total_spend > 0 else {}

    high_spend   = int(expenses["is_high_spend_day"].sum()) \
                   if "is_high_spend_day" in expenses.columns else 0
    weekend_pct  = float(expenses["is_weekend"].mean()) \
                   if "is_weekend" in expenses.columns else 0.0

    # Rule-based persona (works without K-Means model)
    food_ratio     = cat_ratios.get("Food & Dining", 0) + cat_ratios.get("Groceries", 0)
    invest_ratio   = cat_ratios.get("Investments", 0)
    shopping_ratio = cat_ratios.get("Shopping", 0)

    if invest_ratio > 0.15:
        persona = "Smart Investor"
        desc    = "You consistently allocate well to investments. Strong long-term habits."
    elif food_ratio > 0.40:
        persona = "Foodie Spender"
        desc    = "Food & Dining dominates your spend. Meal prepping could cut costs significantly."
    elif shopping_ratio > 0.25:
        persona = "Lifestyle Spender"
        desc    = "Shopping takes a large share. Track discretionary spend weekly."
    elif high_spend < len(expenses) * 0.05:
        persona = "Disciplined Saver"
        desc    = "Steady, consistent spending with few impulse transactions. Keep it up."
    else:
        persona = "Balanced Spender"
        desc    = "Spend distributed across categories. Room to increase savings rate."

    return {
        "persona"    : persona,
        "description": desc,
        "stats": {
            "total_spend"      : round(total_spend, 2),
            "avg_transaction"  : round(avg_txn, 2),
            "txn_count"        : len(expenses),
            "weekend_spend_pct": round(weekend_pct * 100, 1),
            "high_spend_days"  : high_spend,
            "categories_used"  : expenses["category"].nunique(),
        },
        "top_categories": [
            {"category": k, "percentage": round(v * 100, 1)}
            for k, v in sorted(cat_ratios.items(), key=lambda x: -x[1])[:5]
        ],
    }

@app.get("/budget-plan")
def budget_plan(months: int = Query(default=3, ge=1, le=12)):
    df       = _load_clean_data()
    expenses = df[df["txn_type"] == "debit"].copy()
    income   = df[df["txn_type"] == "credit"].copy()

    cutoff        = df["date"].max() - pd.DateOffset(months=months)
    recent        = expenses[expenses["date"] >= cutoff]
    total_expense = float(recent["amount"].sum())
    total_income  = float(income[income["date"] >= cutoff]["amount"].sum())
    savings_rate  = round((total_income - total_expense) / total_income * 100, 1) \
                    if total_income > 0 else 0.0

    cat_monthly   = (recent.groupby("category")["amount"].sum() / months).to_dict()
    tips          = []

    # Savings rate
    if savings_rate < 10:
        tips.append({"priority": "high", "category": "Savings",
            "tip": f"Savings rate is {savings_rate}% — below 20% target. "
                   f"Cut ₹{round(total_expense*0.05/months):,}/month from discretionary spend."})
    elif savings_rate < 20:
        tips.append({"priority": "medium", "category": "Savings",
            "tip": f"Savings rate is {savings_rate}%. Small cuts in 1–2 categories gets you to 20%."})
    else:
        tips.append({"priority": "low", "category": "Savings",
            "tip": f"Savings rate is {savings_rate}% — above the 20% benchmark. Great work."})

    # Food > 30%
    food_spend = cat_monthly.get("Food & Dining", 0) + cat_monthly.get("Groceries", 0)
    food_pct   = food_spend / (total_expense / months) * 100 if total_expense > 0 else 0
    if food_pct > 30:
        tips.append({"priority": "high", "category": "Food & Dining",
            "tip": f"Food is {food_pct:.0f}% of spend (₹{food_spend:,.0f}/month). "
                   f"Target under 25% — cook 3 extra meals at home per week."})

    # Subscriptions
    sub = cat_monthly.get("Subscriptions", 0)
    if sub > 1000:
        tips.append({"priority": "medium", "category": "Subscriptions",
            "tip": f"₹{sub:,.0f}/month on subscriptions. Cancel anything unused for 30+ days."})

    # No investments
    invest = cat_monthly.get("Investments", 0)
    if invest == 0:
        tips.append({"priority": "high", "category": "Investments",
            "tip": "No investments detected. Start a SIP with ₹500/month — consistency over amount."})
    elif total_income > 0 and invest < total_income / months * 0.1:
        tips.append({"priority": "medium", "category": "Investments",
            "tip": f"Investments are ₹{invest:,.0f}/month — below recommended 10% of income."})

    # Shopping > 20%
    shop     = cat_monthly.get("Shopping", 0)
    shop_pct = shop / (total_expense / months) * 100 if total_expense > 0 else 0
    if shop_pct > 20:
        tips.append({"priority": "medium", "category": "Shopping",
            "tip": f"Shopping is {shop_pct:.0f}% of spend. Try a 48-hour rule before purchases."})

    # EMI burden > 40% of income
    emi     = cat_monthly.get("Loan / EMI", cat_monthly.get("Loan / Emi", 0))
    emi_pct = emi / (total_income / months) * 100 if total_income > 0 else 0
    if emi_pct > 40:
        tips.append({"priority": "high", "category": "Loan / EMI",
            "tip": f"EMI is {emi_pct:.0f}% of income — above safe 40%. "
                   f"Pre-pay highest-interest loan first."})

    priority_order = {"high": 0, "medium": 1, "low": 2}
    tips.sort(key=lambda x: priority_order.get(x["priority"], 3))

    return {
        "period_months": months,
        "total_income" : round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "savings_rate" : savings_rate,
        "tips"         : tips,
    }


@app.get("/anomalies")
def anomalies(
    threshold: float = Query(default=2.5),
    limit    : int   = Query(default=20, ge=1, le=100)
):
    df       = _load_clean_data()
    expenses = df[df["txn_type"] == "debit"].copy()

    if "is_high_spend_day" not in expenses.columns:
        rolling_avg = expenses["amount"].rolling(30, min_periods=1).mean()
        expenses["is_high_spend_day"] = (expenses["amount"] > rolling_avg * threshold).astype(int)

    flagged = (
        expenses[expenses["is_high_spend_day"] == 1]
        .sort_values("amount", ascending=False)
        .head(limit)
    )

    return {
        "count"    : len(flagged),
        "anomalies": [
            {"date"       : str(r["date"].date()),
             "description": str(r.get("description", "")),
             "category"   : r["category"],
             "amount"     : round(float(r["amount"]), 2)}
            for _, r in flagged.iterrows()
        ],
    }