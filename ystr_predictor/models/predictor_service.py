# c:\projects\DNA-utils-universal\ystr_predictor\models\predictor_service.py
import pandas as pd
import numpy as np
from typing import Dict, List
import logging
from models.hierarchical_predictor import HierarchicalPredictor

class PredictorService:
    def __init__(self):
        self.predictor = HierarchicalPredictor()
        self.feature_importance = {}

    async def train_model(self, df: pd.DataFrame, haplo_column: str):
        """Обучает модель и возвращает метрики"""
        
        # Обучаем модель
        metrics = self.predictor.train(df, haplo_column)
        
        # Логируем результаты
        logging.info("\nTraining completed!")
        for level, level_metrics in metrics.items():
            logging.info(f"\n{level.upper()} level results:")
            for metric_name, value in level_metrics.items():
                logging.info(f"{metric_name}: {value:.4f}")
        
        return metrics

    async def predict(self, markers: Dict[str, int]) -> Dict:
        """Делает предсказания для новых маркеров"""
        if not self.predictor.is_trained:
            raise Exception("Model is not trained yet")
        
        # Преобразуем входные данные в DataFrame
        df = pd.DataFrame([markers])
        
        # Получаем предсказания
        predictions = self.predictor.predict(df)
        
        # Формируем результат
        result = {
            'success': True,
            'predictions': {
                level: [pred for pred in predictions if pred['level'] == level]
                for level in ['root', 'major', 'terminal']
            }
        }
        
        return result

    def save_model(self):
        """Сохраняет модель"""
        self.predictor.save_model()

    def load_model(self):
        """Загружает модель"""
        self.predictor.load_model()