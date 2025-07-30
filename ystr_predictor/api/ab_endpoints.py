# c:\projects\DNA-utils-universal\ystr_predictor\api\ab_endpoints.py
from fastapi import APIRouter, HTTPException
from typing import Dict, List
from datetime import datetime

router = APIRouter()
ab_service = ABTestingService()
analytics_service = AnalyticsService()

@router.post("/experiments")
async def create_experiment(experiment_data: Dict):
    """Создание нового эксперимента"""
    try:
        experiment = ab_service.create_experiment(
            name=experiment_data["name"],
            variants=experiment_data["variants"],
            metrics=experiment_data["metrics"],
            traffic_percentage=experiment_data.get("traffic_percentage", 100),
            segment_rules=experiment_data.get("segment_rules")
        )
        return experiment
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/experiments/{experiment_id}")
async def get_experiment(experiment_id: str):
    """Получение информации об эксперименте"""
    experiment = ab_service.get_experiment(experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return experiment

@router.post("/experiments/{experiment_id}/assign")
async def assign_variant(experiment_id: str, user_id: str):
    """Назначение варианта пользователю"""
    variant = ab_service.assign_variant(experiment_id, user_id)
    if not variant:
        raise HTTPException(status_code=404, detail="No variant assigned")
    return variant

@router.post("/experiments/{experiment_id}/track")
async def track_event(experiment_id: str, event_data: Dict):
    """Отслеживание события"""
    ab_service.track_event(
        experiment_id=experiment_id,
        user_id=event_data["user_id"],
        metric=event_data["metric"],
        value=event_data["value"]
    )
    return {"message": "Event tracked"}

@router.get("/experiments/{experiment_id}/results")
async def get_results(experiment_id: str):
    """Получение результатов эксперимента"""
    results = ab_service.get_results(experiment_id)
    if not results:
        raise HTTPException(status_code=404, detail="No results found")
        
    # Анализируем результаты
    analysis = analytics_service.analyze_experiment(results)
    
    # Создаем визуализации
    visualizations = analytics_service.create_visualizations(results)
    
    return {
        "results": results,
        "analysis": analysis,
        "visualizations": visualizations
    }