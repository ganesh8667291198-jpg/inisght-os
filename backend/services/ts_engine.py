"""
InsightOS — Time Series Analysis Engine
Trend, rolling average, seasonality, and change point detection.
"""
import pandas as pd
import numpy as np
from scipy import stats
from typing import Dict, Any, List, Optional
import warnings
warnings.filterwarnings("ignore")


def detect_datetime_columns(df: pd.DataFrame) -> List[str]:
    dt_cols = []
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            dt_cols.append(col)
            continue
        try:
            pd.to_datetime(df[col].dropna().head(20), infer_datetime_format=True)
            dt_cols.append(col)
        except Exception:
            pass
    return dt_cols


def compute_rolling_stats(df: pd.DataFrame, date_col: str, value_col: str, window: int = 7) -> Dict[str, Any]:
    try:
        temp = df[[date_col, value_col]].copy()
        temp[date_col] = pd.to_datetime(temp[date_col])
        temp = temp.sort_values(date_col).dropna()
        temp["rolling_mean"] = temp[value_col].rolling(window=window, min_periods=1).mean()
        temp["rolling_std"] = temp[value_col].rolling(window=window, min_periods=1).std()
        return {
            "date_col": date_col,
            "value_col": value_col,
            "window": window,
            "data": [
                {
                    "date": str(row[date_col]),
                    "value": round(float(row[value_col]), 4) if not pd.isna(row[value_col]) else None,
                    "rolling_mean": round(float(row["rolling_mean"]), 4) if not pd.isna(row["rolling_mean"]) else None,
                }
                for _, row in temp.head(500).iterrows()
            ]
        }
    except Exception as e:
        return {"error": str(e)}


def detect_trend(df: pd.DataFrame, date_col: str, value_col: str) -> Dict[str, Any]:
    try:
        temp = df[[date_col, value_col]].copy()
        temp[date_col] = pd.to_datetime(temp[date_col])
        temp = temp.sort_values(date_col).dropna()
        x = np.arange(len(temp))
        y = temp[value_col].values
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
        trend_dir = "upward" if slope > 0 else "downward"
        return {
            "slope": round(float(slope), 6),
            "r_squared": round(float(r_value**2), 4),
            "p_value": round(float(p_value), 6),
            "trend_direction": trend_dir,
            "significant": bool(p_value < 0.05),
            "explanation": (
                f"{value_col} shows a {trend_dir} trend over time "
                f"(slope={slope:.4f}, R²={r_value**2:.2f}, p={p_value:.4f}). "
                f"{'This trend is statistically significant.' if p_value < 0.05 else 'This trend is not statistically significant.'}"
            )
        }
    except Exception as e:
        return {"error": str(e)}


def detect_seasonality(df: pd.DataFrame, date_col: str, value_col: str) -> Dict[str, Any]:
    try:
        temp = df[[date_col, value_col]].copy()
        temp[date_col] = pd.to_datetime(temp[date_col])
        temp = temp.sort_values(date_col).dropna()

        if len(temp) < 24:
            return {"error": "Less than 24 records — seasonality analysis requires more data"}

        temp["month"] = temp[date_col].dt.month
        temp["dayofweek"] = temp[date_col].dt.dayofweek
        temp["quarter"] = temp[date_col].dt.quarter

        monthly = temp.groupby("month")[value_col].mean().to_dict()
        dow = temp.groupby("dayofweek")[value_col].mean().to_dict()
        quarterly = temp.groupby("quarter")[value_col].mean().to_dict()

        monthly_var = pd.Series(list(monthly.values())).std()
        overall_std = temp[value_col].std()
        seasonal_strength = round(monthly_var / overall_std, 4) if overall_std > 0 else 0

        return {
            "seasonal_strength": seasonal_strength,
            "has_seasonality": bool(seasonal_strength > 0.1),
            "monthly_pattern": [{"month": int(k), "avg_value": round(float(v), 4)} for k, v in monthly.items()],
            "day_of_week_pattern": [{"day": int(k), "avg_value": round(float(v), 4)} for k, v in dow.items()],
            "quarterly_pattern": [{"quarter": int(k), "avg_value": round(float(v), 4)} for k, v in quarterly.items()],
            "explanation": (
                f"Seasonal strength is {seasonal_strength:.2f}. "
                f"{'Strong seasonality detected.' if seasonal_strength > 0.3 else 'Mild seasonality.' if seasonal_strength > 0.1 else 'No significant seasonality.'}"
            )
        }
    except Exception as e:
        return {"error": str(e)}


def detect_change_points(df: pd.DataFrame, date_col: str, value_col: str) -> Dict[str, Any]:
    """Simple CUSUM-based change point detection."""
    try:
        temp = df[[date_col, value_col]].copy()
        temp[date_col] = pd.to_datetime(temp[date_col])
        temp = temp.sort_values(date_col).dropna()
        series = temp[value_col].values
        if len(series) < 10:
            return {"change_points": []}
        mean = np.mean(series)
        cusum = np.cumsum(series - mean)
        # Detect peaks in CUSUM
        from scipy.signal import find_peaks
        peaks, _ = find_peaks(np.abs(cusum), height=np.std(cusum))
        change_dates = temp[date_col].iloc[peaks].tolist() if len(peaks) > 0 else []
        return {
            "change_points": [{"date": str(d), "index": int(i)} for i, d in zip(peaks[:5], change_dates[:5])],
            "cusum_data": [{"index": int(i), "value": round(float(v), 4)} for i, v in enumerate(cusum[:200])],
            "explanation": f"Detected {len(peaks)} potential change point(s) in {value_col}."
        }
    except Exception as e:
        return {"error": str(e)}


def run_time_series_analysis(df: pd.DataFrame) -> Dict[str, Any]:
    dt_cols = detect_datetime_columns(df)
    if not dt_cols:
        return {"has_time_series": False, "message": "No datetime columns detected in this dataset."}

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if not numeric_cols:
        return {"has_time_series": True, "message": "Datetime found but no numeric columns to analyze."}

    date_col = dt_cols[0]
    results = {"has_time_series": True, "date_column": date_col, "series": []}

    for value_col in numeric_cols[:4]:
        series_result = {
            "value_column": value_col,
            "trend": detect_trend(df, date_col, value_col),
            "seasonality": detect_seasonality(df, date_col, value_col),
            "rolling_stats": compute_rolling_stats(df, date_col, value_col),
            "change_points": detect_change_points(df, date_col, value_col),
        }
        results["series"].append(series_result)

    return results
