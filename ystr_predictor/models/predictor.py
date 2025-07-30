# c:\projects\DNA-utils-universal\ystr_predictor\models\predictor.py
from sklearn.svm import LinearSVC
from sklearn.preprocessing import StandardScaler
from sklearn.calibration import CalibratedClassifierCV
import numpy as np
import pandas as pd
from typing import List, Dict
import logging

class HaplogroupPredictor:
    def __init__(self):
        # Используем LinearSVC с калибровкой вероятностей
        base_classifier = LinearSVC(
            dual="auto",
            class_weight='balanced',
            max_iter=1000
        )
        
        self.classifier = CalibratedClassifierCV(
            base_classifier,
            cv=5,
            method='sigmoid'
        )
        
        self.scaler = StandardScaler()
        self.is_trained = False
        self.feature_names = None

    def train(self, X: pd.DataFrame, y: pd.Series):
        try:
            self.feature_names = X.columns.tolist()
            logging.info(f"Training with {len(self.feature_names)} features")
            
            # Нормализуем данные
            X_scaled = self.scaler.fit_transform(X)
            
            # Обучаем модель
            self.classifier.fit(X_scaled, y)
            
            # Получаем важность признаков через веса линейного SVM
            feature_importance = np.abs(self.classifier.calibrated_classifiers_[0].base_estimator.coef_).mean(axis=0)
            feature_importance = feature_importance / np.sum(feature_importance)
            
            # Создаем словарь важности признаков
            self.feature_importance = dict(zip(self.feature_names, feature_importance))
            
            # Выводим топ-20 важных маркеров
            important_features = sorted(
                self.feature_importance.items(),
                key=lambda x: x[1],
                reverse=True
            )
            
            logging.info("\nTop 20 most important markers:")
            for feature, importance in important_features[:20]:
                logging.info(f"{feature}: {importance:.4f}")
                
            self.is_trained = True
            
        except Exception as e:
            logging.error(f"Training error: {str(e)}")
            raise

    def predict(self, X: pd.DataFrame) -> List[Dict]:
        if not self.is_trained:
            raise Exception("Model is not trained yet")
            
        try:
            # Проверяем наличие всех необходимых признаков
            missing_features = [f for f in self.feature_names if f not in X.columns]
            if missing_features:
                for feature in missing_features:
                    X[feature] = 0
                    
            X = X[self.feature_names]
                
            # Нормализация входных данных
            X_scaled = self.scaler.transform(X)
            
            # Получаем вероятности для всех классов
            probabilities = self.classifier.predict_proba(X_scaled)
            
            # Получаем топ-5 предсказаний
            predictions = []
            for probs in probabilities:
                top_indices = np.argsort(probs)[-5:][::-1]
                pred = {
                    "haplogroups": [
                        {
                            "name": self.classifier.classes_[idx],
                            "probability": float(probs[idx])
                        }
                        for idx in top_indices
                    ]
                }
                predictions.append(pred)
                
            return predictions
            
        except Exception as e:
            logging.error(f"Prediction error: {str(e)}")
            raise

    def save_model(self, path: str = "models/saved/"):
        import joblib
        from pathlib import Path
        
        Path(path).mkdir(parents=True, exist_ok=True)
        
        model_data = {
            'classifier': self.classifier,
            'scaler': self.scaler,
            'feature_names': self.feature_names,
            'feature_importance': self.feature_importance,
            'is_trained': self.is_trained
        }
        
        joblib.dump(model_data, f"{path}model.joblib", compress=3)
        
    def load_model(self, path: str = "models/saved/"):
        import joblib
        
        model_data = joblib.load(f"{path}model.joblib")
        self.classifier = model_data['classifier']
        self.scaler = model_data['scaler']
        self.feature_names = model_data['feature_names']
        self.feature_importance = model_data['feature_importance']
        self.is_trained = model_data['is_trained']