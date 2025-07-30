# c:\projects\DNA-utils-universal\ystr_predictor\gateway\gateway_service.py
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import asyncio
import jwt
from datetime import datetime, timedelta
import logging
from typing import Dict, Optional
import aiocache
from ratelimit import RateLimitMiddleware, Rule
from ratelimit.backends.redis import RedisBackend

class ApiGateway:
    def __init__(self):
        self.app = FastAPI()
        self.setup_middleware()
        self.setup_routes()
        self.cache = aiocache.Cache(aiocache.RedisCache)
        self.logger = logging.getLogger(__name__)

        # Конфигурация сервисов
        self.services = {
            "predictor": "http://localhost:8000",
            "ab_testing": "http://localhost:8001",
            "analytics": "http://localhost:8002"
        }

    def setup_middleware(self):
        """Настройка middleware"""
        # CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"]
        )

        # Rate Limiting
        self.app.add_middleware(
            RateLimitMiddleware,
            authenticate=self._authenticate_key,
            backend=RedisBackend(),
            config={
                r"^/api/predict": [Rule(minute=100)],
                r"^/api/experiments": [Rule(minute=50)],
                r"^/api/analytics": [Rule(minute=30)]
            }
        )

    def setup_routes(self):
        """Настройка маршрутов"""
        @self.app.get("/health")
        async def health_check():
            return {"status": "healthy"}

        @self.app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
        async def gateway(request: Request, path: str):
            try:
                return await self._handle_request(request, path)
            except Exception as e:
                self.logger.error(f"Gateway error: {str(e)}")
                raise HTTPException(status_code=500, detail="Internal server error")

    async def _handle_request(self, request: Request, path: str) -> JSONResponse:
        """Обработка запроса"""
        # Определяем целевой сервис
        service = self._get_service(path)
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")

        # Проверяем аутентификацию
        await self._check_auth(request)

        # Проверяем кэш для GET запросов
        if request.method == "GET":
            cached_response = await self._get_cache(request)
            if cached_response:
                return JSONResponse(cached_response)

        # Проксируем запрос
        async with httpx.AsyncClient() as client:
            try:
                response = await self._proxy_request(client, request, service, path)
                
                # Кэшируем GET ответы
                if request.method == "GET":
                    await self._set_cache(request, response)
                    
                return JSONResponse(response)
            except Exception as e:
                self.logger.error(f"Proxy error: {str(e)}")
                raise HTTPException(status_code=502, detail="Service unavailable")

    def _get_service(self, path: str) -> Optional[str]:
        """Определение целевого сервиса по пути"""
        if path.startswith("predict"):
            return self.services["predictor"]
        elif path.startswith("experiments"):
            return self.services["ab_testing"]
        elif path.startswith("analytics"):
            return self.services["analytics"]
        return None

    async def _check_auth(self, request: Request):
        """Проверка аутентификации"""
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise HTTPException(
                status_code=401,
                detail="Missing authentication"
            )

        try:
            # Проверяем JWT токен
            token = auth_header.split()[1]
            jwt.decode(token, "secret", algorithms=["HS256"])
        except Exception:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication"
            )

    async def _get_cache(self, request: Request) -> Optional[Dict]:
        """Получение данных из кэша"""
        cache_key = self._get_cache_key(request)
        return await self.cache.get(cache_key)

    async def _set_cache(self, request: Request, response: Dict):
        """Сохранение данных в кэш"""
        cache_key = self._get_cache_key(request)
        await self.cache.set(cache_key, response, ttl=300)  # 5 минут

    def _get_cache_key(self, request: Request) -> str:
        """Генерация ключа кэша"""
        return f"{request.method}:{request.url.path}:{request.query_params}"

    async def _proxy_request(self, client: httpx.AsyncClient, 
                           request: Request, service: str, path: str) -> Dict:
        """Проксирование запроса"""
        url = f"{service}/{path}"
        
        # Копируем заголовки и параметры
        headers = dict(request.headers)
        params = dict(request.query_params)
        
        # Получаем тело запроса
        body = await request.body()
        
        # Выполняем запрос
        response = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            params=params,
            content=body
        )
        
        return response.json()

    @staticmethod
    async def _authenticate_key(request: Request) -> str:
        """Аутентификация для rate limiting"""
        if auth_header := request.headers.get("Authorization"):
            return auth_header.split()[1]
        return request.client.host

if __name__ == "__main__":
    import uvicorn
    gateway = ApiGateway()
    uvicorn.run(gateway.app, host="0.0.0.0", port=8080)