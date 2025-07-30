# c:\projects\DNA-utils-universal\ystr_predictor\models\explainable_predictor.py
from sklearn.model_selection import StratifiedKFold
import optuna
from optuna.integration import OptunaSearchCV
import shap
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
import logging
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import json

class ExplainablePredictor:
    def __init__(self):
        self.study_results = {}
        self.explainers = {}
        self.feature_names = None
        self.shap_values = {}
        self.optimization_history = {}
        
    def optimize_hyperparameters(self, X: pd.DataFrame, y: pd.Series, 
                               level: str, n_trials: int = 100) -> Dict:
        """Оптимизирует гиперпараметры для конкретного уровня"""
        
        def objective(trial):
            # Параметры для RandomForest
            rf_params = {
                'n_estimators': trial.suggest_int('rf_n_estimators', 50, 300),
                'max_depth': trial.suggest_int('rf_max_depth', 5, 30),
                'min_samples_split': trial.suggest_int('rf_min_samples_split', 2, 10)
            }
            
            # Параметры для XGBoost
            xgb_params = {
                'n_estimators': trial.suggest_int('xgb_n_estimators', 50, 300),
                'max_depth': trial.suggest_int('xgb_max_depth', 3, 10),
                'learning_rate': trial.suggest_float('xgb_learning_rate', 0.01, 0.3),
                'subsample': trial.suggest_float('xgb_subsample', 0.6, 1.0)
            }
            
            # Параметры для LightGBM
            lgb_params = {
                'n_estimators': trial.suggest_int('lgb_n_estimators', 50, 300),
                'num_leaves': trial.suggest_int('lgb_num_leaves', 20, 100),
                'learning_rate': trial.suggest_float('lgb_learning_rate', 0.01, 0.3)
            }
            
            # Создаем и обучаем модели
            scores = []
            skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
            
            for train_idx, val_idx in skf.split(X, y):
                X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
                y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]
                
                # Обучаем модели
                models = self._train_models(X_train, y_train, rf_params, xgb_params, lgb_params)
                
                # Получаем предсказания
                val_score = self._evaluate_ensemble(models, X_val, y_val)
                scores.append(val_score)
            
            mean_score = np.mean(scores)
            
            # Сохраняем историю оптимизации
            if level not in self.optimization_history:
                self.optimization_history[level] = []
            
            self.optimization_history[level].append({
                'trial': trial.number,
                'score': mean_score,
                'params': {
                    'rf': rf_params,
                    'xgb': xgb_params,
                    'lgb': lgb_params
                }
            })
            
            return mean_score
        
        # Создаем study
        study = optuna.create_study(direction='maximize')
        study.optimize(objective, n_trials=n_trials)
        
        # Сохраняем результаты
        self.study_results[level] = {
            'best_params': study.best_params,
            'best_value': study.best_value,
            'optimization_history': self.optimization_history[level]
        }
        
        return study.best_params
        
    def generate_explanations(self, X: pd.DataFrame, level: str) -> Dict:
        """Генерирует SHAP-объяснения для предсказаний"""
        if level not in self.explainers:
            # Создаем TreeExplainer для каждой модели
            self.explainers[level] = {
                name: shap.TreeExplainer(model)
                for name, model in self.models[level].items()
                if hasattr(model, 'predict_proba')
            }
        
        explanations = {}
        for name, explainer in self.explainers[level].items():
            # Вычисляем SHAP-значения
            shap_values = explainer.shap_values(X)
            if isinstance(shap_values, list):
                shap_values = np.array(shap_values)
            
            self.shap_values[f"{level}_{name}"] = shap_values
            
            # Анализируем важность признаков
            feature_importance = np.abs(shap_values).mean(axis=0)
            explanations[name] = {
                'feature_importance': dict(zip(X.columns, feature_importance)),
                'shap_values': shap_values
            }
            
        return explanations
        
    def plot_explanations(self, X: pd.DataFrame, level: str, 
                         output_dir: str = "explanations") -> Dict[str, str]:
        """Создает визуализации SHAP-объяснений"""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        plot_paths = {}
        
        for name, explainer in self.explainers[level].items():
            # Summary plot
            plt.figure(figsize=(10, 6))
            shap.summary_plot(
                self.shap_values[f"{level}_{name}"],
                X,
                show=False
            )
            summary_path = output_dir / f"shap_summary_{level}_{name}.png"
            plt.savefig(summary_path)
            plt.close()
            
            # Dependence plots для топ признаков
            feature_importance = np.abs(self.shap_values[f"{level}_{name}"]).mean(0)
            top_features = np.argsort(feature_importance)[-5:]
            
            for feature_idx in top_features:
                plt.figure(figsize=(8, 6))
                shap.dependence_plot(
                    feature_idx,
                    self.shap_values[f"{level}_{name}"],
                    X,
                    show=False
                )
                dep_path = output_dir / f"shap_dependence_{level}_{name}_{X.columns[feature_idx]}.png"
                plt.savefig(dep_path)
                plt.close()
            
            plot_paths[name] = {
                'summary': str(summary_path),
                'dependence': [str(p) for p in output_dir.glob(f"shap_dependence_{level}_{name}_*.png")]
            }
            
        return plot_paths
        
    def plot_optimization_history(self, level: str, 
                                output_dir: str = "optimization") -> str:
        """Визуализирует историю оптимизации гиперпараметров"""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        history = pd.DataFrame(self.optimization_history[level])
        
        plt.figure(figsize=(10, 6))
        sns.lineplot(data=history, x='trial', y='score')
        plt.title(f'Optimization History for {level}')
        plt.xlabel('Trial number')
        plt.ylabel('Score')
        
        plot_path = output_dir / f"optimization_history_{level}.png"
        plt.savefig(plot_path)
        plt.close()
        
        return str(plot_path)
        
    def save_explanations(self, output_dir: str = "explanations"):
        """Сохраняет все объяснения и метаданные"""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Сохраняем SHAP-значения
        for key, values in self.shap_values.items():
            np.save(output_dir / f"shap_values_{key}.npy", values)
        
        # Сохраняем важность признаков
        feature_importance = {}
        for level in self.explainers:
            feature_importance[level] = self.get_feature_importance(level)
        
        with open(output_dir / "feature_importance.json", 'w') as f:
            json.dump(feature_importance, f, indent=2)
            
        # Сохраняем историю оптимизации
        with open(output_dir / "optimization_history.json", 'w') as f:
            json.dump(self.optimization_history, f, indent=2)
            
    def load_explanations(self, input_dir: str = "explanations"):
        """Загружает сохраненные объяснения"""
        input_dir = Path(input_dir)
        
        # Загружаем SHAP-значения
        for shap_file in input_dir.glob("shap_values_*.npy"):
            key = shap_file.stem.replace("shap_values_", "")
            self.shap_values[key] = np.load(shap_file)
        
        # Загружаем важность признаков
        if (input_dir / "feature_importance.json").exists():
            with open(input_dir / "feature_importance.json", 'r') as f:
                self.feature_importance = json.load(f)
                
        # Загружаем историю оптимизации
        if (input_dir / "optimization_history.json").exists():
            with open(input_dir / "optimization_history.json", 'r') as f:
                self.optimization_history = json.load(f)