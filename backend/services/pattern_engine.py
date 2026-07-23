"""
InsightOS — Pattern Discovery Engine
Finds correlations, association rules, trends, rare events, and ranks insights.
"""
import pandas as pd
import numpy as np
from scipy import stats
from typing import Dict, Any, List
import warnings
warnings.filterwarnings("ignore")


def find_strong_correlations(df: pd.DataFrame, threshold: float = 0.6) -> List[Dict[str, Any]]:
    numeric = df.select_dtypes(include=[np.number])
    if numeric.shape[1] < 2:
        return []
    corr = numeric.corr(method="pearson")
    findings = []
    cols = corr.columns.tolist()
    for i in range(len(cols)):
        for j in range(i+1, len(cols)):
            r = corr.iloc[i, j]
            if not np.isnan(r) and abs(r) >= threshold:
                findings.append({
                    "type": "correlation",
                    "col1": cols[i],
                    "col2": cols[j],
                    "r": round(float(r), 4),
                    "strength": "very strong" if abs(r) > 0.8 else "strong",
                    "direction": "positive" if r > 0 else "negative",
                    "confidence": round(min(abs(r) * 100, 99), 1),
                    "business_impact": "high" if abs(r) > 0.8 else "medium",
                    "explanation": (
                        f"{cols[i]} and {cols[j]} have a {'positive' if r > 0 else 'negative'} "
                        f"correlation of {r:.2f}. "
                        f"{'As one increases, the other reliably increases.' if r > 0 else 'As one increases, the other reliably decreases.'}"
                    )
                })
    findings.sort(key=lambda x: abs(x["r"]), reverse=True)
    return findings[:20]


def find_rare_events(df: pd.DataFrame) -> List[Dict[str, Any]]:
    findings = []
    for col in df.select_dtypes(include="object").columns[:5]:
        vc = df[col].value_counts()
        rare = vc[vc / len(df) < 0.01]
        if len(rare) > 0:
            findings.append({
                "type": "rare_event",
                "column": col,
                "rare_values": rare.head(5).index.tolist(),
                "rare_count": int(rare.sum()),
                "rare_pct": round(rare.sum() / len(df) * 100, 2),
                "confidence": 90,
                "explanation": f"Column '{col}' has {len(rare)} rarely occurring values (<1% frequency)."
            })
    return findings


def find_seasonal_patterns(df: pd.DataFrame) -> List[Dict[str, Any]]:
    findings = []
    dt_cols = []
    for col in df.columns:
        try:
            pd.to_datetime(df[col].dropna().head(20))
            dt_cols.append(col)
        except Exception:
            pass

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    for dt_col in dt_cols[:1]:
        try:
            df_copy = df.copy()
            df_copy[dt_col] = pd.to_datetime(df_copy[dt_col])
            df_copy["_month"] = df_copy[dt_col].dt.month
            for num_col in numeric_cols[:2]:
                monthly = df_copy.groupby("_month")[num_col].mean()
                if len(monthly) >= 3:
                    variation = monthly.std() / monthly.mean() if monthly.mean() != 0 else 0
                    if variation > 0.1:
                        peak_month = monthly.idxmax()
                        findings.append({
                            "type": "seasonality",
                            "column": num_col,
                            "date_column": dt_col,
                            "peak_month": int(peak_month),
                            "variation": round(float(variation), 4),
                            "confidence": round(min(variation * 300, 95), 1),
                            "explanation": f"{num_col} shows seasonal variation. Peak in month {peak_month}.",
                            "monthly_data": [{"month": int(m), "value": round(float(v), 4)} for m, v in monthly.items()]
                        })
        except Exception:
            pass
    return findings


def find_trend_changes(df: pd.DataFrame) -> List[Dict[str, Any]]:
    findings = []
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    for col in numeric_cols[:3]:
        series = df[col].dropna().reset_index(drop=True)
        if len(series) < 20:
            continue
        # Split into first/second half trend
        half = len(series) // 2
        slope1, _, _, _, _ = stats.linregress(range(half), series[:half])
        slope2, _, _, _, _ = stats.linregress(range(half), series[half:])
        if slope1 * slope2 < 0:  # sign change = trend reversal
            findings.append({
                "type": "trend_change",
                "column": col,
                "first_half_slope": round(float(slope1), 6),
                "second_half_slope": round(float(slope2), 6),
                "confidence": 75,
                "explanation": f"{col} shows a trend reversal: {'upward then downward' if slope1 > 0 else 'downward then upward'} pattern."
            })
    return findings


def rank_insights(insights: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    def score(ins):
        c = ins.get("confidence", 50)
        impact_score = {"high": 30, "medium": 15, "low": 5}.get(ins.get("business_impact", "low"), 5)
        type_score = {"correlation": 10, "seasonality": 15, "trend_change": 12, "rare_event": 6}.get(ins.get("type", ""), 5)
        return c + impact_score + type_score
    return sorted(insights, key=score, reverse=True)


def discover_patterns(df: pd.DataFrame) -> Dict[str, Any]:
    correlations = find_strong_correlations(df)
    rare_events = find_rare_events(df)
    seasonal = find_seasonal_patterns(df)
    trends = find_trend_changes(df)

    all_insights = correlations + rare_events + seasonal + trends
    ranked = rank_insights(all_insights)

    return {
        "strong_correlations": correlations,
        "rare_events": rare_events,
        "seasonal_patterns": seasonal,
        "trend_changes": trends,
        "ranked_insights": ranked[:15],
        "total_patterns_found": len(all_insights),
    }
