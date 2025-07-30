# c:\projects\DNA-utils-universal\ystr_predictor\models\visualization.py
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.manifold import TSNE
from sklearn.decomposition import PCA
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
import plotly.express as px
import plotly.graph_objects as go
from pathlib import Path
import logging

class HaplogroupVisualizer:
    def __init__(self, save_dir: str = "static/plots"):
        self.save_dir = Path(save_dir)
        self.save_dir.mkdir(parents=True, exist_ok=True)
        
    def plot_feature_importance(self, importance_dict: Dict[str, Dict[str, float]]) -> Dict[str, str]:
        """Создает графики важности признаков для каждого уровня"""
        plot_paths = {}
        
        for level, importances in importance_dict.items():
            # Берем топ-20 признаков
            top_features = dict(sorted(importances.items(), key=lambda x: x[1], reverse=True)[:20])
            
            fig = go.Figure(go.Bar(
                x=list(top_features.values()),
                y=list(top_features.keys()),
                orientation='h'
            ))
            
            fig.update_layout(
                title=f'Top 20 Important Features for {level.capitalize()} Level',
                xaxis_title='Importance Score',
                yaxis_title='Feature',
                height=800
            )
            
            plot_path = self.save_dir / f"feature_importance_{level}.html"
            fig.write_html(str(plot_path))
            plot_paths[level] = str(plot_path)
            
        return plot_paths
    
    def create_embeddings_plot(self, X: pd.DataFrame, y: pd.Series, 
                             method: str = 'tsne') -> str:
        """Создает визуализацию распределения данных в 2D"""
        if method == 'tsne':
            embedding = TSNE(n_components=2, random_state=42)
        else:
            embedding = PCA(n_components=2, random_state=42)
            
        X_embedded = embedding.fit_transform(X)
        
        fig = px.scatter(
            x=X_embedded[:, 0],
            y=X_embedded[:, 1],
            color=y,
            title=f'Haplogroup Distribution ({method.upper()})',
            labels={'color': 'Haplogroup'},
            height=800
        )
        
        plot_path = self.save_dir / f"distribution_{method}.html"
        fig.write_html(str(plot_path))
        return str(plot_path)
    
    def plot_confusion_matrix(self, confusion_matrices: Dict[str, np.ndarray], 
                            class_names: Dict[str, List[str]]) -> Dict[str, str]:
        """Создает интерактивные тепловые карты матриц ошибок"""
        plot_paths = {}
        
        for level, cm in confusion_matrices.items():
            names = class_names[level]
            
            fig = px.imshow(
                cm,
                labels=dict(x="Predicted", y="True", color="Count"),
                x=names,
                y=names,
                aspect="auto",
                title=f'Confusion Matrix for {level.capitalize()} Level'
            )
            
            plot_path = self.save_dir / f"confusion_matrix_{level}.html"
            fig.write_html(str(plot_path))
            plot_paths[level] = str(plot_path)
            
        return plot_paths
    
    def plot_metrics_comparison(self, metrics: Dict[str, Dict[str, float]]) -> str:
        """Создает сравнительный график метрик по уровням"""
        levels = list(metrics.keys())
        metric_names = ['accuracy', 'macro_f1', 'weighted_f1']
        
        fig = go.Figure()
        
        for metric in metric_names:
            values = [metrics[level][metric] for level in levels]
            errors = [metrics[level][f'std_{metric}'] for level in levels]
            
            fig.add_trace(go.Bar(
                name=metric,
                x=levels,
                y=values,
                error_y=dict(type='data', array=errors, visible=True)
            ))
            
        fig.update_layout(
            title='Performance Metrics by Level',
            xaxis_title='Level',
            yaxis_title='Score',
            barmode='group'
        )
        
        plot_path = self.save_dir / "metrics_comparison.html"
        fig.write_html(str(plot_path))
        return str(plot_path)
    
    def plot_learning_curves(self, history: Dict[str, List[float]]) -> str:
        """Создает графики кривых обучения"""
        fig = go.Figure()
        
        for metric, values in history.items():
            fig.add_trace(go.Scatter(
                y=values,
                name=metric,
                mode='lines'
            ))
            
        fig.update_layout(
            title='Learning Curves',
            xaxis_title='Epoch',
            yaxis_title='Score'
        )
        
        plot_path = self.save_dir / "learning_curves.html"
        fig.write_html(str(plot_path))
        return str(plot_path)
    
    def create_marker_correlation_heatmap(self, X: pd.DataFrame) -> str:
        """Создает тепловую карту корреляций между маркерами"""
        corr = X.corr()
        
        fig = px.imshow(
            corr,
            labels=dict(x="Marker", y="Marker", color="Correlation"),
            x=corr.columns,
            y=corr.columns,
            aspect="auto",
            title='STR Markers Correlation Heatmap'
        )
        
        plot_path = self.save_dir / "correlation_heatmap.html"
        fig.write_html(str(plot_path))
        return str(plot_path)

class DataAnalyzer:
    @staticmethod
    def analyze_class_distribution(y: pd.Series) -> Dict[str, int]:
        """Анализирует распределение классов"""
        return dict(y.value_counts())
    
    @staticmethod
    def analyze_missing_values(X: pd.DataFrame) -> Dict[str, float]:
        """Анализирует пропущенные значения"""
        return dict(X.isnull().mean())
    
    @staticmethod
    def find_rare_classes(y: pd.Series, threshold: int = 5) -> List[str]:
        """Находит редкие классы"""
        return list(y.value_counts()[y.value_counts() <= threshold].index)
    
    @staticmethod
    def analyze_marker_ranges(X: pd.DataFrame) -> Dict[str, Dict[str, float]]:
        """Анализирует диапазоны значений маркеров"""
        ranges = {}
        for col in X.columns:
            ranges[col] = {
                'min': X[col].min(),
                'max': X[col].max(),
                'mean': X[col].mean(),
                'std': X[col].std()
            }
        return ranges