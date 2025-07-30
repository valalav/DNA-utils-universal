# c:\projects\DNA-utils-universal\ystr_predictor\models\experiment_tracker.py
import mlflow
import mlflow.sklearn
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
from pathlib import Path
from datetime import datetime
import logging

class ExperimentTracker:
    def __init__(self, experiment_name: str = "haplogroup_prediction"):
        self.experiment_name = experiment_name
        mlflow.set_experiment(experiment_name)
        self.current_run = None
        self.visualizations_dir = Path("visualizations")
        self.visualizations_dir.mkdir(exist_ok=True)
        
    def start_run(self, run_name: str = None):
        """Начинает новый эксперимент"""
        if run_name is None:
            run_name = f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.current_run = mlflow.start_run(run_name=run_name)
        return self.current_run
        
    def log_params(self, params: Dict):
        """Логирует параметры модели"""
        mlflow.log_params(params)
        
    def log_metrics(self, metrics: Dict):
        """Логирует метрики"""
        mlflow.log_metrics(metrics)
        
    def log_model(self, model: object, model_name: str):
        """Сохраняет модель"""
        mlflow.sklearn.log_model(model, model_name)
        
    def create_interactive_plots(self, model_results: Dict) -> Dict[str, str]:
        """Создает интерактивные визуализации результатов"""
        plots = {}
        
        # График важности признаков
        if 'feature_importance' in model_results:
            fig = px.bar(
                x=list(model_results['feature_importance'].values()),
                y=list(model_results['feature_importance'].keys()),
                orientation='h',
                title='Feature Importance'
            )
            
            path = self.visualizations_dir / "feature_importance.html"
            fig.write_html(str(path))
            plots['feature_importance'] = str(path)
            mlflow.log_artifact(str(path))
        
        # График распределения предсказаний
        if 'predictions' in model_results:
            fig = px.histogram(
                x=[p['probability'] for p in model_results['predictions']],
                nbins=50,
                title='Prediction Probability Distribution'
            )
            
            path = self.visualizations_dir / "prediction_distribution.html"
            fig.write_html(str(path))
            plots['prediction_distribution'] = str(path)
            mlflow.log_artifact(str(path))
            
        # График confusion matrix
        if 'confusion_matrix' in model_results:
            fig = px.imshow(
                model_results['confusion_matrix'],
                title='Confusion Matrix'
            )
            
            path = self.visualizations_dir / "confusion_matrix.html"
            fig.write_html(str(path))
            plots['confusion_matrix'] = str(path)
            mlflow.log_artifact(str(path))
            
        return plots
        
    def create_shap_visualization(self, shap_values: np.ndarray, 
                                feature_names: List[str]) -> str:
        """Создает интерактивную визуализацию SHAP-значений"""
        fig = go.Figure()
        
        for i, feature in enumerate(feature_names):
            fig.add_trace(go.Box(
                y=shap_values[:, i],
                name=feature,
                boxpoints='all',
                jitter=0.3,
                pointpos=-1.8
            ))
            
        fig.update_layout(
            title='SHAP Values Distribution by Feature',
            yaxis_title='SHAP value',
            showlegend=False,
            height=800
        )
        
        path = self.visualizations_dir / "shap_values.html"
        fig.write_html(str(path))
        mlflow.log_artifact(str(path))
        return str(path)
        
    def create_calibration_plot(self, prob_true: np.ndarray, 
                              prob_pred: np.ndarray) -> str:
        """Создает график калибровки вероятностей"""
        fig = go.Figure()
        
        # Идеальная калибровка
        fig.add_trace(go.Scatter(
            x=[0, 1],
            y=[0, 1],
            mode='lines',
            name='Perfectly calibrated',
            line=dict(dash='dash')
        ))
        
        # Фактическая калибровка
        fig.add_trace(go.Scatter(
            x=prob_pred,
            y=prob_true,
            mode='lines+markers',
            name='Model calibration'
        ))
        
        fig.update_layout(
            title='Calibration Plot',
            xaxis_title='Mean predicted probability',
            yaxis_title='Fraction of positives'
        )
        
        path = self.visualizations_dir / "calibration_plot.html"
        fig.write_html(str(path))
        mlflow.log_artifact(str(path))
        return str(path)
        
    def create_optimization_dashboard(self, history: List[Dict]) -> str:
        """Создает дашборд оптимизации гиперпараметров"""
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=(
                'Optimization History',
                'Parameter Importance',
                'Parameter Correlations',
                'Best Model Performance'
            )
        )
        
        # График истории оптимизации
        df = pd.DataFrame(history)
        fig.add_trace(
            go.Scatter(
                x=df.index,
                y=df['score'],
                mode='lines+markers',
                name='Score'
            ),
            row=1, col=1
        )
        
        # Важность параметров
        param_importance = {}
        for params in df['params']:
            for name, value in params.items():
                if name not in param_importance:
                    param_importance[name] = []
                param_importance[name].append(value)
                
        for param, values in param_importance.items():
            corr = np.corrcoef(values, df['score'])[0, 1]
            param_importance[param] = abs(corr)
            
        fig.add_trace(
            go.Bar(
                x=list(param_importance.values()),
                y=list(param_importance.keys()),
                orientation='h'
            ),
            row=1, col=2
        )
        
        # График лучшей модели
        best_idx = df['score'].idxmax()
        fig.add_trace(
            go.Scatter(
                x=[best_idx],
                y=[df.loc[best_idx, 'score']],
                mode='markers',
                marker=dict(size=15),
                name='Best Model'
            ),
            row=2, col=2
        )
        
        fig.update_layout(height=800, showlegend=False)
        
        path = self.visualizations_dir / "optimization_dashboard.html"
        fig.write_html(str(path))
        mlflow.log_artifact(str(path))
        return str(path)
        
    def end_run(self):
        """Завершает текущий эксперимент"""
        if self.current_run:
            mlflow.end_run()
            
    def get_best_run(self) -> Dict:
        """Возвращает информацию о лучшем эксперименте"""
        client = mlflow.tracking.MlflowClient()
        experiment = client.get_experiment_by_name(self.experiment_name)
        
        runs = client.search_runs(
            experiment_ids=[experiment.experiment_id],
            order_by=["metrics.score DESC"]
        )
        
        if runs:
            best_run = runs[0]
            return {
                'run_id': best_run.info.run_id,
                'metrics': best_run.data.metrics,
                'params': best_run.data.params,
                'artifacts': [
                    artifact.path
                    for artifact in client.list_artifacts(best_run.info.run_id)
                ]
            }
        return None