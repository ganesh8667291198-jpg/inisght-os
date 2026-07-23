"""
InsightOS — Anomaly Detection Engine
IQR, Z-Score, Isolation Forest, and Local Outlier Factor.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from scipy import stats
import warnings
warnings.filterwarnings("ignore")

try:
    from sklearn.ensemble import IsolationForest
    from sklearn.neighbors import LocalOutlierFactor
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


def detect_iqr_outliers(series: pd.Series) -> Dict[str, Any]:
    q1, q3 = series.quantile(0.25), series.quantile(0.75)
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr
    mask = (series < lower) | (series > upper)
    return {
        "method": "IQR",
        "lower_bound": round(float(lower), 4),
        "upper_bound": round(float(upper), 4),
        "outlier_count": int(mask.sum()),
        "outlier_pct": round(mask.mean() * 100, 2),
        "outlier_indices": mask[mask].index.tolist()[:50],
    }


def detect_zscore_outliers(series: pd.Series, threshold: float = 3.0) -> Dict[str, Any]:
    z = np.abs(stats.zscore(series.dropna()))
    mask = z > threshold
    outlier_idx = series.dropna().index[mask].tolist()
    return {
        "method": "Z-Score",
        "threshold": threshold,
        "outlier_count": int(mask.sum()),
        "outlier_pct": round(mask.mean() * 100, 2),
        "outlier_indices": outlier_idx[:50],
    }


def detect_isolation_forest(df: pd.DataFrame) -> Dict[str, Any]:
    if not SKLEARN_AVAILABLE:
        return {"method": "Isolation Forest", "error": "scikit-learn not available"}
    numeric = df.select_dtypes(include=[np.number]).dropna()
    if numeric.shape[0] < 10 or numeric.shape[1] < 1:
        return {"method": "Isolation Forest", "error": "Insufficient data"}
    scaler = StandardScaler()
    scaled = scaler.fit_transform(numeric)
    clf = IsolationForest(contamination=0.05, random_state=42, n_jobs=-1)
    preds = clf.fit_predict(scaled)
    anomaly_mask = preds == -1
    anomaly_idx = numeric.index[anomaly_mask].tolist()
    return {
        "method": "Isolation Forest",
        "contamination": 0.05,
        "anomaly_count": int(anomaly_mask.sum()),
        "anomaly_pct": round(anomaly_mask.mean() * 100, 2),
        "anomaly_indices": anomaly_idx[:50],
        "scores": clf.score_samples(scaled).round(4).tolist()[:200],
    }


def detect_lof(df: pd.DataFrame) -> Dict[str, Any]:
    if not SKLEARN_AVAILABLE:
        return {"method": "LOF", "error": "scikit-learn not available"}
    numeric = df.select_dtypes(include=[np.number]).dropna()
    if numeric.shape[0] < 10 or numeric.shape[1] < 1:
        return {"method": "LOF", "error": "Insufficient data"}
    scaler = StandardScaler()
    scaled = scaler.fit_transform(numeric)
    n_neighbors = min(20, len(numeric) - 1)
    clf = LocalOutlierFactor(n_neighbors=n_neighbors, contamination=0.05)
    preds = clf.fit_predict(scaled)
    anomaly_mask = preds == -1
    anomaly_idx = numeric.index[anomaly_mask].tolist()
    return {
        "method": "Local Outlier Factor",
        "n_neighbors": n_neighbors,
        "anomaly_count": int(anomaly_mask.sum()),
        "anomaly_pct": round(anomaly_mask.mean() * 100, 2),
        "anomaly_indices": anomaly_idx[:50],
    }


def detect_suspicious_records(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Heuristic checks for invalid data entries."""
    findings = []
    # Check for all-zero numeric rows
    numeric = df.select_dtypes(include=[np.number])
    if not numeric.empty:
        zero_rows = (numeric == 0).all(axis=1)
        if zero_rows.sum() > 0:
            findings.append({
                "check": "all_zeros",
                "description": "Rows where all numeric values are zero",
                "count": int(zero_rows.sum()),
                "indices": zero_rows[zero_rows].index.tolist()[:20],
            })
    # Exact duplicate rows
    dup_mask = df.duplicated(keep=False)
    if dup_mask.sum() > 0:
        findings.append({
            "check": "exact_duplicates",
            "description": "Exact duplicate rows",
            "count": int(dup_mask.sum()),
            "indices": df[dup_mask].index.tolist()[:20],
        })
    return findings


def run_full_anomaly_detection(df: pd.DataFrame) -> Dict[str, Any]:
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    column_anomalies = {}
    for col in numeric_cols[:10]:
        series = df[col].dropna()
        if len(series) < 5:
            continue
        column_anomalies[col] = {
            "iqr": detect_iqr_outliers(series),
            "zscore": detect_zscore_outliers(series),
        }

    return {
        "column_anomalies": column_anomalies,
        "multivariate": {
            "isolation_forest": detect_isolation_forest(df),
            "lof": detect_lof(df),
        },
        "suspicious_records": detect_suspicious_records(df),
        "summary": f"Analyzed {len(numeric_cols)} numeric columns for anomalies.",
    }
