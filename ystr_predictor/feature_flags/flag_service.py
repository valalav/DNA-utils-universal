# c:\projects\DNA-utils-universal\ystr_predictor\feature_flags\flag_service.py
import redis
import json
from typing import Dict, Any, Optional
from datetime import datetime
from dataclasses import dataclass
import logging

@dataclass
class FeatureFlag:
    name: str
    enabled: bool
    description: str
    created_at: datetime
    updated_at: datetime
    rules: Dict[str, Any]
    percentage: float = 100.0

class FeatureFlagService:
    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self.redis = redis.from_url(redis_url)
        self.logger = logging.getLogger(__name__)
        
    def create_flag(self, name: str, description: str, 
                   rules: Dict[str, Any] = None) -> FeatureFlag:
        """Создание нового feature flag"""
        now = datetime.now()
        flag = FeatureFlag(
            name=name,
            enabled=False,
            description=description,
            created_at=now,
            updated_at=now,
            rules=rules or {}
        )
        
        self._save_flag(flag)
        return flag
        
    def get_flag(self, name: str) -> Optional[FeatureFlag]:
        """Получение feature flag"""
        flag_data = self.redis.get(f"flag:{name}")
        if not flag_data:
            return None
            
        data = json.loads(flag_data)
        return FeatureFlag(
            name=data["name"],
            enabled=data["enabled"],
            description=data["description"],
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(data["updated_at"]),
            rules=data["rules"],
            percentage=data.get("percentage", 100.0)
        )
        
    def update_flag(self, name: str, updates: Dict[str, Any]) -> Optional[FeatureFlag]:
        """Обновление feature flag"""
        flag = self.get_flag(name)
        if not flag:
            return None
            
        for key, value in updates.items():
            if hasattr(flag, key):
                setattr(flag, key, value)
                
        flag.updated_at = datetime.now()
        self._save_flag(flag)
        return flag
        
    def delete_flag(self, name: str) -> bool:
        """Удаление feature flag"""
        return self.redis.delete(f"flag:{name}") > 0
        
    def _save_flag(self, flag: FeatureFlag):
        """Сохранение feature flag в Redis"""
        flag_data = {
            "name": flag.name,
            "enabled": flag.enabled,
            "description": flag.description,
            "created_at": flag.created_at.isoformat(),
            "updated_at": flag.updated_at.isoformat(),
            "rules": flag.rules,
            "percentage": flag.percentage
        }
        
        self.redis.set(f"flag:{flag.name}", json.dumps(flag_data))
        
    def is_enabled(self, name: str, context: Dict[str, Any] = None) -> bool:
        """Проверка активности feature flag"""
        flag = self.get_flag(name)
        if not flag or not flag.enabled:
            return False
            
        # Проверка процентного распределения
        if flag.percentage < 100:
            import hashlib
            user_id = str(context.get("user_id", ""))
            hash_value = int(hashlib.md5(user_id.encode()).hexdigest(), 16)
            if hash_value % 100 >= flag.percentage:
                return False
                
        # Проверка правил
        if flag.rules and context:
            return self._evaluate_rules(flag.rules, context)
            
        return True
        
    def _evaluate_rules(self, rules: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """Оценка правил feature flag"""
        if not rules:
            return True
            
        operator = rules.get("operator", "and")
        conditions = rules.get("conditions", [])
        
        results = []
        for condition in conditions:
            field = condition.get("field")
            value = condition.get("value")
            operation = condition.get("operation", "equals")
            
            if field not in context:
                results.append(False)
                continue
                
            context_value = context[field]
            
            if operation == "equals":
                results.append(context_value == value)
            elif operation == "not_equals":
                results.append(context_value != value)
            elif operation == "contains":
                results.append(value in context_value)
            elif operation == "greater_than":
                results.append(context_value > value)
            elif operation == "less_than":
                results.append(context_value < value)
                
        if operator == "and":
            return all(results)
        elif operator == "or":
            return any(results)
            
        return False

# c:\projects\DNA-utils-universal\ystr_predictor\api\flag_endpoints.py
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, List
from datetime import datetime

router = APIRouter()
flag_service = FeatureFlagService()

@router.post("/flags")
async def create_flag(flag_data: Dict):
    """Создание нового feature flag"""
    try:
        flag = flag_service.create_flag(
            name=flag_data["name"],
            description=flag_data["description"],
            rules=flag_data.get("rules")
        )
        return flag
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/flags/{name}")
async def get_flag(name: str):
    """Получение feature flag"""
    flag = flag_service.get_flag(name)
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    return flag

@router.patch("/flags/{name}")
async def update_flag(name: str, updates: Dict):
    """Обновление feature flag"""
    flag = flag_service.update_flag(name, updates)
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    return flag

@router.delete("/flags/{name}")
async def delete_flag(name: str):
    """Удаление feature flag"""
    if not flag_service.delete_flag(name):
        raise HTTPException(status_code=404, detail="Flag not found")
    return {"message": "Flag deleted"}

@router.post("/flags/{name}/check")
async def check_flag(name: str, context: Dict = None):
    """Проверка feature flag"""
    return {
        "enabled": flag_service.is_enabled(name, context or {})
    }