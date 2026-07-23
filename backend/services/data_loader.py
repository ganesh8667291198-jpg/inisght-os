"""
InsightOS — Data Loader Service
Handles CSV, Excel, and JSON ingestion with automatic type detection.
"""
import pandas as pd
import numpy as np
import json
import os
from pathlib import Path
from typing import Dict, Any, List, Optional
import uuid


UPLOADS_DIR = Path(__file__).parent.parent / "uploads"
SNAPSHOTS_DIR = Path(__file__).parent.parent / "uploads" / "snapshots"

def ensure_dirs():
    UPLOADS_DIR.mkdir(exist_ok=True)
    SNAPSHOTS_DIR.mkdir(exist_ok=True)

ensure_dirs()


def load_dataframe(file_path: str) -> pd.DataFrame:
    """Load a file into a DataFrame based on extension."""
    path = Path(file_path)
    ext = path.suffix.lower()
    if ext == ".csv":
        return pd.read_csv(file_path, low_memory=False)
    elif ext in (".xlsx", ".xls"):
        try:
            return pd.read_excel(file_path)
        except ValueError as e:
            if "Excel file format cannot be determined" in str(e):
                # Sometimes a CSV file is saved with an .xlsx extension
                return pd.read_csv(file_path, low_memory=False)
            raise e
    elif ext == ".json":
        return pd.read_json(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def detect_column_types(df: pd.DataFrame) -> Dict[str, str]:
    """Detect semantic type for each column (numeric, categorical, datetime, text, id)."""
    col_types = {}
    for col in df.columns:
        series = df[col].dropna()
        if len(series) == 0:
            col_types[col] = "empty"
            continue
        dtype = df[col].dtype
        if pd.api.types.is_datetime64_any_dtype(dtype):
            col_types[col] = "datetime"
        elif pd.api.types.is_bool_dtype(dtype):
            col_types[col] = "boolean"
        elif pd.api.types.is_numeric_dtype(dtype):
            unique_ratio = df[col].nunique() / max(len(df), 1)
            if unique_ratio < 0.05 and df[col].nunique() <= 20:
                col_types[col] = "categorical_numeric"
            else:
                col_types[col] = "numeric"
        else:
            # Try parsing as datetime
            try:
                pd.to_datetime(series.head(20), infer_datetime_format=True)
                col_types[col] = "datetime"
            except Exception:
                pass
            if col not in col_types:
                unique_ratio = df[col].nunique() / max(len(df), 1)
                avg_len = series.astype(str).str.len().mean()
                if unique_ratio > 0.95 and avg_len > 10:
                    col_types[col] = "id_like"
                elif df[col].nunique() <= 50 or unique_ratio < 0.05:
                    col_types[col] = "categorical"
                else:
                    col_types[col] = "text"
    return col_types


def compute_schema(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Generate schema info for all columns."""
    col_types = detect_column_types(df)
    schema = []
    for col in df.columns:
        series = df[col]
        schema.append({
            "name": col,
            "dtype": str(series.dtype),
            "semantic_type": col_types.get(col, "unknown"),
            "null_count": int(series.isna().sum()),
            "null_pct": round(series.isna().mean() * 100, 2),
            "unique_count": int(series.nunique()),
            "sample_values": series.dropna().head(3).tolist(),
        })
    return schema


def compute_overview(df: pd.DataFrame, filename: str) -> Dict[str, Any]:
    """Compute top-level dataset overview statistics."""
    mem_bytes = df.memory_usage(deep=True).sum()
    return {
        "filename": filename,
        "rows": len(df),
        "columns": len(df.columns),
        "null_count": int(df.isna().sum().sum()),
        "duplicate_count": int(df.duplicated().sum()),
        "memory_usage_mb": round(mem_bytes / 1024 / 1024, 3),
        "column_names": df.columns.tolist(),
        "schema": compute_schema(df),
    }


def save_snapshot(df: pd.DataFrame, dataset_id: str, step: int) -> str:
    """Save a parquet snapshot for lineage rollback."""
    path = SNAPSHOTS_DIR / f"{dataset_id}_step_{step}.parquet"
    df.to_parquet(path, index=False)
    return str(path)


def load_snapshot(snapshot_path: str) -> pd.DataFrame:
    return pd.read_parquet(snapshot_path)


def get_dataset_path(dataset_id: str) -> Optional[str]:
    """Find the uploaded file for a dataset ID."""
    for f in UPLOADS_DIR.iterdir():
        if f.stem.startswith(dataset_id) and f.suffix in (".csv", ".xlsx", ".json", ".parquet"):
            return str(f)
    return None
