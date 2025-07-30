# c:\projects\DNA-utils-universal\ystr_predictor\models\model_monitor.py
from sklearn.metrics import roc_auc_score, precision_score, recall_score, f1_score
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime
import json
import logging
from pathlib import Path
import sqlite3

@dataclass
class PredictionRecord:
    timestamp: datetime
    model_version: str
    features: Dict
    prediction: str
    confidence: float
    true_label: Optional[str] = None
    latency_ms: Optional[float] = None

class ModelMonitor:
    def __init__(self, db_path: str = "monitoring.db"):
        self.db_path = db_path
        self.initialize_db()
        self.baseline_stats = {}
        self.drift_thresholds = {
            'prediction_drift': 0.1,
            'feature_drift': 0.2,
            'performance_drop': 0.1
        }
        
    def initialize_db(self):
        """Инициализирует базу данных для мониторинга"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS predictions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    model_version TEXT,
                    features TEXT,
                    prediction TEXT,
                    confidence REAL,
                    true_label TEXT,
                    latency_ms REAL
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS model_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    model_version TEXT,
                    metric_name TEXT,
                    metric_value REAL
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS drift_alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    alert_type TEXT,
                    description TEXT,
                    severity TEXT
                )
            """)
    
    def log_prediction(self, record: PredictionRecord):
        """Логирует предсказание в базу данных"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO predictions 
                (timestamp, model_version, features, prediction, confidence, true_label, latency_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.timestamp.isoformat(),
                    record.model_version,
                    json.dumps(record.features),
                    record.prediction,
                    record.confidence,
                    record.true_label,
                    record.latency_ms
                )
            )
    
    def set_baseline_stats(self, stats: Dict):
        """Устанавливает базовые метрики для отслеживания дрейфа"""
        self.baseline_stats = stats
        
    def calculate_metrics(self, window_size: str = '1d') -> Dict:
        """Рассчитывает метрики за указанный период"""
        with sqlite3.connect(self.db_path) as conn:
            df = pd.read_sql(
                f"""
                SELECT * FROM predictions 
                WHERE timestamp >= datetime('now', '-{window_size}')
                """,
                conn
            )
            
        if len(df) == 0:
            return {}
            
        metrics = {
            'prediction_count': len(df),
            'avg_confidence': df['confidence'].mean(),
            'avg_latency': df['latency_ms'].mean()
        }
        
        # Рассчитываем метрики качества если есть true_labels
        has_labels = df['true_label'].notna()
        if has_labels.any():
            y_true = df.loc[has_labels, 'true_label']
            y_pred = df.loc[has_labels, 'prediction']
            
            metrics.update({
                'accuracy': (y_true == y_pred).mean(),
                'f1': f1_score(y_true, y_pred, average='weighted'),
                'precision': precision_score(y_true, y_pred, average='weighted'),
                'recall': recall_score(y_true, y_pred, average='weighted')
            })
            
        return metrics
    
    def detect_drift(self, current_stats: Dict) -> List[Dict]:
        """Определяет наличие дрейфа в данных"""
        alerts = []
        
        if not self.baseline_stats:
            return alerts
            
        # Проверяем дрейф в предсказаниях
        for metric in ['accuracy', 'f1', 'precision', 'recall']:
            if metric in current_stats and metric in self.baseline_stats:
                drift = abs(current_stats[metric] - self.baseline_stats[metric])
                if drift > self.drift_thresholds['performance_drop']:
                    alerts.append({
                        'timestamp': datetime.now().isoformat(),
                        'alert_type': 'performance_drift',
                        'description': f'Performance drop detected in {metric}',
                        'severity': 'high' if drift > 2 * self.drift_thresholds['performance_drop'] else 'medium'
                    })
                    
        # Логируем алерты
        with sqlite3.connect(self.db_path) as conn:
            for alert in alerts:
                conn.execute(
                    """
                    INSERT INTO drift_alerts (timestamp, alert_type, description, severity)
                    VALUES (?, ?, ?, ?)
                    """,
                    (
                        alert['timestamp'],
                        alert['alert_type'],
                        alert['description'],
                        alert['severity']
                    )
                )
                
        return alerts

class ABTesting:
    def __init__(self, experiment_name: str):
        self.experiment_name = experiment_name
        self.models = {}
        self.results = pd.DataFrame()
        
    def add_model(self, model_id: str, model_object: object):
        """Добавляет модель в A/B тест"""
        self.models[model_id] = model_object
        
    def run_experiment(self, X: pd.DataFrame, y: pd.Series, 
                      test_size: float = 0.3) -> Dict:
        """Проводит A/B тестирование"""
        from sklearn.model_selection import train_test_split
        
        # Разделяем данные
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )
        
        results = []
        
        # Тестируем каждую модель
        for model_id, model in self.models.items():
            # Обучаем модель
            model.fit(X_train, y_train)
            
            # Получаем предсказания
            y_pred = model.predict(X_test)
            
            # Рассчитываем метрики
            metrics = {
                'model_id': model_id,
                'accuracy': (y_test == y_pred).mean(),
                'f1': f1_score(y_test, y_pred, average='weighted'),
                'precision': precision_score(y_test, y_pred, average='weighted'),
                'recall': recall_score(y_test, y_pred, average='weighted')
            }
            
            # Добавляем латентность
            import time
            start_time = time.time()
            model.predict(X_test[:100])  # тестируем на небольшой выборке
            metrics['latency_ms'] = (time.time() - start_time) * 1000 / 100
            
            results.append(metrics)
            
        # Сохраняем результаты
        self.results = pd.DataFrame(results)
        
        # Определяем победителя
        winner = self.results.loc[self.results['f1'].idxmax()]
        
        return {
            'results': self.results.to_dict('records'),
            'winner': {
                'model_id': winner['model_id'],
                'improvement': float(
                    (winner['f1'] - self.results['f1'].mean()) 
                    / self.results['f1'].mean() * 100
                )
            }
        }

class ModelRegistry:
    def __init__(self, registry_path: str = "model_registry"):
        self.registry_path = Path(registry_path)
        self.registry_path.mkdir(exist_ok=True)
        
    def register_model(self, model_id: str, model_object: object, 
                      metadata: Dict) -> str:
        """Регистрирует новую версию модели"""
        model_dir = self.registry_path / model_id
        model_dir.mkdir(exist_ok=True)
        
        # Генерируем версию
        version = datetime.now().strftime("%Y%m%d_%H%M%S")
        version_dir = model_dir / version
        version_dir.mkdir()
        
        # Сохраняем модель и метаданные
        import joblib
        joblib.dump(model_object, version_dir / "model.joblib")
        
        with open(version_dir / "metadata.json", 'w') as f:
            json.dump(
                {
                    **metadata,
                    'timestamp': datetime.now().isoformat(),
                    'version': version
                },
                f,
                indent=2
            )
            
        return version
        
    def load_model(self, model_id: str, version: str = 'latest') -> Tuple[object, Dict]:
        """Загружает модель из registry"""
        model_dir = self.registry_path / model_id
        
        if version == 'latest':
            versions = sorted(v.name for v in model_dir.iterdir() if v.is_dir())
            if not versions:
                raise ValueError(f"No versions found for model {model_id}")
            version = versions[-1]
            
        version_dir = model_dir / version
        
        # Загружаем модель и метаданные
        import joblib
        model = joblib.load(version_dir / "model.joblib")
        
        with open(version_dir / "metadata.json", 'r') as f:
            metadata = json.load(f)
            
        return model, metadata
        
    def list_models(self) -> Dict[str, List[str]]:
        """Возвращает список доступных моделей и их версий"""
        models = {}
        
        for model_dir in self.registry_path.iterdir():
            if model_dir.is_dir():
                models[model_dir.name] = sorted(
                    v.name for v in model_dir.iterdir() if v.is_dir()
                )
                
        return models