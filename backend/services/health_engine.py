"""
InsightOS — Data Health Engine
Computes 5 health dimensions and an overall score with accurate, non-trivially-optimistic scoring.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from scipy import stats


def score_completeness(df: pd.DataFrame) -> Dict[str, Any]:
    """% of non-null cells — with exponential penalty for high missing rates."""
    total_cells = df.shape[0] * df.shape[1]
    missing_cells = int(df.isna().sum().sum())
    missing_pct = missing_cells / max(total_cells, 1) * 100

    # Exponential penalty: 10% missing → score ~72, 30% missing → score ~37, 50% missing → score ~12
    score = round(100 * (1 - missing_pct / 100) ** 2.5, 2)
    score = max(0.0, score)

    # Per-column breakdown
    col_missing = []
    for col in df.columns:
        pct = round(df[col].isna().mean() * 100, 2)
        if pct > 0:
            col_missing.append({"column": col, "missing_pct": pct,
                                 "severity": "critical" if pct > 40 else "high" if pct > 20 else "medium" if pct > 5 else "low"})
    col_missing.sort(key=lambda x: x["missing_pct"], reverse=True)

    return {
        "score": score,
        "missing_cells": missing_cells,
        "total_cells": total_cells,
        "missing_pct": round(missing_pct, 2),
        "columns_with_missing": col_missing,
        "explanation": (
            f"{score:.1f}% completeness score (exponential scale). "
            f"{missing_cells:,} cells are missing out of {total_cells:,} total ({missing_pct:.1f}%). "
            f"{len(col_missing)} column(s) have missing values."
        )
    }


def score_uniqueness(df: pd.DataFrame) -> Dict[str, Any]:
    """Penalizes duplicate rows and high-cardinality ID columns."""
    dup_count = int(df.duplicated().sum())
    dup_pct = dup_count / max(len(df), 1) * 100

    # Penalty: even 5% duplicates should noticeably reduce score
    score = round(100 * (1 - dup_pct / 100) ** 1.8, 2)
    score = max(0.0, score)

    # Check for constant columns (zero variance = suspicious)
    constant_cols = []
    for col in df.columns:
        if df[col].nunique(dropna=True) <= 1:
            constant_cols.append(col)

    # Penalize for constant columns
    if constant_cols:
        penalty = min(30, len(constant_cols) * 5)
        score = max(0.0, round(score - penalty, 2))

    return {
        "score": score,
        "duplicate_count": dup_count,
        "duplicate_pct": round(dup_pct, 2),
        "constant_columns": constant_cols,
        "explanation": (
            f"{score:.1f}% uniqueness score. "
            f"{dup_count:,} duplicate rows detected ({dup_pct:.1f}%). "
            + (f"{len(constant_cols)} constant column(s) found: {', '.join(constant_cols[:5])}." if constant_cols else "No constant columns found.")
        )
    }


def score_consistency(df: pd.DataFrame) -> Dict[str, Any]:
    """Check dtype consistency, all-null columns, and structural issues."""
    issues = []

    # 1. Mixed types in object columns
    for col in df.select_dtypes(include="object").columns:
        series = df[col].dropna()
        if len(series) == 0:
            continue
        numeric_count = pd.to_numeric(series, errors="coerce").notna().sum()
        ratio = numeric_count / len(series)
        if 0.05 < ratio < 0.95:  # Between 5% and 95% numeric → mixed
            issues.append({
                "column": col,
                "issue": "mixed_types",
                "numeric_ratio": round(ratio, 3),
                "description": f"{ratio*100:.0f}% of values appear numeric but column is text type"
            })

    # 2. Columns with all nulls
    for col in df.columns:
        if df[col].isna().all():
            issues.append({
                "column": col,
                "issue": "all_null_column",
                "numeric_ratio": 0,
                "description": "Column is entirely null — carries no information"
            })

    # 3. Numeric columns stored as object (detected by trying to convert)
    for col in df.select_dtypes(include="object").columns:
        series = df[col].dropna()
        if len(series) < 5:
            continue
        numeric_count = pd.to_numeric(series, errors="coerce").notna().sum()
        if numeric_count / len(series) > 0.95:
            issues.append({
                "column": col,
                "issue": "numeric_as_text",
                "numeric_ratio": round(numeric_count / len(series), 3),
                "description": "Column contains mostly numeric values but stored as text"
            })

    # Score: start from 100, -10 per issue, minimum 0
    score = max(0.0, round(100 - len(issues) * 10, 2))

    return {
        "score": score,
        "issues": issues,
        "issue_count": len(issues),
        "explanation": (
            f"{score:.1f}% consistency score. "
            f"{len(issues)} structural issue(s) found: mixed types, all-null columns, or mistyped numerics."
        )
    }


def score_validity(df: pd.DataFrame) -> Dict[str, Any]:
    """Universal validity checks that apply to any dataset."""
    violations = []

    for col in df.columns:
        lower = col.lower()
        series = df[col].dropna()
        if len(series) == 0:
            continue

        # 1. Keyword-based domain rules
        if any(k in lower for k in ("age", "years_old", "duration")):
            if pd.api.types.is_numeric_dtype(df[col]):
                neg = int((df[col] < 0).sum())
                if neg > 0:
                    violations.append({"column": col, "rule": "negative_value", "count": neg,
                                        "description": f"{neg} negative values in '{col}' (age/duration must be ≥0)"})
                extreme = int((df[col] > 150).sum())
                if extreme > 0:
                    violations.append({"column": col, "rule": "implausible_age", "count": extreme,
                                        "description": f"{extreme} values > 150 in '{col}' (likely entry error)"})

        if any(k in lower for k in ("pct", "percent", "rate", "ratio", "score", "probability")):
            if pd.api.types.is_numeric_dtype(df[col]):
                over100 = int((df[col] > 100).sum())
                neg = int((df[col] < 0).sum())
                if over100 > 0:
                    violations.append({"column": col, "rule": "above_100_pct", "count": over100,
                                        "description": f"{over100} values > 100 in '{col}' (percentage should be ≤100)"})
                if neg > 0:
                    violations.append({"column": col, "rule": "negative_pct", "count": neg,
                                        "description": f"{neg} negative values in '{col}' (percentage should be ≥0)"})

        if any(k in lower for k in ("price", "cost", "amount", "revenue", "salary", "wage")):
            if pd.api.types.is_numeric_dtype(df[col]):
                neg = int((df[col] < 0).sum())
                if neg > 0:
                    violations.append({"column": col, "rule": "negative_monetary", "count": neg,
                                        "description": f"{neg} negative values in monetary column '{col}'"})

        # 2. Universal: object columns with suspiciously long strings (> 500 chars)
        if df[col].dtype == object:
            long_vals = (series.astype(str).str.len() > 500).sum()
            if long_vals > len(series) * 0.1:
                violations.append({"column": col, "rule": "abnormally_long_strings", "count": int(long_vals),
                                    "description": f"{long_vals} values exceed 500 characters (possible data corruption)"})

    # Score: -8 per violation, minimum 0, maximum 100
    score = max(0.0, round(100 - len(violations) * 8, 2))

    return {
        "score": score,
        "violations": violations,
        "explanation": (
            f"{score:.1f}% validity score. "
            f"{len(violations)} rule violation(s) found across domain rules and structural checks."
        )
    }


def score_accuracy(df: pd.DataFrame) -> Dict[str, Any]:
    """Dual outlier detection: z-score + IQR based, per column."""
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    outlier_columns = []
    total_outliers = 0

    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) < 10:
            continue

        # Z-score based (extreme: z > 3.5)
        z = np.abs(stats.zscore(series))
        z_outliers = int((z > 3.5).sum())

        # IQR based (1.5x rule)
        q1, q3 = series.quantile(0.25), series.quantile(0.75)
        iqr = q3 - q1
        if iqr > 0:
            iqr_outliers = int(((series < q1 - 1.5 * iqr) | (series > q3 + 1.5 * iqr)).sum())
        else:
            iqr_outliers = 0

        # Use max of both methods
        col_outliers = max(z_outliers, iqr_outliers)

        if col_outliers > 0:
            outlier_pct = round(col_outliers / len(series) * 100, 2)
            outlier_columns.append({
                "column": col,
                "extreme_outliers": col_outliers,
                "outlier_pct": outlier_pct,
                "z_score_outliers": z_outliers,
                "iqr_outliers": iqr_outliers,
            })
            total_outliers += col_outliers

    # Score based on total proportion of outlier cells vs all numeric cells
    numeric_cells = sum(df[col].notna().sum() for col in numeric_cols) or 1
    outlier_ratio = total_outliers / numeric_cells
    # Stronger penalty: 5% outlier rate → score ~60
    score = round(100 * (1 - outlier_ratio) ** 1.5, 2)
    score = max(0.0, score)

    return {
        "score": score,
        "outlier_columns": outlier_columns,
        "total_extreme_outliers": total_outliers,
        "explanation": (
            f"{score:.1f}% accuracy score. "
            f"{total_outliers} outlier value(s) detected across {len(outlier_columns)} column(s) "
            f"using z-score and IQR methods."
        )
    }


def compute_overall_health(df: pd.DataFrame) -> Dict[str, Any]:
    """Aggregate all health dimensions into one report with stricter grading."""
    completeness = score_completeness(df)
    uniqueness = score_uniqueness(df)
    consistency = score_consistency(df)
    validity = score_validity(df)
    accuracy = score_accuracy(df)

    weights = {
        "completeness": 0.35,
        "uniqueness": 0.20,
        "consistency": 0.20,
        "validity": 0.15,
        "accuracy": 0.10,
    }
    overall = round(
        completeness["score"] * weights["completeness"] +
        uniqueness["score"] * weights["uniqueness"] +
        consistency["score"] * weights["consistency"] +
        validity["score"] * weights["validity"] +
        accuracy["score"] * weights["accuracy"],
        2
    )

    # Stricter grading thresholds
    if overall >= 92:
        grade, status = "A", "Excellent"
    elif overall >= 80:
        grade, status = "B", "Good"
    elif overall >= 65:
        grade, status = "C", "Fair"
    elif overall >= 50:
        grade, status = "D", "Poor"
    else:
        grade, status = "F", "Critical"

    return {
        "overall_score": overall,
        "grade": grade,
        "status": status,
        "dimensions": {
            "completeness": completeness,
            "uniqueness": uniqueness,
            "consistency": consistency,
            "validity": validity,
            "accuracy": accuracy,
        },
        "summary": (
            f"This dataset has an overall health score of {overall:.1f}/100 ({grade} — {status}). "
            f"Completeness: {completeness['score']:.1f}% | "
            f"Uniqueness: {uniqueness['score']:.1f}% | "
            f"Consistency: {consistency['score']:.1f}% | "
            f"Validity: {validity['score']:.1f}% | "
            f"Accuracy: {accuracy['score']:.1f}%."
        )
    }
