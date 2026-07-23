"""
InsightOS — Data Health Engine
Computes 5 health dimensions and an overall score.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from scipy import stats


def score_completeness(df: pd.DataFrame) -> Dict[str, Any]:
    """% of non-null cells."""
    total_cells = df.shape[0] * df.shape[1]
    missing_cells = int(df.isna().sum().sum())
    score = round((1 - missing_cells / max(total_cells, 1)) * 100, 2)
    return {
        "score": score,
        "missing_cells": missing_cells,
        "total_cells": total_cells,
        "missing_pct": round(missing_cells / max(total_cells, 1) * 100, 2),
        "explanation": (
            f"{score:.1f}% of all values are present. "
            f"{missing_cells:,} cells are missing out of {total_cells:,} total."
        )
    }


def score_uniqueness(df: pd.DataFrame) -> Dict[str, Any]:
    """Penalizes duplicate rows."""
    dup_count = int(df.duplicated().sum())
    score = round((1 - dup_count / max(len(df), 1)) * 100, 2)
    return {
        "score": score,
        "duplicate_count": dup_count,
        "duplicate_pct": round(dup_count / max(len(df), 1) * 100, 2),
        "explanation": (
            f"{score:.1f}% of rows are unique. "
            f"{dup_count:,} duplicate rows detected."
        )
    }


def score_consistency(df: pd.DataFrame) -> Dict[str, Any]:
    """Check dtype consistency (mixed types in object columns)."""
    issues = []
    for col in df.select_dtypes(include="object").columns:
        series = df[col].dropna()
        if len(series) == 0:
            continue
        # Try to see if only some values are numeric
        numeric_count = pd.to_numeric(series, errors="coerce").notna().sum()
        if 0 < numeric_count < len(series):
            issues.append({
                "column": col,
                "issue": "mixed_types",
                "numeric_ratio": round(numeric_count / len(series), 3)
            })
    score = max(0, round((1 - len(issues) / max(len(df.columns), 1)) * 100, 2))
    return {
        "score": score,
        "issues": issues,
        "issue_count": len(issues),
        "explanation": (
            f"{score:.1f}% consistency. "
            f"{len(issues)} column(s) show mixed data types."
        )
    }


def score_validity(df: pd.DataFrame) -> Dict[str, Any]:
    """Rule-based validity: detect negative ages, impossible dates, etc."""
    violations = []
    for col in df.columns:
        lower = col.lower()
        series = df[col].dropna()
        if len(series) == 0:
            continue
        if any(k in lower for k in ("age", "year", "duration", "count", "quantity", "qty")):
            if pd.api.types.is_numeric_dtype(df[col]):
                neg = (df[col] < 0).sum()
                if neg > 0:
                    violations.append({"column": col, "rule": "negative_value", "count": int(neg)})
        if any(k in lower for k in ("pct", "percent", "rate", "ratio")):
            if pd.api.types.is_numeric_dtype(df[col]):
                over100 = (df[col] > 100).sum()
                if over100 > 0:
                    violations.append({"column": col, "rule": "above_100_pct", "count": int(over100)})
    score = max(0, round((1 - len(violations) / max(len(df.columns), 1)) * 100, 2))
    return {
        "score": score,
        "violations": violations,
        "explanation": (
            f"{score:.1f}% validity score. "
            f"{len(violations)} business rule violation(s) found."
        )
    }


def score_accuracy(df: pd.DataFrame) -> Dict[str, Any]:
    """Accuracy approximation: detect extreme outliers as potential data entry errors."""
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    outlier_counts = []
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) < 10:
            continue
        z = np.abs(stats.zscore(series))
        outliers = int((z > 3.5).sum())
        if outliers > 0:
            outlier_counts.append({"column": col, "extreme_outliers": outliers})
    total_outliers = sum(o["extreme_outliers"] for o in outlier_counts)
    score = max(0, round((1 - total_outliers / max(len(df), 1)) * 100, 2))
    return {
        "score": score,
        "outlier_columns": outlier_counts,
        "total_extreme_outliers": total_outliers,
        "explanation": (
            f"{score:.1f}% accuracy. "
            f"{total_outliers} extreme outlier(s) detected that may be data entry errors."
        )
    }


def compute_overall_health(df: pd.DataFrame) -> Dict[str, Any]:
    """Aggregate all health dimensions into one report."""
    completeness = score_completeness(df)
    uniqueness = score_uniqueness(df)
    consistency = score_consistency(df)
    validity = score_validity(df)
    accuracy = score_accuracy(df)

    weights = {"completeness": 0.3, "uniqueness": 0.2, "consistency": 0.2, "validity": 0.15, "accuracy": 0.15}
    overall = round(
        completeness["score"] * weights["completeness"] +
        uniqueness["score"] * weights["uniqueness"] +
        consistency["score"] * weights["consistency"] +
        validity["score"] * weights["validity"] +
        accuracy["score"] * weights["accuracy"],
        2
    )

    if overall >= 90:
        grade, status = "A", "Excellent"
    elif overall >= 75:
        grade, status = "B", "Good"
    elif overall >= 60:
        grade, status = "C", "Fair"
    elif overall >= 45:
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
            f"Completeness: {completeness['score']:.1f}%, "
            f"Uniqueness: {uniqueness['score']:.1f}%, "
            f"Consistency: {consistency['score']:.1f}%, "
            f"Validity: {validity['score']:.1f}%, "
            f"Accuracy: {accuracy['score']:.1f}%."
        )
    }
