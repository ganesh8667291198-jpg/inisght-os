"""
InsightOS — Upload Router (Module 1)
Handles file upload, ingestion, and basic overview.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import uuid
import shutil
from pathlib import Path

from database import get_db, Dataset as DatasetModel
from services.data_loader import load_dataframe, compute_overview, save_snapshot, UPLOADS_DIR

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("/")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = Path(file.filename).suffix.lower()
    if ext not in (".csv", ".xlsx", ".xls", ".json"):
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    dataset_id = str(uuid.uuid4())[:8]
    save_path = UPLOADS_DIR / f"{dataset_id}{ext}"

    # Save uploaded file
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Load and analyze
    try:
        df = load_dataframe(str(save_path))
    except Exception as e:
        save_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=f"Could not parse file: {e}")

    overview = compute_overview(df, file.filename)

    # Persist to DB
    record = DatasetModel(
        id=dataset_id,
        filename=f"{dataset_id}{ext}",
        original_filename=file.filename,
        file_path=str(save_path),
        file_size=save_path.stat().st_size,
        rows=overview["rows"],
        columns=overview["columns"],
        null_count=overview["null_count"],
        duplicate_count=overview["duplicate_count"],
        memory_usage_mb=overview["memory_usage_mb"],
        schema_info=overview["schema"],
    )
    db.add(record)
    db.commit()

    # Save initial snapshot for lineage
    save_snapshot(df, dataset_id, step=0)

    # Return preview rows
    preview = df.head(50).fillna("").astype(str).to_dict(orient="records")

    return {
        "dataset_id": dataset_id,
        "overview": overview,
        "preview": preview,
        "message": f"Successfully uploaded and analyzed {file.filename}",
    }


@router.get("/datasets")
def list_datasets(db: Session = Depends(get_db)):
    datasets = db.query(DatasetModel).order_by(DatasetModel.uploaded_at.desc()).limit(20).all()
    return [
        {
            "id": d.id,
            "filename": d.original_filename,
            "rows": d.rows,
            "columns": d.columns,
            "memory_mb": d.memory_usage_mb,
            "uploaded_at": str(d.uploaded_at),
            "status": d.status,
        }
        for d in datasets
    ]


@router.get("/{dataset_id}/overview")
def get_overview(dataset_id: str, db: Session = Depends(get_db)):
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found")
    df = load_dataframe(record.file_path)
    overview = compute_overview(df, record.original_filename)
    preview = df.head(100).fillna("").astype(str).to_dict(orient="records")
    return {"overview": overview, "preview": preview}


@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: str, db: Session = Depends(get_db)):
    record = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Dataset not found")
    Path(record.file_path).unlink(missing_ok=True)
    db.delete(record)
    db.commit()
    return {"message": "Dataset deleted"}
