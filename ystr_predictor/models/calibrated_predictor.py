# c:\projects\DNA-utils-universal\ystr_predictor\models\calibrated_predictor.py
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import f1_score, brier_score_loss
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
import logging
from joblib import Parallel, delayed
import concurrent.futures
from dataclasses import dataclass
from pathlib import Path
import time

@dataclass
class ModelConfig:
    name: str
    model: object
    params: Dict
    calibration: str = 'sigmoid'  # 'sigmoid' или 'isotonic'

class CalibratedParallelPredictor:
    def __init__(self, n_jobs: int = -1):
        self.n_jobs = n_jobs
        self.models_config = {
            'rf': ModelConfig(
                name='RandomForest',
                model='RandomForestClassifier',
                params={
                    'n_estimators': 100,
                    'max_depth': 20,
                    'min_samples_split': 5,
                    'n_jobs': 1  # для параллелизации на уровне моделей
                }
            ),
            'xgb': ModelConfig(
                name='XGBoost',
                model='XGBClassifier',
                params={
                    'n_estimators': 100,
                    'max_depth': 7,
                    'learning_rate': 0.1,
                    'tree_method': 'hist'
                }
            ),
            'lgb': ModelConfig(
                name='LightGBM',
                model='LGBMClassifier',
                params={
                    'n_estimators': 100,
                    'num_leaves': 31,
                    'feature_fraction': 0.8
                }
            ),
            'cat': ModelConfig(
                name='CatBoost',
                model='CatBoostClassifier',
                params={
                    'iterations': 100,
                    'depth': 6,
                    'learning_rate': 0.1,
                    'verbose': False,
                    'thread_count': 1
                }
            ),
            'mlp': ModelConfig(
                name='NeuralNet',
                model='MLPClassifier',
                params={
                    'hidden_layer_sizes': (100, 50),
                    'max_iter': 300,
                    'early_stopping': True
                }
            )
        }
        
        self.calibrated_models = {}
        self.meta_models = {}
        self.scalers = {}
        self.is_trained = False
        self.training_history = {}

    def _train_base_model(self, model_config: ModelConfig, X: np.ndarray, 
                         y: np.ndarray, cv: int = 5) -> Tuple[str, object]:
        """Обучает и калибрует одну базовую модель"""
        start_time = time.time()
        
        # Динамически создаем модель
        if model_config.model == 'RandomForestClassifier':
            from sklearn.ensemble import RandomForestClassifier as Model
        elif model_config.model == 'XGBClassifier':
            from xgboost import XGBClassifier as Model
        elif model_config.model == 'LGBMClassifier':
            from lightgbm import LGBMClassifier as Model
        elif model_config.model == 'CatBoostClassifier':
            from catboost import CatBoostClassifier as Model
        elif model_config.model == 'MLPClassifier':
            from sklearn.neural_network import MLPClassifier as Model
            
        base_model = Model(**model_config.params)
        
        # Калибруем модель
        calibrated_model = CalibratedClassifierCV(
            base_model,
            cv=cv,
            method=model_config.calibration,
            n_jobs=1
        )
        
        # Обучаем с отслеживанием прогресса
        calibrated_model.fit(X, y)
        
        training_time = time.time() - start_time
        logging.info(f"Trained {model_config.name} in {training_time:.2f} seconds")
        
        return model_config.name, calibrated_model

    def _parallel_train_level(self, X: np.ndarray, y: np.ndarray, 
                            level: str) -> Dict[str, object]:
        """Параллельное обучение моделей для одного уровня"""
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.n_jobs) as executor:
            future_to_model = {
                executor.submit(
                    self._train_base_model, config, X, y
                ): name
                for name, config in self.models_config.items()
            }
            
            level_models = {}
            for future in concurrent.futures.as_completed(future_to_model):
                model_name = future_to_model[future]
                try:
                    name, model = future.result()
                    level_models[model_name] = model
                except Exception as e:
                    logging.error(f"Model {model_name} training failed: {str(e)}")
                    
        return level_models

    def _get_stacking_predictions(self, models: Dict, X: np.ndarray, 
                                y: np.ndarray = None) -> np.ndarray:
        """Получает калиброванные предсказания для стекинга"""
        predictions = Parallel(n_jobs=self.n_jobs)(
            delayed(model.predict_proba)(X) for model in models.values()
        )
        return np.hstack(predictions)

    def train(self, X: pd.DataFrame, y_dict: Dict[str, pd.Series]) -> Dict[str, Dict[str, float]]:
        """Обучает калиброванный ансамбль моделей"""
        metrics = {}
        
        for level, y in y_dict.items():
            logging.info(f"\nTraining level: {level}")
            
            # Нормализация
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            self.scalers[level] = scaler
            
            # Параллельное обучение базовых моделей
            level_models = self._parallel_train_level(X_scaled, y, level)
            self.calibrated_models[level] = level_models
            
            # Получаем мета-признаки
            S_train = self._get_stacking_predictions(level_models, X_scaled)
            
            # Обучаем и калибруем мета-модель
            from xgboost import XGBClassifier
            meta_model = CalibratedClassifierCV(
                XGBClassifier(
                    n_estimators=100,
                    max_depth=3,
                    learning_rate=0.1
                ),
                cv=5,
                method='isotonic'
            )
            meta_model.fit(S_train, y)
            self.meta_models[level] = meta_model
            
            # Оцениваем качество
            y_pred = self.predict_level(X, level)
            y_proba = self.predict_proba_level(X, level)
            
            metrics[level] = {
                'macro_f1': f1_score(y, y_pred, average='macro'),
                'weighted_f1': f1_score(y, y_pred, average='weighted'),
                'brier_score': brier_score_loss(
                    y, y_proba.max(axis=1)
                )
            }
            
        self.is_trained = True
        return metrics

    def predict_level(self, X: pd.DataFrame, level: str) -> np.ndarray:
        """Предсказания для уровня"""
        X_scaled = self.scalers[level].transform(X)
        S_test = self._get_stacking_predictions(self.calibrated_models[level], X_scaled)
        return self.meta_models[level].predict(S_test)

    def predict_proba_level(self, X: pd.DataFrame, level: str) -> np.ndarray:
        """Калиброванные вероятности для уровня"""
        X_scaled = self.scalers[level].transform(X)
        S_test = self._get_stacking_predictions(self.calibrated_models[level], X_scaled)
        return self.meta_models[level].predict_proba(S_test)

    def predict(self, X: pd.DataFrame) -> Dict[str, List[Dict]]:
        """Предсказания по всем уровням"""
        results = {}
        
        for level in self.calibrated_models.keys():
            probas = self.predict_proba_level(X, level)
            predictions = []
            
            for sample_probas in probas:
                top_indices = np.argsort(sample_probas)[-3:][::-1]
                
                pred = {
                    'haplogroup': self.meta_models[level].classes_[top_indices[0]],
                    'probability': float(sample_probas[top_indices[0]]),
                    'calibrated': True,
                    'alternatives': [
                        {
                            'haplogroup': self.meta_models[level].classes_[idx],
                            'probability': float(sample_probas[idx])
                        }
                        for idx in top_indices[1:]
                    ]
                }
                predictions.append(pred)
                
            results[level] = predictions
            
        return results

    def get_calibration_curve(self, X: pd.DataFrame, y: np.ndarray, 
                            level: str) -> Tuple[np.ndarray, np.ndarray]:
        """Возвращает кривую калибровки"""
        from sklearn.calibration import calibration_curve
        
        y_proba = self.predict_proba_level(X, level)
        prob_true, prob_pred = calibration_curve(
            y, y_proba.max(axis=1), n_bins=10
        )
        return prob_true, prob_pred