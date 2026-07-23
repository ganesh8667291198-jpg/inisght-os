"""
InsightOS — Main FastAPI Application
Production-grade API server for automated EDA and pattern discovery.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from database import init_db
from routers.upload import router as upload_router
from routers.analysis import (
    health_router, profiling_router, cleaning_router, eda_router,
    stats_router, patterns_router, anomaly_router, clusters_router,
    ts_router, story_router, lineage_router, reports_router,
    comparison_router
)

# ── Initialize Database ──────────────────────────────────────────────────────
init_db()

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="InsightOS API",
    description="Intelligent Platform for Automated Exploratory Data Analysis and Pattern Discovery",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(upload_router)
app.include_router(health_router)
app.include_router(profiling_router)
app.include_router(cleaning_router)
app.include_router(eda_router)
app.include_router(stats_router)
app.include_router(patterns_router)
app.include_router(anomaly_router)
app.include_router(clusters_router)
app.include_router(ts_router)
app.include_router(story_router)
app.include_router(lineage_router)
app.include_router(reports_router)
app.include_router(comparison_router)


@app.get("/")
def root():
    return {
        "name": "InsightOS API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/api/docs",
    }


@app.get("/api/health-check")
def health_check():
    return {"status": "healthy", "service": "InsightOS"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
