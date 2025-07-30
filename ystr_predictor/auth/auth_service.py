# c:\projects\DNA-utils-universal\ystr_predictor\auth\auth_service.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, Dict
import sqlite3
from pathlib import Path
import logging

# Конфигурация безопасности
SECRET_KEY = "your-secret-key-please-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

class AuthService:
    def __init__(self, db_path: str = "auth.db"):
        self.db_path = db_path
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
        self.initialize_db()
        
    def initialize_db(self):
        """Инициализация базы данных для аутентификации"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    hashed_password TEXT NOT NULL,
                    role TEXT NOT NULL,
                    is_active BOOLEAN NOT NULL DEFAULT 1
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS access_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    timestamp TEXT,
                    action TEXT,
                    resource TEXT,
                    success BOOLEAN,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
    async def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Проверка пароля"""
        return self.pwd_context.verify(plain_password, hashed_password)
        
    def get_password_hash(self, password: str) -> str:
        """Хеширование пароля"""
        return self.pwd_context.hash(password)
        
    async def create_user(self, username: str, email: str, password: str, role: str = "user"):
        """Создание нового пользователя"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    """
                    INSERT INTO users (username, email, hashed_password, role)
                    VALUES (?, ?, ?, ?)
                    """,
                    (username, email, self.get_password_hash(password), role)
                )
            return True
        except sqlite3.IntegrityError:
            return False
            
    async def get_user(self, username: str):
        """Получение пользователя"""
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.execute(
                "SELECT * FROM users WHERE username = ?",
                (username,)
            )
            user = cur.fetchone()
            if user:
                return {
                    "id": user[0],
                    "username": user[1],
                    "email": user[2],
                    "role": user[4],
                    "is_active": user[5]
                }
        return None
        
    async def authenticate_user(self, username: str, password: str):
        """Аутентификация пользователя"""
        user = await self.get_user(username)
        if not user:
            return False
        if not await self.verify_password(password, self.get_password_hash(password)):
            return False
        return user
        
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        """Создание JWT токена"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
            
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
        
    async def log_access(self, user_id: int, action: str, resource: str, success: bool):
        """Логирование доступа"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO access_logs (user_id, timestamp, action, resource, success)
                VALUES (?, ?, ?, ?, ?)
                """,
                (user_id, datetime.now().isoformat(), action, resource, success)
            )
            
    async def get_current_user(self, token: str = Depends(oauth2_scheme)):
        """Получение текущего пользователя из токена"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                raise credentials_exception
        except JWTError:
            raise credentials_exception
            
        user = await self.get_user(username)
        if user is None:
            raise credentials_exception
        return user
        
    def check_permission(self, user: Dict, required_role: str) -> bool:
        """Проверка прав доступа"""
        roles_hierarchy = {
            "admin": 3,
            "moderator": 2,
            "user": 1
        }
        return roles_hierarchy.get(user["role"], 0) >= roles_hierarchy.get(required_role, 0)

# c:\projects\DNA-utils-universal\ystr_predictor\api\auth_endpoints.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from typing import Dict

router = APIRouter()
auth_service = AuthService()

@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Получение токена доступа"""
    user = await auth_service.authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth_service.create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.post("/users/create")
async def create_user(
    username: str,
    email: str,
    password: str,
    role: str = "user",
    current_user: Dict = Depends(auth_service.get_current_user)
):
    """Создание нового пользователя (только для админов)"""
    if not auth_service.check_permission(current_user, "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
        
    success = await auth_service.create_user(username, email, password, role)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists"
        )
        
    return {"message": "User created successfully"}

@router.get("/users/me")
async def read_users_me(current_user: Dict = Depends(auth_service.get_current_user)):
    """Получение информации о текущем пользователе"""
    return current_user

@router.get("/users/logs")
async def get_access_logs(
    current_user: Dict = Depends(auth_service.get_current_user)
):
    """Получение логов доступа (только для админов)"""
    if not auth_service.check_permission(current_user, "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
        
    with sqlite3.connect(auth_service.db_path) as conn:
        logs = conn.execute(
            """
            SELECT u.username, l.timestamp, l.action, l.resource, l.success
            FROM access_logs l
            JOIN users u ON l.user_id = u.id
            ORDER BY l.timestamp DESC
            LIMIT 100
            """
        ).fetchall()
        
    return [
        {
            "username": log[0],
            "timestamp": log[1],
            "action": log[2],
            "resource": log[3],
            "success": log[4]
        }
        for log in logs
    ]