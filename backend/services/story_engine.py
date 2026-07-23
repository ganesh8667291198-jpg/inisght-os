"""
InsightOS — Data Storytelling & Insight Engine
Generates narrative reports and ranked investigations.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from services.data_loader import detect_column_types
from services.stats_engine import compute_correlations
from services.pattern_engine import discover_patterns
import warnings
warnings.filterwarnings("ignore")


def generate_executive_summary(df: pd.DataFrame, filename: str, health_score: float) -> str:
    n_rows, n_cols = df.shape
    missing_pct = round(df.isna().mean().mean() * 100, 1)
    dup_pct = round(df.duplicated().mean() * 100, 1)
    col_types = detect_column_types(df)
    num_numeric = sum(1 for t in col_types.values() if "numeric" in t)
    num_cat = sum(1 for t in col_types.values() if "categorical" in t)
    num_dt = sum(1 for t in col_types.values() if t == "datetime")

    quality_word = "excellent" if health_score >= 90 else "good" if health_score >= 75 else "fair" if health_score >= 60 else "poor"

    return (
        f"## Executive Summary\n\n"
        f"The dataset **{filename}** contains **{n_rows:,} records** across **{n_cols} columns**, "
        f"comprising {num_numeric} numeric, {num_cat} categorical"
        f"{f', and {num_dt} datetime' if num_dt > 0 else ''} features. "
        f"Overall data quality is **{quality_word}** with a health score of **{health_score:.1f}/100**. "
        f"Missing values account for **{missing_pct}%** of all cells"
        f"{f', and {dup_pct}% of rows are duplicates' if dup_pct > 0 else ', with no significant duplication detected'}. "
        f"The dataset appears suitable for exploratory analysis with {'minimal' if missing_pct < 5 else 'moderate' if missing_pct < 20 else 'significant'} cleaning required."
    )


def generate_key_findings(df: pd.DataFrame) -> List[str]:
    findings = []
    col_types = detect_column_types(df)
    numeric_cols = [c for c, t in col_types.items() if "numeric" in t]

    # Distribution findings
    for col in numeric_cols[:3]:
        series = df[col].dropna()
        if len(series) < 5:
            continue
        skew = series.skew()
        if abs(skew) > 1:
            direction = "right" if skew > 0 else "left"
            findings.append(
                f"**{col}** is heavily {direction}-skewed (skewness={skew:.2f}), suggesting "
                f"{'a concentration of low values with occasional extreme highs' if skew > 0 else 'most values cluster toward the high end'}."
            )

    # Missing values finding
    missing_cols = df.columns[df.isna().mean() > 0.1].tolist()
    if missing_cols:
        findings.append(
            f"**{len(missing_cols)} column(s)** have more than 10% missing values: "
            f"{', '.join(f'`{c}`' for c in missing_cols[:5])}. Consider imputation or removal."
        )

    # Correlation finding
    numeric = df.select_dtypes(include=[np.number])
    if numeric.shape[1] >= 2:
        corr = numeric.corr()
        cols = corr.columns.tolist()
        for i in range(len(cols)):
            for j in range(i+1, len(cols)):
                r = corr.iloc[i, j]
                if not np.isnan(r) and abs(r) > 0.7:
                    findings.append(
                        f"**{cols[i]}** and **{cols[j]}** are strongly correlated (r={r:.2f}), "
                        f"indicating they may measure a similar underlying phenomenon."
                    )
                    break
            else:
                continue
            break

    if not findings:
        findings.append("The dataset appears well-distributed with no immediately alarming patterns.")

    return findings[:8]


def generate_risks(df: pd.DataFrame) -> List[str]:
    risks = []
    missing_pct = df.isna().mean().mean() * 100
    if missing_pct > 20:
        risks.append(f"High missing value rate ({missing_pct:.1f}%) may bias analysis results.")
    dup_pct = df.duplicated().mean() * 100
    if dup_pct > 5:
        risks.append(f"{dup_pct:.1f}% duplicate rows detected — analysis outcomes may be inflated.")

    numeric = df.select_dtypes(include=[np.number])
    for col in numeric.columns[:5]:
        series = numeric[col].dropna()
        if len(series) > 10:
            from scipy import stats as scipy_stats
            z = np.abs(scipy_stats.zscore(series))
            if (z > 3).mean() > 0.05:
                risks.append(f"**{col}** contains more than 5% extreme outliers — verify data collection process.")

    if not risks:
        risks.append("No significant data quality risks identified.")
    return risks[:5]


def generate_recommendations(df: pd.DataFrame) -> List[str]:
    recs = []
    col_types = detect_column_types(df)
    numeric_cols = [c for c, t in col_types.items() if "numeric" in t]
    cat_cols = [c for c, t in col_types.items() if "categorical" in t]
    dt_cols = [c for c, t in col_types.items() if t == "datetime"]

    if df.isna().any().any():
        recs.append("Perform missing value imputation — use median for numeric columns, mode for categorical columns.")
    if df.duplicated().sum() > 0:
        recs.append("Remove duplicate rows before any analysis to prevent biased results.")
    if len(numeric_cols) >= 2:
        recs.append(f"Explore correlation analysis between {', '.join(numeric_cols[:3])} for deeper insights.")
    if cat_cols:
        recs.append(f"Perform group-by analysis using `{cat_cols[0]}` to discover segment-level patterns.")
    if dt_cols:
        recs.append(f"Conduct time series analysis on `{dt_cols[0]}` to identify temporal trends and seasonality.")
    if len(numeric_cols) >= 2:
        recs.append("Use cluster analysis to segment records into natural groups based on numeric features.")
    recs.append("Review the correlation matrix to identify redundant features before reporting.")

    return recs[:8]


def build_investigations(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Build evidence-backed investigation cards."""
    investigations = []
    patterns = discover_patterns(df)
    idx = 1

    for finding in patterns.get("strong_correlations", [])[:3]:
        investigations.append({
            "id": idx,
            "title": f"{finding['col1']} and {finding['col2']} are {finding['strength']}ly correlated",
            "confidence": finding["confidence"],
            "type": "correlation",
            "evidence": {
                "pearson_r": finding["r"],
                "direction": finding["direction"],
                "strength": finding["strength"],
            },
            "statistical_test": f"Pearson correlation = {finding['r']}",
            "business_impact": finding.get("business_impact", "medium"),
            "explanation": finding["explanation"],
        })
        idx += 1

    for finding in patterns.get("seasonal_patterns", [])[:2]:
        investigations.append({
            "id": idx,
            "title": f"{finding['column']} shows seasonal variation by month",
            "confidence": finding["confidence"],
            "type": "seasonality",
            "evidence": {
                "monthly_data": finding.get("monthly_data", []),
                "variation": finding.get("variation"),
            },
            "statistical_test": f"Seasonal strength = {finding.get('variation', 'N/A')}",
            "business_impact": "high",
            "explanation": finding["explanation"],
        })
        idx += 1

    for finding in patterns.get("rare_events", [])[:2]:
        investigations.append({
            "id": idx,
            "title": f"Rare values detected in column '{finding['column']}'",
            "confidence": finding["confidence"],
            "type": "anomaly",
            "evidence": {
                "rare_values": finding["rare_values"],
                "count": finding["rare_count"],
                "pct": finding["rare_pct"],
            },
            "statistical_test": f"Frequency < 1%",
            "business_impact": "low",
            "explanation": finding["explanation"],
        })
        idx += 1

    return investigations


def generate_story(df: pd.DataFrame, filename: str, health_score: float) -> Dict[str, Any]:
    return {
        "executive_summary": generate_executive_summary(df, filename, health_score),
        "key_findings": generate_key_findings(df),
        "risks": generate_risks(df),
        "recommendations": generate_recommendations(df),
        "investigations": build_investigations(df),
    }
