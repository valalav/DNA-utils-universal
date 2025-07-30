# c:\projects\DNA-utils-universal\ystr_predictor\replication\sync_service.py
from typing import Dict, List, Optional
import asyncio
import aiohttp
import json
import logging
from datetime import datetime
import hashlib
from pathlib import Path

class ModelSyncService:
    def __init__(self, config_path: str = "config/replication.json"):
        self.config = self._load_config(config_path)
        self.logger = logging.getLogger(__name__)
        self._initialize_storage()

    def _load_config(self, config_path: str) -> Dict:
        """Загрузка конфигурации реплик"""
        try:
            with open(config_path) as f:
                return json.load(f)
        except FileNotFoundError:
            # Создаем конфигурацию по умолчанию
            config = {
                "replicas": [],
                "sync_interval": 300,  # 5 минут
                "batch_size": 1000,
                "checksum_algorithm": "sha256",
                "regions": {
                    "us-east": {"primary": True, "url": "http://us-east.example.com"},
                    "eu-west": {"primary": False, "url": "http://eu-west.example.com"},
                    "ap-south": {"primary": False, "url": "http://ap-south.example.com"}
                }
            }
            Path(config_path).parent.mkdir(parents=True, exist_ok=True)
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)
            return config

    def _initialize_storage(self):
        """Инициализация хранилища для моделей"""
        for region in self.config["regions"]:
            Path(f"models/{region}").mkdir(parents=True, exist_ok=True)

    async def sync_model(self, model_id: str, source_region: str):
        """Синхронизация модели между регионами"""
        try:
            # Получаем модель из исходного региона
            model_data = await self._fetch_model(model_id, source_region)
            if not model_data:
                self.logger.error(f"Failed to fetch model {model_id} from {source_region}")
                return False

            # Проверяем целостность данных
            if not self._verify_checksum(model_data):
                self.logger.error(f"Checksum verification failed for model {model_id}")
                return False

            # Синхронизируем с другими регионами
            tasks = []
            for region, config in self.config["regions"].items():
                if region != source_region:
                    tasks.append(
                        self._replicate_to_region(model_id, model_data, region)
                    )

            # Ждем завершения всех задач репликации
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Проверяем результаты
            success = all(isinstance(r, bool) and r for r in results)
            
            if success:
                self.logger.info(f"Model {model_id} successfully replicated to all regions")
            else:
                self.logger.error(f"Model {model_id} replication failed in some regions")
                
            return success

        except Exception as e:
            self.logger.error(f"Error syncing model {model_id}: {str(e)}")
            return False

    async def _fetch_model(self, model_id: str, region: str) -> Optional[Dict]:
        """Получение модели из региона"""
        url = f"{self.config['regions'][region]['url']}/api/models/{model_id}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        self.logger.error(
                            f"Failed to fetch model {model_id} from {region}: "
                            f"Status {response.status}"
                        )
                        return None
        except Exception as e:
            self.logger.error(f"Error fetching model: {str(e)}")
            return None

    async def _replicate_to_region(self, model_id: str, model_data: Dict, 
                                 target_region: str) -> bool:
        """Репликация модели в целевой регион"""
        url = f"{self.config['regions'][target_region]['url']}/api/models/{model_id}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.put(url, json=model_data) as response:
                    success = response.status == 200
                    if not success:
                        self.logger.error(
                            f"Failed to replicate model {model_id} to {target_region}: "
                            f"Status {response.status}"
                        )
                    return success
        except Exception as e:
            self.logger.error(f"Error replicating model: {str(e)}")
            return False

    def _verify_checksum(self, model_data: Dict) -> bool:
        """Проверка целостности данных модели"""
        try:
            received_checksum = model_data.get("checksum")
            if not received_checksum:
                return False

            # Вычисляем checksum
            data_bytes = json.dumps(model_data["model"], sort_keys=True).encode()
            calculated_checksum = hashlib.sha256(data_bytes).hexdigest()

            return received_checksum == calculated_checksum
        except Exception as e:
            self.logger.error(f"Error verifying checksum: {str(e)}")
            return False

    async def start_sync_loop(self):
        """Запуск цикла синхронизации"""
        while True:
            try:
                # Получаем список моделей для синхронизации
                models = await self._get_models_for_sync()
                
                for model in models:
                    # Определяем исходный регион
                    source_region = await self._determine_source_region(model["id"])
                    
                    # Синхронизируем модель
                    await self.sync_model(model["id"], source_region)
                
                # Ждем следующего цикла
                await asyncio.sleep(self.config["sync_interval"])
                
            except Exception as e:
                self.logger.error(f"Error in sync loop: {str(e)}")
                await asyncio.sleep(60)  # Ждем минуту перед повторной попыткой

    async def _get_models_for_sync(self) -> List[Dict]:
        """Получение списка моделей для синхронизации"""
        try:
            models = []
            # Проверяем каждый регион
            for region, config in self.config["regions"].items():
                if config["primary"]:
                    url = f"{config['url']}/api/models/pending_sync"
                    async with aiohttp.ClientSession() as session:
                        async with session.get(url) as response:
                            if response.status == 200:
                                region_models = await response.json()
                                models.extend(region_models)
            return models
        except Exception as e:
            self.logger.error(f"Error getting models for sync: {str(e)}")
            return []

    async def _determine_source_region(self, model_id: str) -> str:
        """Определение исходного региона для модели"""
        # По умолчанию используем primary регион
        primary_region = next(
            region for region, config in self.config["regions"].items() 
            if config["primary"]
        )
        
        try:
            # Проверяем наличие модели в каждом регионе
            latest_timestamp = None
            source_region = primary_region

            for region, config in self.config["regions"].items():
                url = f"{config['url']}/api/models/{model_id}/metadata"
                async with aiohttp.ClientSession() as session:
                    async with session.get(url) as response:
                        if response.status == 200:
                            metadata = await response.json()
                            if not latest_timestamp or metadata["updated_at"] > latest_timestamp:
                                latest_timestamp = metadata["updated_at"]
                                source_region = region

            return source_region
        except Exception as e:
            self.logger.error(f"Error determining source region: {str(e)}")
            return primary_region