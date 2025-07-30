# c:\projects\DNA-utils-universal\ystr_predictor\ab_testing\analytics_service.py
from typing import List, Dict, Any
import pandas as pd
import numpy as np
from scipy import stats
import plotly.graph_objects as go
from plotly.subplots import make_subplots

class AnalyticsService:
    @staticmethod
    def analyze_experiment(results: Dict[str, Any]) -> Dict[str, Any]:
        """Анализ результатов эксперимента"""
        analysis = {
            "summary": {},
            "recommendations": [],
            "visualizations": {}
        }

        # Анализируем каждую метрику
        for metric, metric_data in results["metrics"].items():
            metric_analysis = {}

            for variant, data in metric_data.items():
                if data["significant"]:
                    impact = "positive" if data["difference"] > 0 else "negative"
                    confidence = 1 - data["p_value"]

                    metric_analysis[variant] = {
                        "impact": impact,
                        "confidence": confidence,
                        "effect": data["effect_size"]
                    }

                    # Формируем рекомендации
                    if impact == "positive" and confidence > 0.95:
                        analysis["recommendations"].append(
                            f"Consider implementing {variant} for {metric} "
                            f"(Expected improvement: {data['difference']:.1f}%)"
                        )

            analysis["summary"][metric] = metric_analysis

        return analysis

    @staticmethod
    def create_visualizations(results: Dict[str, Any]) -> Dict[str, str]:
        """Создание визуализаций результатов"""
        plots = {}

        # График конверсий
        fig = make_subplots(rows=len(results["metrics"]), cols=1,
                           subplot_titles=list(results["metrics"].keys()))

        for i, (metric, metric_data) in enumerate(results["metrics"].items(), 1):
            variants = []
            means = []
            errors = []

            for variant, data in metric_data.items():
                variants.append(variant)
                means.append(data["mean"])
                errors.append(stats.sem([data["mean"]] * data["count"]))

            fig.add_trace(
                go.Bar(
                    name=metric,
                    x=variants,
                    y=means,
                    error_y=dict(type='data', array=errors),
                    showlegend=False
                ),
                row=i, col=1
            )

        fig.update_layout(height=300 * len(results["metrics"]))
        plots["conversion"] = fig

        # График значимости
        significance_data = []
        for metric, metric_data in results["metrics"].items():
            for variant, data in metric_data.items():
                significance_data.append({
                    "metric": metric,
                    "variant": variant,
                    "p_value": data["p_value"],
                    "significant": data["significant"]
                })

        df = pd.DataFrame(significance_data)
        fig = go.Figure(data=[
            go.Scatter(
                x=df["p_value"],
                y=df["metric"],
                mode='markers',
                marker=dict(
                    size=12,
                    color=['green' if x else 'red' for x in df["significant"]],
                    symbol='square'
                ),
                text=df["variant"]
            )
        ])

        fig.add_shape(
            type='line',
            x0=0.05, x1=0.05,
            y0=-1, y1=len(df["metric"].unique()),
            line=dict(color='gray', dash='dash')
        )

        fig.update_layout(
            title="Statistical Significance by Metric",
            xaxis_title="p-value",
            yaxis_title="Metric"
        )

        plots["significance"] = fig

        return plots