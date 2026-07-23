"""
InsightOS — Database Configuration
SQLite via SQLAlchemy for metadata persistence.
"""
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = "sqlite:///./insightOS.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Dataset(Base):
    """Persisted metadata for every uploaded dataset."""
    __tablename__ = "datasets"

    id = Column(String, primary_key=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer)
    rows = Column(Integer)
    columns = Column(Integer)
    null_count = Column(Integer)
    duplicate_count = Column(Integer)
    memory_usage_mb = Column(Float)
    schema_info = Column(JSON)          # column dtypes / sample
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="ready")  # ready | processing | error


class TransformationHistory(Base):
    """Records every cleaning/transformation step for lineage."""
    __tablename__ = "transformations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_id = Column(String, nullable=False)
    step_number = Column(Integer)
    operation = Column(String)          # e.g. "fill_missing_mean"
    column_affected = Column(String)
    parameters = Column(JSON)
    rows_affected = Column(Integer)
    description = Column(Text)
    applied_at = Column(DateTime, default=datetime.utcnow)
    snapshot_path = Column(String)      # path to parquet snapshot for rollback


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
