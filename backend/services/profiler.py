"""
InsightOS — Data Profiling Service
Generates column-level statistics, distributions, and data dictionary.
"""
import pandas as pd
import numpy as np
from scipy import stats
from typing import Dict, Any, List, Optional
from services.data_loader import detect_column_types


def profile_numeric_column(series: pd.Series) -> Dict[str, Any]:
    clean = series.dropna()
    if len(clean) == 0:
        return {}
    q1, q3 = clean.quantile(0.25), clean.quantile(0.75)
    iqr = q3 - q1
    skewness = float(clean.skew())
    kurtosis = float(clean.kurtosis())

    # Histogram data
    counts, bin_edges = np.histogram(clean, bins=min(30, len(clean.unique())))
    histogram = [
        {"bin": round(float(bin_edges[i]), 4), "count": int(counts[i])}
        for i in range(len(counts))
    ]

    return {
        "mean": round(float(clean.mean()), 4),
        "median": round(float(clean.median()), 4),
        "mode": round(float(clean.mode().iloc[0]), 4) if len(clean.mode()) > 0 else None,
        "std": round(float(clean.std()), 4),
        "variance": round(float(clean.var()), 4),
        "min": round(float(clean.min()), 4),
        "max": round(float(clean.max()), 4),
        "range": round(float(clean.max() - clean.min()), 4),
        "q1": round(float(q1), 4),
        "q3": round(float(q3), 4),
        "iqr": round(float(iqr), 4),
        "skewness": round(skewness, 4),
        "kurtosis": round(kurtosis, 4),
        "p5": round(float(clean.quantile(0.05)), 4),
        "p95": round(float(clean.quantile(0.95)), 4),
        "histogram": histogram,
        "skewness_interpretation": (
            "Symmetric" if abs(skewness) < 0.5
            else ("Moderately skewed" if abs(skewness) < 1 else "Highly skewed")
        ),
        "distribution_shape": "right-skewed" if skewness > 0.5 else ("left-skewed" if skewness < -0.5 else "approximately normal"),
    }


def profile_categorical_column(series: pd.Series) -> Dict[str, Any]:
    clean = series.dropna().astype(str)
    vc = clean.value_counts()
    top_values = [{"value": str(k), "count": int(v), "pct": round(v / len(clean) * 100, 2)}
                  for k, v in vc.head(10).items()]
    return {
        "mode": str(vc.index[0]) if len(vc) > 0 else None,
        "top_values": top_values,
        "cardinality": int(series.nunique()),
        "cardinality_ratio": round(series.nunique() / max(len(series), 1), 4),
        "bar_data": top_values[:15],
    }


def profile_datetime_column(series: pd.Series) -> Dict[str, Any]:
    try:
        dt = pd.to_datetime(series.dropna())
        return {
            "min_date": str(dt.min()),
            "max_date": str(dt.max()),
            "range_days": int((dt.max() - dt.min()).days),
            "unique_dates": int(dt.nunique()),
        }
    except Exception:
        return {}


def compute_correlation_matrix(df: pd.DataFrame) -> Dict[str, Any]:
    numeric_df = df.select_dtypes(include=[np.number])
    if numeric_df.shape[1] < 2:
        return {"columns": [], "matrix": []}
    corr = numeric_df.corr(method="pearson")
    return {
        "columns": list(corr.columns),
        "matrix": corr.round(4).values.tolist(),
        "heatmap_data": [
            {"x": col1, "y": col2, "value": round(float(corr.loc[col1, col2]), 4)}
            for col1 in corr.columns for col2 in corr.columns
        ]
    }


def build_data_dictionary(df: pd.DataFrame) -> List[Dict[str, Any]]:
    col_types = detect_column_types(df)
    dictionary = []
    for col in df.columns:
        series = df[col]
        entry = {
            "column": col,
            "dtype": str(series.dtype),
            "semantic_type": col_types.get(col, "unknown"),
            "null_count": int(series.isna().sum()),
            "null_pct": round(series.isna().mean() * 100, 2),
            "unique_count": int(series.nunique()),
            "sample_values": series.dropna().head(5).astype(str).tolist(),
            "suggested_role": _suggest_role(col, col_types.get(col, "unknown")),
        }
        dictionary.append(entry)
    return dictionary


def _suggest_role(col_name: str, sem_type: str) -> str:
    lower = col_name.lower()
    if any(k in lower for k in ("id", "key", "uuid", "code")):
        return "identifier"
    if any(k in lower for k in ("date", "time", "created", "updated")):
        return "temporal"
    if any(k in lower for k in ("name", "label", "category", "type", "status")):
        return "dimension"
    if sem_type in ("numeric",):
        return "measure"
    if sem_type == "categorical":
        return "dimension"
    return "attribute"


def profile_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    col_types = detect_column_types(df)
    columns_profile = {}
    for col in df.columns:
        series = df[col]
        stype = col_types.get(col, "unknown")
        base = {
            "name": col,
            "dtype": str(series.dtype),
            "semantic_type": stype,
            "null_count": int(series.isna().sum()),
            "null_pct": round(series.isna().mean() * 100, 2),
            "unique_count": int(series.nunique()),
            "total_count": len(series),
        }
        if stype in ("numeric", "categorical_numeric"):
            base.update(profile_numeric_column(series))
        elif stype == "datetime":
            base.update(profile_datetime_column(series))
        else:
            base.update(profile_categorical_column(series))
        columns_profile[col] = base

    return {
        "columns": columns_profile,
        "correlation_matrix": compute_correlation_matrix(df),
        "data_dictionary": build_data_dictionary(df),
        "numeric_columns": [c for c, t in col_types.items() if t in ("numeric", "categorical_numeric")],
        "categorical_columns": [c for c, t in col_types.items() if t in ("categorical", "categorical_numeric")],
        "datetime_columns": [c for c, t in col_types.items() if t == "datetime"],
        "text_columns": [c for c, t in col_types.items() if t in ("text", "id_like")],
    }
