# c:\projects\DNA-utils-universal\ystr_predictor\ab_testing\experiment_service.py
from typing import Dict, List, Optional, Any
import redis
import json
from datetime import datetime
import numpy as np
from scipy import stats
import logging
from dataclasses import dataclass
import uuid

@dataclass
class Experiment:
    id: str
    name: str
    description: str
    variants: List[Dict[str, Any]]
    start_date: datetime
    end_date: Optional[datetime]
    status: str  # active, paused, completed
    metrics: List[str]
    traffic_percentage: float
    segment_rules: Dict[str, Any]

class ABTestingService:
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.redis = redis.from_url(redis_url)
        self.logger = logging.getLogger(__name__)

    def create_experiment(self, name: str, variants: List[Dict], 
                         metrics: List[str], traffic_percentage: float = 100.0,
                         segment_rules: Dict = None) -> Experiment:
        """Создание нового эксперимента"""
        experiment = Experiment(
            id=str(uuid.uuid4()),
            name=name,
            description=f"A/B Test: {name}",
            variants=variants,
            start_date=datetime.now(),
            end_date=None,
            status="active",
            metrics=metrics,
            traffic_percentage=traffic_percentage,
            segment_rules=segment_rules or {}
        )

        self._save_experiment(experiment)
        return experiment

    def get_experiment(self, experiment_id: str) -> Optional[Experiment]:
        """Получение эксперимента"""
        data = self.redis.get(f"experiment:{experiment_id}")
        if not data:
            return None

        data = json.loads(data)
        return Experiment(
            id=data["id"],
            name=data["name"],
            description=data["description"],
            variants=data["variants"],
            start_date=datetime.fromisoformat(data["start_date"]),
            end_date=datetime.fromisoformat(data["end_date"]) if data["end_date"] else None,
            status=data["status"],
            metrics=data["metrics"],
            traffic_percentage=data["traffic_percentage"],
            segment_rules=data["segment_rules"]
        )

    def assign_variant(self, experiment_id: str, user_id: str) -> Optional[Dict]:
        """Назначение варианта пользователю"""
        experiment = self.get_experiment(experiment_id)
        if not experiment or experiment.status != "active":
            return None

        # Проверяем сегментацию
        if not self._check_segment_rules(experiment.segment_rules, user_id):
            return None

        # Проверяем процент трафика
        if not self._check_traffic_split(user_id, experiment.traffic_percentage):
            return None

        # Получаем или назначаем вариант
        variant_key = f"variant:{experiment_id}:{user_id}"
        variant = self.redis.get(variant_key)

        if variant:
            return json.loads(variant)

        # Выбираем случайный вариант
        variant = np.random.choice(experiment.variants)
        self.redis.set(variant_key, json.dumps(variant))
        return variant

    def track_event(self, experiment_id: str, user_id: str, 
                   metric: str, value: float):
        """Отслеживание метрики"""
        variant = self.redis.get(f"variant:{experiment_id}:{user_id}")
        if not variant:
            return

        variant = json.loads(variant)
        event_key = f"events:{experiment_id}:{variant['name']}:{metric}"
        self.redis.rpush(event_key, value)

    def get_results(self, experiment_id: str) -> Dict:
        """Получение результатов эксперимента"""
        experiment = self.get_experiment(experiment_id)
        if not experiment:
            return {}

        results = {
            "experiment": experiment.name,
            "status": experiment.status,
            "metrics": {}
        }

        for metric in experiment.metrics:
            metric_results = {}
            control_values = []
            
            # Собираем данные контрольной группы
            control_key = f"events:{experiment_id}:control:{metric}"
            control_data = self.redis.lrange(control_key, 0, -1)
            control_values = [float(x) for x in control_data]

            for variant in experiment.variants:
                if variant["name"] == "control":
                    continue

                variant_key = f"events:{experiment_id}:{variant['name']}:{metric}"
                variant_data = self.redis.lrange(variant_key, 0, -1)
                variant_values = [float(x) for x in variant_data]

                if control_values and variant_values:
                    # Проводим статистический анализ
                    stat, pvalue = stats.ttest_ind(control_values, variant_values)
                    effect_size = (np.mean(variant_values) - np.mean(control_values)) / np.std(control_values)

                    metric_results[variant["name"]] = {
                        "mean": np.mean(variant_values),
                        "count": len(variant_values),
                        "difference": (np.mean(variant_values) - np.mean(control_values)) / np.mean(control_values) * 100,
                        "p_value": pvalue,
                        "significant": pvalue < 0.05,
                        "effect_size": effect_size
                    }

            results["metrics"][metric] = metric_results

        return results

    def _save_experiment(self, experiment: Experiment):
        """Сохранение эксперимента в Redis"""
        data = {
            "id": experiment.id,
            "name": experiment.name,
            "description": experiment.description,
            "variants": experiment.variants,
            "start_date": experiment.start_date.isoformat(),
            "end_date": experiment.end_date.isoformat() if experiment.end_date else None,
            "status": experiment.status,
            "metrics": experiment.metrics,
            "traffic_percentage": experiment.traffic_percentage,
            "segment_rules": experiment.segment_rules
        }
        self.redis.set(f"experiment:{experiment.id}", json.dumps(data))

    def _check_segment_rules(self, rules: Dict, user_id: str) -> bool:
        """Проверка правил сегментации"""
        if not rules:
            return True

        # Здесь логика проверки правил сегментации
        # Например, проверка страны, платформы и т.д.
        return True

    def _check_traffic_split(self, user_id: str, percentage: float) -> bool:
        """Проверка попадания в процент трафика"""
        import hashlib
        hash_value = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
        return hash_value % 100 < percentage