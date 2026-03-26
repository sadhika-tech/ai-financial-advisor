"""
Personal Finance Transaction Data Pipeline
==========================================
Handles: cleaning, normalization, categorization, feature engineering.
Input : transactions_raw.csv  (generated here if missing)
Output: clean_transactions.csv ready for ML (clustering + forecasting)

Install deps:
    pip install pandas numpy scikit-learn faker
"""

import re
import warnings
import numpy as np
import pandas as pd
from pathlib import Path

warnings.filterwarnings("ignore")

# ── CONFIG ────────────────────────────────────────────────────────────────────
RAW_CSV   = "data/transactions_raw.csv"
CLEAN_CSV = "data/clean_transactions.csv"

# ── CATEGORY RULES  (first match wins) ───────────────────────────────────────
CATEGORY_RULES = [
    (r"swiggy|zomato|uber\s*eat|food|restaurant|cafe|starbucks|domino|pizza|kfc|mcdonalds|burger|subway|diner|bistro|bakery",
     "Food & Dining"),
    (r"uber|ola|rapido|lyft|taxi|cab|metro|bus|train|irctc|flight|airline|petrol|fuel|gas\s*station|parking",
     "Transport"),
    (r"amazon|flipkart|myntra|ajio|nykaa|shopping|mall|store|retail|cloth|shoe|fashion|h&m|zara|uniqlo",
     "Shopping"),
    (r"netflix|spotify|prime|hotstar|youtube\s*premium|disney|apple\s*tv|hulu|zee5|subscription|membership",
     "Subscriptions"),
    (r"electricity|water\s*bill|gas\s*bill|internet|broadband|wifi|mobile\s*recharge|phone\s*bill|dth|airtel|jio|bsnl|utility",
     "Utilities"),
    (r"rent|pg |hostel|society\s*maintenance|apartment|flat\s*rent|housing",
     "Rent & Housing"),
    (r"doctor|hospital|pharmacy|medicine|clinic|lab\s*test|health|dental|apollo|medplus|insurance\s*health",
     "Healthcare"),
    (r"gym|yoga|fitness|sports|workout",
     "Fitness"),
    (r"movie|cinema|pvr|inox|bookmyshow|concert|ticket|entertainment|gaming|steam",
     "Entertainment"),
    (r"school|college|tuition|udemy|coursera|book|stationery|education|exam\s*fee",
     "Education"),
    (r"salary|payroll|income|credited\s*by\s*employer|direct\s*deposit",
     "Income"),
    (r"transfer|neft|imps|upi|rtgs|sent\s*to|received\s*from|paytm|gpay|phonepe|bhim",
     "Transfers"),
    (r"atm|cash\s*with",
     "Cash Withdrawal"),
    (r"emi|loan|mortgage|credit\s*card\s*payment|repayment",
     "Loan / EMI"),
    (r"mutual\s*fund|sip|stocks?|zerodha|groww|investment|dividend|ipo",
     "Investments"),
    (r"grocery|supermarket|bigbasket|blinkit|zepto|dunzo|dmart|vegetables|fruits",
     "Groceries"),
    (r"travel|hotel|booking\.com|airbnb|oyo|makemytrip|goibibo|holiday|resort|vacation",
     "Travel"),
    (r"insurance|lic|premium|policy",
     "Insurance"),
    (r"gift|donation|charity|ngo",
     "Gifts & Charity"),
]

# ── STEP 0 : SYNTHETIC DATA GENERATOR ────────────────────────────────────────
def generate_synthetic_data(n: int = 600, seed: int = 42) -> pd.DataFrame:
    """Creates a realistic messy CSV when you don't have real data yet."""
    try:
        from faker import Faker
    except ImportError:
        raise ImportError("Run:  pip install faker")

    rng  = np.random.default_rng(seed)
    fake = Faker("en_IN")
    Faker.seed(seed)

    merchants = [
        ("Swiggy order",              "Food & Dining",   120,  600),
        ("Zomato delivery",           "Food & Dining",   80,   700),
        ("Amazon purchase",           "Shopping",        200, 3000),
        ("Flipkart order",            "Shopping",        300, 2500),
        ("Uber ride",                 "Transport",       60,   400),
        ("Ola cab",                   "Transport",       50,   350),
        ("Netflix subscription",      "Subscriptions",   499,  499),
        ("Spotify Premium",           "Subscriptions",   119,  119),
        ("BigBasket groceries",       "Groceries",       300, 1500),
        ("DMart shopping",            "Groceries",       200, 1200),
        ("Airtel recharge",           "Utilities",       299,  999),
        ("Jio bill payment",          "Utilities",       299,  599),
        ("Electricity bill",          "Utilities",       500, 2500),
        ("Zerodha SIP",               "Investments",    1000, 5000),
        ("PVR cinema tickets",        "Entertainment",   200,  800),
        ("Apollo pharmacy",           "Healthcare",      100, 1500),
        ("Gym membership",            "Fitness",         500, 2000),
        ("Udemy course",              "Education",       299, 1299),
        ("OYO hotel booking",         "Travel",          800, 4000),
        ("LIC premium",               "Insurance",       500, 3000),
        ("ATM cash withdrawal",       "Cash Withdrawal", 500, 5000),
        ("EMI payment",               "Loan / EMI",     2000,10000),
        ("Salary credit",             "Income",        20000,80000),
        ("GPay transfer",             "Transfers",       500, 5000),
        ("Donation to NGO",           "Gifts & Charity", 100, 1000),
        ("Restaurant dinner",         "Food & Dining",   400, 2000),
        ("Petrol pump",               "Transport",       500, 2000),
        ("Rent payment",              "Rent & Housing", 8000,25000),
    ]

    date_formats = ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%d %b %Y"]

    rows = []
    for _ in range(n):
        merch, cat, lo, hi = merchants[rng.integers(len(merchants))]
        amount = float(rng.integers(lo, hi + 1))

        # Intentional mess
        if rng.random() < 0.04:   merch = None
        if rng.random() < 0.03:   cat   = None
        if rng.random() < 0.02:   amount = -amount
        if rng.random() < 0.015:  amount = None
        if rng.random() < 0.03:   merch = f"  {merch}  " if merch else merch

        raw_date = fake.date_between(start_date="-18M", end_date="today")
        fmt = date_formats[rng.integers(len(date_formats))]
        date_str = raw_date.strftime(fmt)
        if rng.random() < 0.01:   date_str = "not a date"

        txn_type = "debit" if (cat not in ("Income", "Transfers") or rng.random() < 0.1) else "credit"
        if rng.random() < 0.04:   txn_type = None

        rows.append({
            "date"        : date_str,
            "description" : merch,
            "amount"      : amount,
            "category"    : cat,
            "type"        : txn_type,
        })

    df = pd.DataFrame(rows)

    # Inject ~3% duplicates
    dup_idx = rng.choice(len(df), size=int(n * 0.03), replace=False)
    df = pd.concat([df, df.iloc[dup_idx]], ignore_index=True)

    return df


# ── STEP 1 : LOAD ─────────────────────────────────────────────────────────────
def load_data(path: str) -> pd.DataFrame:
    print(f"\n{'='*55}")
    print(f"  STEP 1 — Loading: {path}")
    print(f"{'='*55}")

    p = Path(path)
    if not p.exists():
        print(f"  [!] '{path}' not found — generating synthetic data ...")
        df = generate_synthetic_data(600)
        df.to_csv(path, index=False)
        print(f"  [+] Saved synthetic data  ({len(df)} rows)")
    else:
        df = pd.read_csv(path, low_memory=False)

    print(f"  Rows: {len(df):,}   Columns: {df.columns.tolist()}")
    return df


# ── STEP 2 : COLUMN DETECTION & RENAME ───────────────────────────────────────
_COL_PATTERNS = {
    "date"        : r"date|dt|time|day",
    "description" : r"desc|narr|merchant|payee|detail|remark|note|name",
    "amount"      : r"amount|amt|value|debit|credit|sum|inr|rs\b",
    "category"    : r"categ|label|tag|class",
    "txn_type"    : r"txn.?type|transaction.?type|dr.?cr|debit.?credit|mode|type",
}

def detect_and_rename(df: pd.DataFrame) -> pd.DataFrame:
    print(f"\n{'='*55}")
    print("  STEP 2 — Detecting & renaming columns")
    print(f"{'='*55}")

    rename_map = {}
    used = set()
    for canonical, pattern in _COL_PATTERNS.items():
        for col in df.columns:
            if col in used:
                continue
            if re.search(pattern, str(col), re.I):
                rename_map[col] = canonical
                used.add(col)
                print(f"  '{col}'  ->  '{canonical}'")
                break

    df = df.rename(columns=rename_map)

    for col in ["date", "description", "amount", "category", "txn_type"]:
        if col not in df.columns:
            df[col] = None
            print(f"  [+] Added missing column '{col}' (all NaN)")

    return df


# ── STEP 3 : REMOVE DUPLICATES ────────────────────────────────────────────────
def remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    print(f"\n{'='*55}")
    print("  STEP 3 — Removing duplicates")
    print(f"{'='*55}")

    before = len(df)
    df = df.drop_duplicates()
    exact = before - len(df)

    df["_amt_round"] = pd.to_numeric(df["amount"], errors="coerce").round(0)
    near_dups = df.duplicated(subset=["date", "description", "_amt_round"], keep="first")
    df = df[~near_dups]
    near = near_dups.sum()
    df = df.drop(columns=["_amt_round"])

    print(f"  Exact duplicates removed : {exact}")
    print(f"  Near duplicates removed  : {near}")
    print(f"  Rows remaining           : {len(df):,}")
    return df.reset_index(drop=True)


# ── STEP 4 : CLEAN DATES ──────────────────────────────────────────────────────
_DATE_FORMATS = [
    "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y",
    "%d %b %Y", "%d %B %Y", "%Y/%m/%d", "%b %d %Y",
    "%d-%b-%Y", "%d/%m/%y", "%m-%d-%Y",
]

def _parse_date(val):
    if pd.isna(val):
        return pd.NaT
    s = str(val).strip()
    for fmt in _DATE_FORMATS:
        try:
            return pd.to_datetime(s, format=fmt)
        except (ValueError, TypeError):
            continue
    try:
        return pd.to_datetime(s, infer_datetime_format=True)
    except Exception:
        return pd.NaT

def clean_dates(df: pd.DataFrame) -> pd.DataFrame:
    print(f"\n{'='*55}")
    print("  STEP 4 — Cleaning dates")
    print(f"{'='*55}")

    df["date"] = df["date"].apply(_parse_date)
    bad = df["date"].isna().sum()

    if bad > 0:
        pct = bad / len(df)
        if pct < 0.05:
            valid_dates = df["date"].dropna().sort_values()
            median_date = valid_dates.iloc[len(valid_dates) // 2]
            df["date"] = df["date"].fillna(median_date)
            print(f"  [~] {bad} corrupt dates imputed with median ({median_date.date()})")
        else:
            df = df.dropna(subset=["date"])
            print(f"  [x] {bad} rows with corrupt dates dropped ({pct:.1%} of data)")

    df = df.sort_values("date").reset_index(drop=True)
    print(f"  Date range: {df['date'].min().date()}  to  {df['date'].max().date()}")
    return df


# ── STEP 5 : CLEAN AMOUNTS ────────────────────────────────────────────────────
def clean_amounts(df: pd.DataFrame) -> pd.DataFrame:
    print(f"\n{'='*55}")
    print("  STEP 5 — Cleaning amounts")
    print(f"{'='*55}")

    df["amount"] = (
        df["amount"]
        .astype(str)
        .str.replace(r"[^\d.\-]", "", regex=True)
        .str.strip()
        .replace("", np.nan)
    )
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")

    null_amt = df["amount"].isna().sum()
    if null_amt:
        print(f"  [x] {null_amt} rows with missing amount dropped")
        df = df.dropna(subset=["amount"])

    neg = (df["amount"] < 0).sum()
    df["amount"] = df["amount"].abs()
    if neg:
        print(f"  [~] {neg} negative amounts converted to positive")

    mean, std = df["amount"].mean(), df["amount"].std()
    outliers = df["amount"] > mean + 4 * std
    df = df[~outliers]
    print(f"  [x] {outliers.sum()} extreme outliers removed (> mean + 4 std)")
    print(f"  Amount range : {df['amount'].min():.0f}  to  {df['amount'].max():.0f}")
    print(f"  Median amount: {df['amount'].median():.0f}")
    return df.reset_index(drop=True)


# ── STEP 6 : CLEAN DESCRIPTIONS ───────────────────────────────────────────────
def clean_descriptions(df: pd.DataFrame) -> pd.DataFrame:
    print(f"\n{'='*55}")
    print("  STEP 6 — Cleaning descriptions")
    print(f"{'='*55}")

    df["description"] = (
        df["description"]
        .fillna("Unknown")
        .astype(str)
        .str.strip()
        .str.lower()
        .str.replace(r"\b(upi|ref|no|id|txn|transaction|payment|to|from|by|via)\b", "", regex=True)
        .str.replace(r"[\*\/\-\_]{2,}", " ", regex=True)
        .str.replace(r"\s{2,}", " ", regex=True)
        .str.strip()
        .replace("", "unknown")
    )

    unknown_count = df["description"].eq("unknown").sum()
    print(f"  {unknown_count} descriptions filled as 'unknown'")
    return df


# ── STEP 7 : AUTO-CATEGORIZE ──────────────────────────────────────────────────
def categorize(df: pd.DataFrame) -> pd.DataFrame:
    print(f"\n{'='*55}")
    print("  STEP 7 — Auto-categorizing transactions")
    print(f"{'='*55}")

    def assign_category(row):
        existing = str(row.get("category", "") or "").strip()
        if existing and existing.lower() not in ("nan", "none", "unknown", ""):
            return existing.title()
        desc = str(row.get("description", "")).lower()
        for pattern, label in CATEGORY_RULES:
            if re.search(pattern, desc, re.I):
                return label
        return "Other"

    df["category"] = df.apply(assign_category, axis=1)

    print(f"\n  Category distribution:")
    counts = df["category"].value_counts()
    for cat, n in counts.items():
        bar = "=" * int(n / counts.max() * 25)
        print(f"    {cat:<22} {bar} {n}")
    return df


# ── STEP 8 : CLEAN TXN TYPE ───────────────────────────────────────────────────
def clean_txn_type(df: pd.DataFrame) -> pd.DataFrame:
    income_cats = {"Income", "Transfers"}

    def infer_type(row):
        t = str(row.get("txn_type", "") or "").lower().strip()
        if "credit" in t or t == "cr":
            return "credit"
        if "debit" in t or t == "dr":
            return "debit"
        if row.get("category") in income_cats:
            return "credit"
        return "debit"

    df["txn_type"] = df.apply(infer_type, axis=1)
    print(f"\n{'='*55}")
    print("  STEP 8 — Transaction type")
    print(f"{'='*55}")
    print(df["txn_type"].value_counts().to_string())
    return df


# ── STEP 9 : FEATURE ENGINEERING ─────────────────────────────────────────────
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    print(f"\n{'='*55}")
    print("  STEP 9 — Engineering features")
    print(f"{'='*55}")

    df = df.sort_values("date").reset_index(drop=True)

    # Time features
    df["year"]           = df["date"].dt.year
    df["month"]          = df["date"].dt.month
    df["day_of_month"]   = df["date"].dt.day
    df["day_of_week"]    = df["date"].dt.dayofweek
    df["day_name"]       = df["date"].dt.day_name()
    df["is_weekend"]     = df["day_of_week"].isin([5, 6]).astype(int)
    df["week_of_year"]   = df["date"].dt.isocalendar().week.astype(int)
    df["quarter"]        = df["date"].dt.quarter
    df["is_month_end"]   = df["date"].dt.is_month_end.astype(int)
    df["is_month_start"] = df["date"].dt.is_month_start.astype(int)

    # Rolling spend (expenses only)
    expenses = df["txn_type"] == "debit"
    df["rolling_7d_spend"]  = df.where(expenses)["amount"].rolling(7,  min_periods=1).sum().fillna(0)
    df["rolling_30d_spend"] = df.where(expenses)["amount"].rolling(30, min_periods=1).sum().fillna(0)

    # Monthly aggregates
    df["year_month"] = df["date"].dt.to_period("M")

    monthly_cat = (
        df[expenses]
        .groupby(["year_month", "category"])["amount"]
        .sum().reset_index()
        .rename(columns={"amount": "monthly_cat_spend"})
    )
    df = df.merge(monthly_cat, on=["year_month", "category"], how="left")
    df["monthly_cat_spend"] = df["monthly_cat_spend"].fillna(0)

    monthly_total = (
        df[expenses]
        .groupby("year_month")["amount"]
        .sum().reset_index()
        .rename(columns={"amount": "monthly_total_spend"})
    )
    df = df.merge(monthly_total, on="year_month", how="left")
    df["monthly_total_spend"] = df["monthly_total_spend"].fillna(0)

    # Spend ratio
    df["spend_ratio"] = np.where(
        df["monthly_total_spend"] > 0,
        df["monthly_cat_spend"] / df["monthly_total_spend"], 0
    ).round(4)

    # Previous month lag per category
    monthly_cat_pivot = (
        df[expenses]
        .groupby(["year_month", "category"])["amount"]
        .sum().unstack(fill_value=0).shift(1)
    )
    monthly_cat_pivot.columns = [
        f"prev_month_{c.lower().replace(' ','_').replace('/','_').replace('&','and')}_spend"
        for c in monthly_cat_pivot.columns
    ]
    df = df.merge(monthly_cat_pivot.reset_index(), on="year_month", how="left")
    lag_cols = [c for c in df.columns if c.startswith("prev_month_")]
    df[lag_cols] = df[lag_cols].fillna(0)

    # Daily transaction frequency
    daily_freq = (
        df[expenses].groupby(df["date"].dt.date)
        .size().reset_index(name="txns_that_day")
    )
    daily_freq["date"] = pd.to_datetime(daily_freq["date"])
    df = df.merge(daily_freq, on="date", how="left")
    df["txns_that_day"] = df["txns_that_day"].fillna(0).astype(int)

    # Amount vs category median
    cat_median = df.groupby("category")["amount"].transform("median")
    df["amount_vs_cat_median"] = (df["amount"] / cat_median).round(4)

    # High spend anomaly flag
    rolling_avg = df["rolling_30d_spend"] / 30
    df["is_high_spend_day"] = (df["amount"] > rolling_avg * 2.5).astype(int)

    # Log amount
    df["log_amount"] = np.log1p(df["amount"]).round(4)

    df = df.drop(columns=["year_month"])

    new_features = [c for c in df.columns if c not in
                    ["date", "description", "amount", "category", "txn_type"]]
    print(f"  {len(new_features)} features engineered:")
    for f in new_features:
        print(f"    + {f}")

    return df


# ── STEP 10 : VALIDATE & SAVE ─────────────────────────────────────────────────
def validate_and_save(df: pd.DataFrame, path: str) -> pd.DataFrame:
    print(f"\n{'='*55}")
    print("  STEP 10 — Final validation & save")
    print(f"{'='*55}")

    df["amount"] = df["amount"].round(2)
    df["date"]   = pd.to_datetime(df["date"])

    remaining_nulls = df.isnull().sum()
    if remaining_nulls.any():
        print("  Remaining nulls:")
        print(remaining_nulls[remaining_nulls > 0].to_string())
    else:
        print("  No nulls remaining.")

    df.to_csv(path, index=False)
    print(f"\n  Saved -> {path}")
    print(f"  Final shape: {df.shape[0]:,} rows x {df.shape[1]} columns")
    return df


# ── MAIN ──────────────────────────────────────────────────────────────────────
def run_pipeline(raw_path: str = RAW_CSV, clean_path: str = CLEAN_CSV) -> pd.DataFrame:
    print("\n  AI Finance Advisor - Data Pipeline")
    print("  =====================================")
    df = load_data(raw_path)
    df = detect_and_rename(df)
    df = remove_duplicates(df)
    df = clean_dates(df)
    df = clean_amounts(df)
    df = clean_descriptions(df)
    df = categorize(df)
    df = clean_txn_type(df)
    df = engineer_features(df)
    df = validate_and_save(df, clean_path)
    print("\n  Pipeline complete!")
    print(f"  Load in your notebook with:")
    print(f"    df = pd.read_csv('{clean_path}')")
    return df


if __name__ == "__main__":
    df = run_pipeline()
