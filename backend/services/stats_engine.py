"""
InsightOS — Statistical Analysis Engine
All descriptive and inferential statistics with plain-language explanations.
"""
import pandas as pd
import numpy as np
from scipy import stats
from typing import Dict, Any, List
import warnings
warnings.filterwarnings("ignore")


def explain_skewness(skew: float) -> str:
    if abs(skew) < 0.5:
        return "The data is approximately symmetric — values are evenly distributed around the mean."
    elif skew > 0.5:
        return f"The data is right-skewed (skew={skew:.2f}). Most values are low, but a long tail extends toward higher values."
    else:
        return f"The data is left-skewed (skew={skew:.2f}). Most values are high, but a long tail extends toward lower values."


def explain_kurtosis(kurt: float) -> str:
    if abs(kurt) < 1:
        return "Normal distribution shape — neither too peaked nor too flat."
    elif kurt > 1:
        return f"Leptokurtic (kurtosis={kurt:.2f}) — more peaked than normal with heavier tails. Extreme values are more likely."
    else:
        return f"Platykurtic (kurtosis={kurt:.2f}) — flatter than normal with lighter tails. Values cluster closer to the mean."


def compute_descriptive_stats(df: pd.DataFrame) -> Dict[str, Any]:
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    result = {}
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) < 2:
            continue
        mean_val = float(series.mean())
        std_val = float(series.std())
        n = len(series)
        se = std_val / np.sqrt(n)
        ci95 = stats.t.interval(0.95, df=n-1, loc=mean_val, scale=se)
        skew = float(series.skew())
        kurt = float(series.kurtosis())

        result[col] = {
            "n": n,
            "mean": round(mean_val, 4),
            "median": round(float(series.median()), 4),
            "mode": round(float(series.mode().iloc[0]), 4) if len(series.mode()) > 0 else None,
            "std": round(std_val, 4),
            "variance": round(float(series.var()), 4),
            "skewness": round(skew, 4),
            "kurtosis": round(kurt, 4),
            "min": round(float(series.min()), 4),
            "max": round(float(series.max()), 4),
            "p5": round(float(series.quantile(0.05)), 4),
            "p25": round(float(series.quantile(0.25)), 4),
            "p75": round(float(series.quantile(0.75)), 4),
            "p95": round(float(series.quantile(0.95)), 4),
            "confidence_interval_95": [round(ci95[0], 4), round(ci95[1], 4)],
            "standard_error": round(se, 4),
            "explanations": {
                "mean": f"On average, {col} is {mean_val:.2f}.",
                "median": f"The middle value of {col} is {series.median():.2f}.",
                "std": f"Values typically vary by ±{std_val:.2f} from the mean.",
                "skewness": explain_skewness(skew),
                "kurtosis": explain_kurtosis(kurt),
                "confidence_interval": f"We are 95% confident the true population mean of {col} lies between {ci95[0]:.2f} and {ci95[1]:.2f}.",
            }
        }
    return result


def compute_correlations(df: pd.DataFrame) -> Dict[str, Any]:
    numeric = df.select_dtypes(include=[np.number])
    if numeric.shape[1] < 2:
        return {}

    pearson = numeric.corr(method="pearson")
    spearman = numeric.corr(method="spearman")
    kendall = numeric.corr(method="kendall")

    # Find strongest pairs
    pairs = []
    cols = list(pearson.columns)
    for i in range(len(cols)):
        for j in range(i+1, len(cols)):
            r = pearson.iloc[i, j]
            if not np.isnan(r):
                pairs.append({
                    "col1": cols[i],
                    "col2": cols[j],
                    "pearson": round(float(r), 4),
                    "spearman": round(float(spearman.iloc[i, j]), 4),
                    "kendall": round(float(kendall.iloc[i, j]), 4),
                    "strength": (
                        "very strong" if abs(r) > 0.8
                        else "strong" if abs(r) > 0.6
                        else "moderate" if abs(r) > 0.4
                        else "weak" if abs(r) > 0.2
                        else "negligible"
                    ),
                    "direction": "positive" if r > 0 else "negative",
                    "explanation": (
                        f"{cols[i]} and {cols[j]} have a {'positive' if r > 0 else 'negative'} "
                        f"{'very strong' if abs(r) > 0.8 else 'strong' if abs(r) > 0.6 else 'moderate' if abs(r) > 0.4 else 'weak'} "
                        f"correlation (r={r:.2f}). "
                        f"{'As one increases, the other tends to increase as well.' if r > 0 else 'As one increases, the other tends to decrease.'}"
                    )
                })

    pairs.sort(key=lambda x: abs(x["pearson"]), reverse=True)
    return {
        "pearson": pearson.round(4).to_dict(),
        "spearman": spearman.round(4).to_dict(),
        "kendall": kendall.round(4).to_dict(),
        "top_pairs": pairs[:20],
    }


def run_hypothesis_tests(df: pd.DataFrame) -> Dict[str, Any]:
    results = {}
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

    # T-tests between numeric pairs
    ttests = []
    for i in range(len(numeric_cols)):
        for j in range(i+1, min(i+4, len(numeric_cols))):
            col1 = numeric_cols[i]
            col2 = numeric_cols[j]
            a = df[col1].dropna()
            b = df[col2].dropna()
            if len(a) >= 2 and len(b) >= 2:
                t_stat, p_val = stats.ttest_ind(a, b)
                ttests.append({
                    "test": "independent t-test",
                    "col1": col1, "col2": col2,
                    "t_statistic": round(float(t_stat), 4),
                    "p_value": round(float(p_val), 6),
                    "significant": bool(p_val < 0.05),
                    "explanation": (
                        f"The means of {col1} and {col2} are "
                        f"{'significantly different' if p_val < 0.05 else 'not significantly different'} "
                        f"(t={t_stat:.2f}, p={p_val:.4f})."
                    )
                })

    # ANOVA: numeric vs categorical
    anova_results = []
    for cat_col in cat_cols[:3]:
        for num_col in numeric_cols[:3]:
            groups = [df[df[cat_col] == val][num_col].dropna()
                      for val in df[cat_col].unique() if len(df[df[cat_col] == val][num_col].dropna()) >= 2]
            if len(groups) >= 2:
                try:
                    f_stat, p_val = stats.f_oneway(*groups)
                    anova_results.append({
                        "test": "one-way ANOVA",
                        "numeric_col": num_col,
                        "categorical_col": cat_col,
                        "f_statistic": round(float(f_stat), 4),
                        "p_value": round(float(p_val), 6),
                        "significant": bool(p_val < 0.05),
                        "explanation": (
                            f"ANOVA test: {num_col} values "
                            f"{'do' if p_val < 0.05 else 'do not'} differ significantly across {cat_col} groups "
                            f"(F={f_stat:.2f}, p={p_val:.4f})."
                        )
                    })
                except Exception:
                    pass

    # Chi-square for categorical pairs
    chi2_results = []
    for i in range(len(cat_cols)):
        for j in range(i+1, min(i+3, len(cat_cols))):
            try:
                contingency = pd.crosstab(df[cat_cols[i]], df[cat_cols[j]])
                chi2, p_val, dof, expected = stats.chi2_contingency(contingency)
                chi2_results.append({
                    "test": "chi-square",
                    "col1": cat_cols[i], "col2": cat_cols[j],
                    "chi2_statistic": round(float(chi2), 4),
                    "p_value": round(float(p_val), 6),
                    "degrees_of_freedom": int(dof),
                    "significant": bool(p_val < 0.05),
                    "explanation": (
                        f"{cat_cols[i]} and {cat_cols[j]} are "
                        f"{'statistically associated' if p_val < 0.05 else 'independent'} "
                        f"(χ²={chi2:.2f}, p={p_val:.4f}, df={dof})."
                    )
                })
            except Exception:
                pass

    return {
        "t_tests": ttests[:10],
        "anova": anova_results[:5],
        "chi_square": chi2_results[:5],
    }
