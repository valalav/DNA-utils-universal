# c:\projects\DNA-utils-universal\ystr_predictor\models\hierarchical_predictor.py
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import numpy as np
import pandas as pd
from typing import List, Dict, Optional
import logging
import httpx
import asyncio
from itertools import islice
from sklearn.metrics import classification_report

class HierarchicalHaploPredictor:
    def __init__(self, haplo_api_url: str = "http://localhost:9003/api"):
        self.haplo_api_url = haplo_api_url
        self.base_model = None
        self.base_scaler = None
        self.subclade_models = {}  # Модели для каждой базовой гаплогруппы
        self.subclade_scalers = {}
        self.haplo_paths = {}
        self.is_trained = False

    async def get_haplo_paths_batch(self, haplogroups: List[str], batch_size: int = 50):
        """Получает пути для партии гаплогрупп"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            for i in range(0, len(haplogroups), batch_size):
                batch = haplogroups[i:i + batch_size]
                tasks = []
                for hg in batch:
                    tasks.append(client.get(f"{self.haplo_api_url}/search/{hg}"))
                
                responses = await asyncio.gather(*tasks, return_exceptions=True)
                
                for hg, response in zip(batch, responses):
                    if not isinstance(response, Exception) and response.status_code == 200:
                        data = response.json()
                        # Извлекаем путь из ответа
                        if data:
                            path = []
                            # Добавляем базовую гаплогруппу
                            root = hg.split('-')[0]
                            path.append({'name': root})
                            
                            # Добавляем промежуточные уровни
                            if '-' in hg:
                                path.append({'name': hg})
                                
                            # Добавляем дополнительную информацию из ответа API
                            if 'subclade_info' in data:
                                for subclade in data['subclade_info']:
                                    if subclade.get('parent_id') and subclade.get('name'):
                                        path.append({'name': subclade['name']})
                                        
                            self.haplo_paths[hg] = path
                
                await asyncio.sleep(0.1)

    async def _build_haplo_hierarchy(self, haplogroups: List[str]):
        """Строит иерархию гаплогрупп батчами"""
        self.haplo_paths = {}
        unique_haplogroups = sorted(set(haplogroups))
        
        logging.info(f"Building hierarchy for {len(unique_haplogroups)} haplogroups")
        await self.get_haplo_paths_batch(unique_haplogroups)
        
        # Определяем уровни иерархии
        self.levels = set()
        max_depth = 0
        
        # Сначала находим максимальную глубину
        for path in self.haplo_paths.values():
            max_depth = max(max_depth, len(path))
            
        # Создаем уровни от 0 до максимальной глубины
        self.levels = set(range(max_depth))
        
        logging.info(f"Built hierarchy with {len(self.levels)} levels, max depth: {max_depth}")

        # Для гаплогрупп без пути используем их как одноуровневые
        for hg in unique_haplogroups:
            if hg not in self.haplo_paths:
                root = hg.split('-')[0]
                self.haplo_paths[hg] = [{'name': root}, {'name': hg}]

    def _get_level_data(self, X: pd.DataFrame, y: pd.Series, level: int) -> tuple:
        """Подготавливает данные для конкретного уровня иерархии"""
        level_targets = []
        
        for hg in y:
            path = self.haplo_paths.get(hg, [{'name': hg}])
            target = path[level]['name'] if len(path) > level else hg
            level_targets.append(target)
            
        return X, pd.Series(level_targets)

    def _create_model(self, level: int, n_classes: int):
        """Создает модель в зависимости от уровня и количества классов"""
        if level == 0:  # Для корневого уровня (основные гаплогруппы)
            return RandomForestClassifier(
                n_estimators=200,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                n_jobs=-1,
                class_weight='balanced',
                random_state=42
            )
        else:  # Для более глубоких уровней
            return RandomForestClassifier(
                n_estimators=100,
                max_depth=None,
                min_samples_split=2,
                min_samples_leaf=1,
                n_jobs=-1,
                class_weight='balanced',
                random_state=42
            )

    async def train(self, X: pd.DataFrame, y: pd.Series):
        """Обучает иерархическую модель"""
        try:
            await self._build_haplo_hierarchy(y.unique())
            
            # Готовим данные для базового уровня
            base_haplogroups = y.apply(lambda x: x.split('-')[0])
            unique_base = base_haplogroups.unique()
            
            logging.info(f"Training base model for {len(unique_base)} haplogroups")
            
            # Обучаем базовую модель
            self.base_scaler = StandardScaler()
            X_scaled = self.base_scaler.fit_transform(X)
            
            self.base_model = RandomForestClassifier(
                n_estimators=200,
                max_depth=15,
                min_samples_split=5,
                n_jobs=-1,
                class_weight='balanced',
                random_state=42
            )
            self.base_model.fit(X_scaled, base_haplogroups)
            
            # Оцениваем базовую модель
            y_pred = self.base_model.predict(X_scaled)
            logging.info("\nBase model performance:")
            logging.info(classification_report(base_haplogroups, y_pred))

            # Обучаем модели для субкладов каждой базовой гаплогруппы
            for base_haplo in unique_base:
                mask = base_haplogroups == base_haplo
                if mask.sum() > 1:  # Если есть хотя бы 2 образца
                    X_sub = X[mask]
                    y_sub = y[mask]
                    
                    # Пропускаем, если все субклады одинаковые
                    if len(y_sub.unique()) > 1:
                        logging.info(f"\nTraining subclade model for {base_haplo}")
                        logging.info(f"Samples: {len(X_sub)}, Unique subclades: {len(y_sub.unique())}")
                        
                        # Создаем и обучаем модель для субкладов
                        scaler = StandardScaler()
                        X_scaled = scaler.fit_transform(X_sub)
                        
                        model = RandomForestClassifier(
                            n_estimators=100,
                            max_depth=None,
                            min_samples_split=2,
                            n_jobs=-1,
                            class_weight='balanced',
                            random_state=42
                        )
                        model.fit(X_scaled, y_sub)
                        
                        # Сохраняем модель и скейлер
                        self.subclade_models[base_haplo] = model
                        self.subclade_scalers[base_haplo] = scaler
                        
                        # Оцениваем модель субкладов
                        y_pred = model.predict(X_scaled)
                        logging.info(f"\n{base_haplo} subclade model performance:")
                        logging.info(classification_report(y_sub, y_pred))
            
            self.is_trained = True
            
        except Exception as e:
            logging.error(f"Training error: {str(e)}")
            raise

    def predict(self, X: pd.DataFrame) -> List[Dict]:
        """Делает двухуровневое предсказание"""
        if not self.is_trained:
            raise Exception("Model is not trained yet")
            
        results = []
        X = X.copy()
        
        for i in range(len(X)):
            X_sample = X.iloc[[i]]
            
            # Предсказание базовой гаплогруппы
            X_scaled = self.base_scaler.transform(X_sample)
            base_probas = self.base_model.predict_proba(X_scaled)[0]
            base_classes = self.base_model.classes_
            
            # Получаем топ-3 базовых гаплогрупп
            base_predictions = []
            top_k = min(3, len(base_classes))
            top_base_indices = np.argsort(base_probas)[-top_k:][::-1]
            
            for idx in top_base_indices:
                base_haplo = base_classes[idx]
                base_prob = float(base_probas[idx])
                
                # Предсказание субкладов если есть модель
                subclade_predictions = []
                if base_haplo in self.subclade_models:
                    X_sub_scaled = self.subclade_scalers[base_haplo].transform(X_sample)
                    subclade_model = self.subclade_models[base_haplo]
                    subclade_probas = subclade_model.predict_proba(X_sub_scaled)[0]
                    
                    # Топ-3 субклада
                    top_sub_indices = np.argsort(subclade_probas)[-3:][::-1]
                    subclade_predictions = [
                        {
                            "subclade": subclade_model.classes_[idx],
                            "probability": float(subclade_probas[idx])
                        }
                        for idx in top_sub_indices
                    ]
                
                base_predictions.append({
                    "haplogroup": base_haplo,
                    "probability": base_prob,
                    "subclades": subclade_predictions
                })
            
            results.append({
                "predictions": base_predictions
            })
        
        return results

    def save_model(self, path: str = "models/saved/"):
        import joblib
        import os
        os.makedirs(path, exist_ok=True)
        
        model_data = {
            'base_model': self.base_model,
            'base_scaler': self.base_scaler,
            'subclade_models': self.subclade_models,
            'subclade_scalers': self.subclade_scalers,
            'haplo_paths': self.haplo_paths,
            'is_trained': self.is_trained
        }
        
        joblib.dump(model_data, f"{path}hierarchical_model.joblib")
        
    def load_model(self, path: str = "models/saved/"):
        import joblib
        
        model_data = joblib.load(f"{path}hierarchical_model.joblib")
        self.base_model = model_data['base_model']
        self.base_scaler = model_data['base_scaler']
        self.subclade_models = model_data['subclade_models']
        self.subclade_scalers = model_data['subclade_scalers']
        self.haplo_paths = model_data['haplo_paths']
        self.is_trained = model_data['is_trained']