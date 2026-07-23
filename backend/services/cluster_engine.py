"""
InsightOS — Cluster Analysis Engine
K-Means, Hierarchical Clustering, and DBSCAN with explanations.
"""
import pandas as pd
import numpy as np
from typing import Dict, Any, List
import warnings
warnings.filterwarnings("ignore")

try:
    from sklearn.cluster import KMeans, AgglomerativeClustering, DBSCAN
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import silhouette_score
    from sklearn.decomposition import PCA
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


def prepare_numeric_data(df: pd.DataFrame) -> tuple:
    numeric = df.select_dtypes(include=[np.number]).dropna()
    if numeric.empty:
        return None, None, None
    scaler = StandardScaler()
    scaled = scaler.fit_transform(numeric)
    return numeric, scaled, list(numeric.columns)


def reduce_to_2d(scaled: np.ndarray) -> np.ndarray:
    if scaled.shape[1] <= 2:
        return scaled
    pca = PCA(n_components=2, random_state=42)
    return pca.fit_transform(scaled)


def run_kmeans(numeric: pd.DataFrame, scaled: np.ndarray, coords_2d: np.ndarray, k: int = 3) -> Dict[str, Any]:
    if not SKLEARN_AVAILABLE:
        return {"error": "scikit-learn not available"}
    k = min(k, max(2, len(numeric) // 3))
    model = KMeans(n_clusters=k, random_state=42, n_init=10)
    labels = model.fit_predict(scaled)
    try:
        sil = float(silhouette_score(scaled, labels))
    except Exception:
        sil = 0.0

    cluster_stats = []
    for cluster_id in range(k):
        mask = labels == cluster_id
        cluster_data = numeric[mask]
        cluster_stats.append({
            "cluster": int(cluster_id),
            "size": int(mask.sum()),
            "pct": round(mask.mean() * 100, 2),
            "centroid": {col: round(float(v), 4) for col, v in zip(numeric.columns, model.cluster_centers_[cluster_id])},
            "description": _describe_cluster(cluster_data, numeric)
        })

    scatter_data = [
        {"x": round(float(coords_2d[i, 0]), 4), "y": round(float(coords_2d[i, 1]), 4),
         "cluster": int(labels[i]), "index": int(i)}
        for i in range(len(labels))
    ]

    return {
        "method": "K-Means",
        "k": k,
        "silhouette_score": round(sil, 4),
        "inertia": round(float(model.inertia_), 4),
        "cluster_stats": cluster_stats,
        "scatter_data": scatter_data[:500],
        "quality": "good" if sil > 0.5 else ("fair" if sil > 0.25 else "poor"),
        "explanation": f"K-Means found {k} clusters with silhouette score {sil:.2f}. {'Good cluster separation.' if sil > 0.5 else 'Clusters partially overlap.'}"
    }


def run_hierarchical(numeric: pd.DataFrame, scaled: np.ndarray, coords_2d: np.ndarray, k: int = 3) -> Dict[str, Any]:
    if not SKLEARN_AVAILABLE:
        return {"error": "scikit-learn not available"}
    k = min(k, max(2, len(numeric) // 3))
    model = AgglomerativeClustering(n_clusters=k, linkage="ward")
    labels = model.fit_predict(scaled)
    try:
        sil = float(silhouette_score(scaled, labels))
    except Exception:
        sil = 0.0
    scatter_data = [
        {"x": round(float(coords_2d[i, 0]), 4), "y": round(float(coords_2d[i, 1]), 4),
         "cluster": int(labels[i])}
        for i in range(len(labels))
    ]
    return {
        "method": "Hierarchical (Ward)",
        "k": k,
        "silhouette_score": round(sil, 4),
        "scatter_data": scatter_data[:500],
        "explanation": f"Hierarchical clustering (Ward linkage) found {k} clusters with silhouette score {sil:.2f}."
    }


def run_dbscan(numeric: pd.DataFrame, scaled: np.ndarray, coords_2d: np.ndarray) -> Dict[str, Any]:
    if not SKLEARN_AVAILABLE:
        return {"error": "scikit-learn not available"}
    model = DBSCAN(eps=0.5, min_samples=5)
    labels = model.fit_predict(scaled)
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    noise_count = int((labels == -1).sum())
    try:
        sil = float(silhouette_score(scaled, labels)) if n_clusters > 1 else 0.0
    except Exception:
        sil = 0.0
    scatter_data = [
        {"x": round(float(coords_2d[i, 0]), 4), "y": round(float(coords_2d[i, 1]), 4),
         "cluster": int(labels[i])}
        for i in range(len(labels))
    ]
    return {
        "method": "DBSCAN",
        "n_clusters": n_clusters,
        "noise_points": noise_count,
        "silhouette_score": round(sil, 4),
        "scatter_data": scatter_data[:500],
        "explanation": f"DBSCAN found {n_clusters} clusters and {noise_count} noise points (potential outliers)."
    }


def _describe_cluster(cluster_df: pd.DataFrame, full_df: pd.DataFrame) -> str:
    descriptions = []
    for col in cluster_df.columns[:3]:
        cluster_mean = cluster_df[col].mean()
        overall_mean = full_df[col].mean()
        ratio = cluster_mean / overall_mean if overall_mean != 0 else 1
        if ratio > 1.2:
            descriptions.append(f"high {col}")
        elif ratio < 0.8:
            descriptions.append(f"low {col}")
    return ", ".join(descriptions) if descriptions else "average across all features"


def run_full_clustering(df: pd.DataFrame) -> Dict[str, Any]:
    numeric, scaled, cols = prepare_numeric_data(df)
    if numeric is None or len(numeric) < 6:
        return {"error": "Insufficient numeric data for clustering"}
    coords_2d = reduce_to_2d(scaled)
    return {
        "features_used": cols,
        "n_records": len(numeric),
        "kmeans": run_kmeans(numeric, scaled, coords_2d),
        "hierarchical": run_hierarchical(numeric, scaled, coords_2d),
        "dbscan": run_dbscan(numeric, scaled, coords_2d),
        "pca_coords": [{"x": round(float(coords_2d[i, 0]), 4), "y": round(float(coords_2d[i, 1]), 4)}
                       for i in range(min(len(coords_2d), 500))],
    }
