"""
InsightOS — EDA Engine
Generates chart-ready data for all visualization types.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from services.data_loader import detect_column_types


def generate_histogram(df: pd.DataFrame, col: str, bins: int = 30) -> Dict[str, Any]:
    series = df[col].dropna()
    counts, edges = np.histogram(series, bins=min(bins, max(len(series.unique()), 5)))
    return {
        "type": "histogram",
        "column": col,
        "data": [{"bin_start": round(float(edges[i]), 4), "bin_end": round(float(edges[i+1]), 4),
                  "count": int(counts[i]), "label": f"{edges[i]:.1f}–{edges[i+1]:.1f}"}
                 for i in range(len(counts))]
    }


def generate_scatter(df: pd.DataFrame, col_x: str, col_y: str) -> Dict[str, Any]:
    temp = df[[col_x, col_y]].dropna()
    sample = temp.sample(min(500, len(temp)), random_state=42) if len(temp) > 500 else temp
    return {
        "type": "scatter",
        "x": col_x, "y": col_y,
        "data": [{"x": round(float(r[col_x]), 4), "y": round(float(r[col_y]), 4)} for _, r in sample.iterrows()]
    }


def generate_bar(df: pd.DataFrame, col: str) -> Dict[str, Any]:
    vc = df[col].value_counts().head(15)
    return {
        "type": "bar",
        "column": col,
        "data": [{"name": str(k), "value": int(v)} for k, v in vc.items()]
    }


def generate_line(df: pd.DataFrame, x_col: str, y_col: str) -> Dict[str, Any]:
    temp = df[[x_col, y_col]].dropna().sort_values(x_col)
    sample = temp.head(200)
    return {
        "type": "line",
        "x": x_col, "y": y_col,
        "data": [{"x": str(r[x_col]), "y": round(float(r[y_col]), 4)} for _, r in sample.iterrows()]
    }


def generate_pie(df: pd.DataFrame, col: str) -> Dict[str, Any]:
    vc = df[col].value_counts().head(8)
    total = vc.sum()
    return {
        "type": "pie",
        "column": col,
        "data": [{"name": str(k), "value": int(v), "pct": round(v/total*100, 2)} for k, v in vc.items()]
    }


def generate_boxplot(df: pd.DataFrame, col: str) -> Dict[str, Any]:
    series = df[col].dropna()
    q1, q3 = float(series.quantile(0.25)), float(series.quantile(0.75))
    iqr = q3 - q1
    lower_fence = q1 - 1.5 * iqr
    upper_fence = q3 + 1.5 * iqr
    outliers = series[(series < lower_fence) | (series > upper_fence)].tolist()
    return {
        "type": "boxplot",
        "column": col,
        "min": round(float(series.min()), 4),
        "q1": round(q1, 4),
        "median": round(float(series.median()), 4),
        "q3": round(q3, 4),
        "max": round(float(series.max()), 4),
        "lower_fence": round(lower_fence, 4),
        "upper_fence": round(upper_fence, 4),
        "outliers": [round(o, 4) for o in outliers[:50]],
        "outlier_count": len(outliers),
    }


def generate_missing_matrix(df: pd.DataFrame) -> Dict[str, Any]:
    """Missing value matrix data."""
    columns = df.columns.tolist()
    sample = df.head(200)
    rows_data = []
    for idx, row in sample.iterrows():
        rows_data.append([1 if pd.isna(v) else 0 for v in row])
    return {
        "type": "missing_matrix",
        "columns": columns,
        "rows": rows_data,
        "summary": [{"column": col, "missing_pct": round(df[col].isna().mean() * 100, 2)} for col in columns]
    }


def run_full_eda(df: pd.DataFrame) -> Dict[str, Any]:
    col_types = detect_column_types(df)
    numeric_cols = [c for c, t in col_types.items() if t in ("numeric", "categorical_numeric")]
    cat_cols = [c for c, t in col_types.items() if t in ("categorical", "categorical_numeric")]
    dt_cols = [c for c, t in col_types.items() if t == "datetime"]

    charts = []

    # Histograms for numeric cols
    for col in numeric_cols[:6]:
        charts.append(generate_histogram(df, col))

    # Bar charts for categorical
    for col in cat_cols[:4]:
        charts.append(generate_bar(df, col))

    # Pie charts for low-cardinality categoricals
    for col in cat_cols[:3]:
        if df[col].nunique() <= 8:
            charts.append(generate_pie(df, col))

    # Scatter plots for pairs
    for i in range(len(numeric_cols)):
        for j in range(i+1, min(i+3, len(numeric_cols))):
            charts.append(generate_scatter(df, numeric_cols[i], numeric_cols[j]))
        if i >= 3:
            break

    # Box plots
    for col in numeric_cols[:5]:
        charts.append(generate_boxplot(df, col))

    # Line charts (time series or sequential numeric)
    if dt_cols and numeric_cols:
        try:
            df_copy = df.copy()
            df_copy[dt_cols[0]] = pd.to_datetime(df_copy[dt_cols[0]])
            charts.append(generate_line(df_copy.sort_values(dt_cols[0]), dt_cols[0], numeric_cols[0]))
        except Exception:
            pass

    return {
        "charts": charts,
        "missing_matrix": generate_missing_matrix(df),
        "numeric_columns": numeric_cols,
        "categorical_columns": cat_cols,
        "datetime_columns": dt_cols,
    }
