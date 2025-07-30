# c:\projects\DNA-utils-universal\ystr_predictor\models\tree_predictor.py
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import numpy as np
import pandas as pd
from typing import List, Dict, Set
from dataclasses import dataclass
import logging
import httpx
import asyncio

@dataclass
class HaploNode:
    name: str
    children: Dict[str, 'HaploNode'] = None
    parent: 'HaploNode' = None
    model = None
    scaler = None
    
    def __post_init__(self):
        if self.children is None:
            self.children = {}

class TreeHaploPredictor:
    def __init__(self, haplo_api_url: str = "http://localhost:9003/api"):
        self.haplo_api_url = haplo_api_url
        self.root = HaploNode(name="ROOT")
        self.is_trained = False
        self.batch_size = 1000  # Размер батча для обучения

    async def get_haplo_path(self, haplogroup: str) -> List[str]:
        """Получает путь гаплогруппы из сервера"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.haplo_api_url}/search/{haplogroup}")
                if response.status_code == 200:
                    data = response.json()
                    # Извлекаем FTDNA и YFull пути
                    ftdna_path = data.get('ftdna_path', [])
                    yfull_path = data.get('yfull_path', [])
                    # Объединяем пути
                    combined_path = []
                    if ftdna_path:
                        combined_path.extend(ftdna_path)
                    if yfull_path:
                        combined_path.extend([p for p in yfull_path if p not in combined_path])
                    return combined_path
                return []
        except Exception as e:
            logging.error(f"Error getting path for {haplogroup}: {str(e)}")
            return []

    def _add_path_to_tree(self, path: List[str]):
        """Добавляет путь в дерево"""
        current = self.root
        for haplo in path:
            if haplo not in current.children:
                new_node = HaploNode(name=haplo, parent=current)
                current.children[haplo] = new_node
            current = current.children[haplo]

    def _get_node_samples(self, node: HaploNode, X: pd.DataFrame, y: pd.Series) -> tuple:
        """Получает образцы для конкретного узла"""
        mask = y.apply(lambda x: node.name in x)
        return X[mask], y[mask]

    def _train_node(self, node: HaploNode, X: pd.DataFrame, y: pd.Series):
        """Обучает модель для узла"""
        if len(node.children) == 0:
            return

        # Получаем образцы для текущего узла
        X_node, y_node = self._get_node_samples(node, X, y)
        
        if len(X_node) < 2:
            return

        # Создаем метки для дочерних узлов
        child_labels = y_node.apply(lambda x: next(
            (child for child in node.children.keys() if child in x),
            node.name
        ))

        unique_labels = child_labels.unique()
        if len(unique_labels) < 2:
            return

        logging.info(f"Training model for {node.name}")
        logging.info(f"Samples: {len(X_node)}, Children: {len(unique_labels)}")

        try:
            # Обучаем модель батчами
            node.scaler = StandardScaler()
            X_scaled = node.scaler.fit_transform(X_node)

            node.model = RandomForestClassifier(
                n_estimators=100,
                max_depth=None,
                min_samples_split=2,
                min_samples_leaf=1,
                n_jobs=1,  # Используем один процесс для экономии памяти
                random_state=42
            )

            # Обучаем на батчах
            for i in range(0, len(X_scaled), self.batch_size):
                X_batch = X_scaled[i:i + self.batch_size]
                y_batch = child_labels.iloc[i:i + self.batch_size]
                if i == 0:
                    node.model.fit(X_batch, y_batch)
                else:
                    node.model.n_estimators += 10
                    node.model.fit(X_batch, y_batch)

        except Exception as e:
            logging.error(f"Error training node {node.name}: {str(e)}")
            node.model = None
            node.scaler = None

    async def train(self, X: pd.DataFrame, y: pd.Series):
        """Обучает всё дерево"""
        try:
            logging.info(f"Starting training with {len(y)} samples")
            logging.info(f"Unique haplogroups: {y.unique()[:10]}")  # Показываем первые 10
            
            # Получаем пути для всех гаплогрупп
            unique_haplos = y.unique()
            paths_found = 0
            
            for haplo in unique_haplos:
                path = await self.get_haplo_path(haplo)
                if path:
                    self._add_path_to_tree(path)
                    paths_found += 1
                    logging.info(f"Got path for {haplo}: {path}")
                else:
                    logging.warning(f"No path found for {haplo}")

            logging.info(f"Found paths for {paths_found} out of {len(unique_haplos)} haplogroups")
            
            # Выводим структуру дерева
            def print_tree(node: HaploNode, level=0):
                logging.info("  " * level + f"- {node.name}")
                for child in node.children.values():
                    print_tree(child, level + 1)
                
            logging.info("Tree structure:")
            print_tree(self.root)

            # Обучаем модели начиная с корня
            def train_recursive(node: HaploNode):
                if node != self.root:
                    self._train_node(node, X, y)
                for child in node.children.values():
                    train_recursive(child)

            train_recursive(self.root)
            logging.info("Finished training tree")
            self.is_trained = True

        except Exception as e:
            logging.error(f"Training error: {str(e)}")
            raise

    def predict(self, X: pd.DataFrame) -> List[Dict]:
        """Делает предсказания, спускаясь по дереву
        
        Returns:
            List[Dict]: Список предсказаний для каждого образца, содержащий:
                - path_predictions: список предсказаний на каждом уровне дерева
                - error: сообщение об ошибке (опционально)
        """
        if not self.is_trained:
            raise Exception("Model is not trained")

        results = []
        for i in range(len(X)):
            X_sample = X.iloc[[i]]
            
            # Спускаемся по дереву
            current_node = self.root
            path_predictions = []
            
            # Проверяем есть ли дети у корня
            if not current_node.children:
                logging.warning("No children in root node")
                results.append({
                    "path_predictions": [],
                    "error": "Model has no trained paths"
                })
                continue

            while current_node.children:
                if current_node.model is None:
                    break
                    
                X_scaled = current_node.scaler.transform(X_sample)
                probas = current_node.model.predict_proba(X_scaled)[0]
                classes = current_node.model.classes_
                
                # Получаем топ-3 предсказания
                top_indices = np.argsort(probas)[-3:][::-1]
                predictions = [
                    {
                        "haplogroup": classes[idx],
                        "probability": float(probas[idx])
                    }
                    for idx in top_indices
                ]
                
                path_predictions.append({
                    "level": len(path_predictions),
                    "predictions": predictions
                })
                
                # Переходим к следующему узлу по наиболее вероятному пути
                next_haplo = predictions[0]["haplogroup"]
                if next_haplo in current_node.children:
                    current_node = current_node.children[next_haplo]
                else:
                    break

            results.append({
                "path_predictions": path_predictions
            })

        return results

    def save_model(self, path: str = "models/saved/"):
        import joblib
        import os
        os.makedirs(path, exist_ok=True)
        joblib.dump(self.root, f"{path}tree_model.joblib")
        
    def load_model(self, path: str = "models/saved/"):
        import joblib
        self.root = joblib.load(f"{path}tree_model.joblib")
        self.is_trained = True
