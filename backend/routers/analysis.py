"""
InsightOS — All Analysis Routers
Health, Profiling, EDA, Statistics, Patterns, Anomaly, Clusters, Time Series, Story, Reports.
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Body
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import pandas as pd
import json
from pathlib import Path

from database import get_db, Dataset as DatasetModel, TransformationHistory
from services.data_loader import load_dataframe
from services.health_engine import compute_overall_health
from services.profiler import profile_dataset
from services.eda_engine import run_full_eda
from services.stats_engine import compute_descriptive_stats, compute_correlations, run_hypothesis_tests
from services.pattern_engine import discover_patterns
from services.anomaly_engine import run_full_anomaly_detection
from services.cluster_engine import run_full_clustering
from services.ts_engine import run_time_series_analysis
from services.story_engine import generate_story
from services.report_engine import generate_html_report, generate_pdf_report, generate_docx_report

# ─── Health ──────────────────────────────────────────────────────────────────
health_router = APIRouter(prefix="/api/health", tags=["health"])

@health_router.get("/{dataset_id}")
def get_health(dataset_id: str, db: Session = Depends(get_db)):
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(404, "Dataset not found")
    df = load_dataframe(record.file_path)
    return compute_overall_health(df)


# ─── Profiling ────────────────────────────────────────────────────────────────
profiling_router = APIRouter(prefix="/api/profiling", tags=["profiling"])

@profiling_router.get("/{dataset_id}")
def get_profile(dataset_id: str, db: Session = Depends(get_db)):
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(404, "Dataset not found")
    df = load_dataframe(record.file_path)
    return profile_dataset(df)


# ─── Cleaning ────────────────────────────────────────────────────────────────
cleaning_router = APIRouter(prefix="/api/cleaning", tags=["cleaning"])

@cleaning_router.get("/{dataset_id}/suggestions")
def get_cleaning_suggestions(dataset_id: str, db: Session = Depends(get_db)):
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(404, "Dataset not found")
    df = load_dataframe(record.file_path)
    suggestions = []
    for col in df.columns:
        null_pct = df[col].isna().mean() * 100
        if null_pct > 0:
            dtype = str(df[col].dtype)
            if "float" in dtype or "int" in dtype:
                methods = ["mean", "median", "forward_fill", "backward_fill", "drop"]
            else:
                methods = ["mode", "forward_fill", "backward_fill", "drop"]
            suggestions.append({
                "column": col,
                "issue": "missing_values",
                "severity": "high" if null_pct > 20 else "medium" if null_pct > 5 else "low",
                "null_pct": round(null_pct, 2),
                "recommended_method": "median" if "float" in dtype or "int" in dtype else "mode",
                "available_methods": methods,
            })
    dup_count = int(df.duplicated().sum())
    if dup_count > 0:
        suggestions.append({
            "column": "*",
            "issue": "duplicates",
            "severity": "medium",
            "count": dup_count,
            "recommended_method": "drop_duplicates",
        })
    return {"suggestions": suggestions, "total": len(suggestions)}


@cleaning_router.post("/{dataset_id}/apply")
def apply_cleaning(dataset_id: str, operations: list = Body(...), db: Session = Depends(get_db)):
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(404, "Dataset not found")
    df = load_dataframe(record.file_path)
    history = []
    for op in operations:
        col = op.get("column")
        method = op.get("method")
        rows_before = df[col].isna().sum() if col and col in df.columns else 0
        if method == "mean" and col and col in df.columns:
            df[col] = df[col].fillna(df[col].mean())
        elif method == "median" and col and col in df.columns:
            df[col] = df[col].fillna(df[col].median())
        elif method == "mode" and col and col in df.columns:
            df[col] = df[col].fillna(df[col].mode().iloc[0])
        elif method == "forward_fill" and col and col in df.columns:
            df[col] = df[col].ffill()
        elif method == "backward_fill" and col and col in df.columns:
            df[col] = df[col].bfill()
        elif method == "drop_duplicates":
            df = df.drop_duplicates()
        elif method == "drop" and col and col in df.columns:
            df = df.dropna(subset=[col])
        rows_affected = int(rows_before - df[col].isna().sum()) if col and col in df.columns else 0
        history.append({"operation": method, "column": col, "rows_affected": rows_affected})

        # Persist to DB
        step_count = db.query(TransformationHistory).filter(TransformationHistory.dataset_id == dataset_id).count()
        from services.data_loader import save_snapshot
        snap = save_snapshot(df, dataset_id, step=step_count + 1)
        db.add(TransformationHistory(
            dataset_id=dataset_id, step_number=step_count+1,
            operation=method, column_affected=col, rows_affected=rows_affected,
            description=f"Applied {method} on {col}", snapshot_path=snap
        ))
    db.commit()
    df.to_csv(record.file_path if record.file_path.endswith(".csv") else record.file_path, index=False)
    return {"message": "Cleaning applied", "operations": history, "rows": len(df), "columns": len(df.columns)}


# ─── EDA ─────────────────────────────────────────────────────────────────────
eda_router = APIRouter(prefix="/api/eda", tags=["eda"])

@eda_router.get("/{dataset_id}")
def get_eda(dataset_id: str, db: Session = Depends(get_db)):
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(404, "Dataset not found")
    df = load_dataframe(record.file_path)
    return run_full_eda(df)


# ─── Statistics ──────────────────────────────────────────────────────────────
stats_router = APIRouter(prefix="/api/statistics", tags=["statistics"])

@stats_router.get("/{dataset_id}")
def get_statistics(dataset_id: str, db: Session = Depends(get_db)):
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(404, "Dataset not found")
    df = load_dataframe(record.file_path)
    return {
        "descriptive": compute_descriptive_stats(df),
        "correlations": compute_correlations(df),
        "hypothesis_tests": run_hypothesis_tests(df),
    }


# ─── Patterns ────────────────────────────────────────────────────────────────
patterns_router = APIRouter(prefix="/api/patterns", tags=["patterns"])

@patterns_router.get("/{dataset_id}")
def get_patterns(dataset_id: str, db: Session = Depends(get_db)):
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(404, "Dataset not found")
    df = load_dataframe(record.file_path)
    return discover_patterns(df)


# ─── Anomaly ─────────────────────────────────────────────────────────────────
anomaly_router = APIRouter(prefix="/api/anomaly", tags=["anomaly"])

@anomaly_router.get("/{dataset_id}")
def get_anomalies(dataset_id: str, db: Session = Depends(get_db)):
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(404, "Dataset not found")
    df = load_dataframe(record.file_path)
    return run_full_anomaly_detection(df)


# ─── Clusters ────────────────────────────────────────────────────────────────
clusters_router = APIRouter(prefix="/api/clusters", tags=["clusters"])

@clusters_router.get("/{dataset_id}")
def get_clusters(dataset_id: str, db: Session = Depends(get_db)):
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(404, "Dataset not found")
    df = load_dataframe(record.file_path)
    return run_full_clustering(df)


# ─── Time Series ─────────────────────────────────────────────────────────────
ts_router = APIRouter(prefix="/api/timeseries", tags=["timeseries"])

@ts_router.get("/{dataset_id}")
def get_timeseries(dataset_id: str, db: Session = Depends(get_db)):
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(404, "Dataset not found")
    df = load_dataframe(record.file_path)
    return run_time_series_analysis(df)


# ─── Storytelling ────────────────────────────────────────────────────────────
story_router = APIRouter(prefix="/api/story", tags=["story"])

@story_router.get("/{dataset_id}")
def get_story(dataset_id: str, db: Session = Depends(get_db)):
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(404, "Dataset not found")
    df = load_dataframe(record.file_path)
    health = compute_overall_health(df)
    return generate_story(df, record.original_filename, health["overall_score"])


# ─── Lineage ─────────────────────────────────────────────────────────────────
lineage_router = APIRouter(prefix="/api/lineage", tags=["lineage"])

@lineage_router.get("/{dataset_id}")
def get_lineage(dataset_id: str, db: Session = Depends(get_db)):
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(404, "Dataset not found")
    steps = db.query(TransformationHistory).filter(
        TransformationHistory.dataset_id == dataset_id
    ).order_by(TransformationHistory.step_number).all()
    return {
        "dataset_id": dataset_id,
        "filename": record.original_filename,
        "steps": [
            {
                "step": s.step_number, "operation": s.operation,
                "column": s.column_affected, "description": s.description,
                "rows_affected": s.rows_affected, "applied_at": str(s.applied_at),
            }
            for s in steps
        ]
    }


# ─── Reports ─────────────────────────────────────────────────────────────────
reports_router = APIRouter(prefix="/api/reports", tags=["reports"])

@reports_router.get("/{dataset_id}/{format}")
def generate_report(dataset_id: str, format: str, db: Session = Depends(get_db)):
    if format not in ("html", "pdf", "docx"):
        raise HTTPException(400, "Format must be html, pdf, or docx")
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(404, "Dataset not found")
    df = load_dataframe(record.file_path)
    health = compute_overall_health(df)
    story = generate_story(df, record.original_filename, health["overall_score"])

    if format == "html":
        path = generate_html_report(story, health, record.original_filename, dataset_id)
        media_type = "text/html"
    elif format == "pdf":
        path = generate_pdf_report(story, health, record.original_filename, dataset_id)
        media_type = "application/pdf"
    else:
        path = generate_docx_report(story, health, record.original_filename, dataset_id)
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    if path.startswith("ERROR"):
        raise HTTPException(500, path)
    return FileResponse(path, media_type=media_type, filename=Path(path).name)


# ─── Dataset Comparison ───────────────────────────────────────────────────────
comparison_router = APIRouter(prefix="/api/comparison", tags=["comparison"])

@comparison_router.get("/{dataset_id_a}/{dataset_id_b}")
def compare_datasets(dataset_id_a: str, dataset_id_b: str, db: Session = Depends(get_db)):
    rec_a = db.query(DatasetModel).filter(DatasetModel.id == dataset_id_a).first()
    rec_b = db.query(DatasetModel).filter(DatasetModel.id == dataset_id_b).first()
    if not rec_a or not rec_b:
        raise HTTPException(404, "One or both datasets not found")
    df_a = load_dataframe(rec_a.file_path)
    df_b = load_dataframe(rec_b.file_path)

    cols_a = set(df_a.columns)
    cols_b = set(df_b.columns)

    schema_diff = {
        "only_in_a": list(cols_a - cols_b),
        "only_in_b": list(cols_b - cols_a),
        "common": list(cols_a & cols_b),
    }

    stat_diffs = {}
    for col in list(cols_a & cols_b)[:10]:
        if df_a[col].dtype in [float, int] and df_b[col].dtype in [float, int]:
            stat_diffs[col] = {
                "mean_a": round(float(df_a[col].mean()), 4),
                "mean_b": round(float(df_b[col].mean()), 4),
                "std_a": round(float(df_a[col].std()), 4),
                "std_b": round(float(df_b[col].std()), 4),
                "null_pct_a": round(df_a[col].isna().mean() * 100, 2),
                "null_pct_b": round(df_b[col].isna().mean() * 100, 2),
                "drift_detected": abs(df_a[col].mean() - df_b[col].mean()) > df_a[col].std(),
            }

    return {
        "dataset_a": {"id": dataset_id_a, "filename": rec_a.original_filename, "rows": len(df_a), "cols": len(df_a.columns)},
        "dataset_b": {"id": dataset_id_b, "filename": rec_b.original_filename, "rows": len(df_b), "cols": len(df_b.columns)},
        "schema_diff": schema_diff,
        "statistical_diff": stat_diffs,
        "summary": f"Found {len(schema_diff['only_in_a'])} columns only in A, {len(schema_diff['only_in_b'])} only in B, {len(schema_diff['common'])} in common.",
    }
