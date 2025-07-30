# c:\projects\DNA-utils-universal\ystr_predictor\api\endpoints.py
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional
import pandas as pd
from datetime import datetime
from models.experiment_tracker import ExperimentTracker
from models.model_monitor import ModelMonitor, ModelRegistry
from models.logger import ModelLogger
from notifications.notifier import NotificationService
import asyncio

app = FastAPI(title="Haplogroup Predictor API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Инициализация сервисов
experiment_tracker = ExperimentTracker()
model_monitor = ModelMonitor()
model_registry = ModelRegistry()
logger = ModelLogger()
notifier = NotificationService()

@app.post("/api/predict")
async def predict(data: Dict):
    """Предсказание гаплогруппы"""
    try:
        start_time = datetime.now()
        
        # Получаем последнюю версию модели
        model, metadata = model_registry.load_model('haplogroup_predictor')
        
        # Делаем предсказание
        prediction = model.predict(pd.DataFrame([data['markers']]))
        
        # Логируем предсказание
        latency = (datetime.now() - start_time).total_seconds() * 1000
        
        model_monitor.log_prediction({
            'timestamp': start_time,
            'model_version': metadata['version'],
            'features': data['markers'],
            'prediction': prediction[0],
            'confidence': float(model.predict_proba(pd.DataFrame([data['markers']]))[0].max()),
            'latency_ms': latency
        })
        
        return {
            'prediction': prediction[0],
            'model_version': metadata['version'],
            'latency_ms': latency
        }
        
    except Exception as e:
        logger.log(str(e), level="ERROR", category="prediction")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/model/metrics")
async def get_metrics(window: str = "1d"):
    """Получение метрик модели"""
    try:
        metrics = model_monitor.calculate_metrics(window)
        return metrics
    except Exception as e:
        logger.log(str(e), level="ERROR", category="metrics")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/model/versions")
async def list_versions():
    """Список версий моделей"""
    try:
        versions = model_registry.list_models()
        return versions
    except Exception as e:
        logger.log(str(e), level="ERROR", category="versions")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/model/retrain")
async def retrain_model(background_tasks: BackgroundTasks, data: Dict):
    """Переобучение модели"""
    try:
        # Запускаем переобучение в фоне
        background_tasks.add_task(
            retrain_and_notify,
            data.get('dataset_path'),
            data.get('parameters')
        )
        
        return {"message": "Retraining started"}
    except Exception as e:
        logger.log(str(e), level="ERROR", category="training")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/monitoring/alerts")
async def get_alerts(start_time: Optional[str] = None, 
                    end_time: Optional[str] = None):
    """Получение алертов"""
    try:
        alerts = model_monitor.get_alerts(start_time, end_time)
        return alerts
    except Exception as e:
        logger.log(str(e), level="ERROR", category="alerts")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/logs")
async def get_logs(level: Optional[str] = None, 
                  category: Optional[str] = None,
                  start_time: Optional[str] = None,
                  end_time: Optional[str] = None):
    """Получение логов"""
    try:
        logs = logger.get_logs(level, category, start_time, end_time)
        return logs
    except Exception as e:
        logger.log(str(e), level="ERROR", category="logs")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/experiment/start")
async def start_experiment(config: Dict):
    """Запуск нового эксперимента"""
    try:
        run = experiment_tracker.start_run(config.get('name'))
        return {"run_id": run.info.run_id}
    except Exception as e:
        logger.log(str(e), level="ERROR", category="experiment")
        raise HTTPException(status_code=500, detail=str(e))

async def retrain_and_notify(dataset_path: str, parameters: Dict):
    """Фоновая задача для переобучения и отправки уведомлений"""
    try:
        # Загружаем данные
        data = pd.read_csv(dataset_path)
        
        # Переобучаем модель
        model, metrics = train_model(data, parameters)
        
        # Регистрируем новую версию
        version = model_registry.register_model(
            'haplogroup_predictor',
            model,
            {
                'parameters': parameters,
                'metrics': metrics,
                'dataset': dataset_path
            }
        )
        
        # Отправляем уведомление
        await notifier.send_notification(
            'model_retrained',
            {
                'version': version,
                'metrics': metrics
            }
        )
        
    except Exception as e:
        logger.log(str(e), level="ERROR", category="retraining")
        await notifier.send_notification(
            'training_failed',
            {'error': str(e)}
        )