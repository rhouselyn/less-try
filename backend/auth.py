"""用户认证：注册、登录、JWT、依赖注入。一个文件搞定。"""

import uuid
import sqlite3
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError
from passlib.context import CryptContext

from config import DATA_DIR

# ---- 配置 ----
SECRET_KEY = "dev-secret-change-in-production"  # ponytail: 环境变量后补
ALGORITHM = "HS256"

# ---- 模型 ----
class UserTier(str, Enum):
    free = "free"
    basic = "basic"
    pro = "pro"

class UserCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    tier: UserTier = UserTier.free

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: str
    tier: UserTier = UserTier.free

# ---- 工具 ----
_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
_security = HTTPBearer(auto_error=False)

def _hash(pw: str) -> str:
    return _pwd_ctx.hash(pw)

def _verify(pw: str, hashed: str) -> bool:
    return _pwd_ctx.verify(pw, hashed)

def _create_tokens(user_id: str, tier: UserTier) -> Token:
    now = datetime.now(timezone.utc)
    access = jwt.encode(
        {"sub": user_id, "tier": tier.value, "exp": now + timedelta(minutes=15), "type": "access"},
        SECRET_KEY, algorithm=ALGORITHM)
    refresh = jwt.encode(
        {"sub": user_id, "tier": tier.value, "exp": now + timedelta(days=7), "type": "refresh"},
        SECRET_KEY, algorithm=ALGORITHM)
    return Token(access_token=access, refresh_token=refresh)

def _decode(token: str) -> Optional[TokenData]:
    try:
        p = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenData(user_id=p["sub"], tier=UserTier(p.get("tier", "free")))
    except (JWTError, ValueError):
        return None

# ---- 数据库 ----
_DB = str(DATA_DIR / "users.db")

def _conn():
    c = sqlite3.connect(_DB)
    c.row_factory = sqlite3.Row
    c.execute("""CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT,
        password_hash TEXT NOT NULL, tier TEXT NOT NULL DEFAULT 'free',
        api_key TEXT, base_url TEXT, model TEXT, created_at TEXT NOT NULL)""")
    c.commit()
    return c

# ---- 依赖注入 ----
async def get_current_user(cred: HTTPAuthorizationCredentials = Depends(_security)) -> Optional[TokenData]:
    if cred is None:
        return None
    data = _decode(cred.credentials)
    if data is None:
        raise HTTPException(status_code=401, detail="无效的认证凭据")
    return data

async def require_auth(user: TokenData = Depends(get_current_user)) -> TokenData:
    if user is None:
        raise HTTPException(status_code=401, detail="请先登录")
    return user

# ---- 路由 ----
router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=Token)
async def register(body: UserCreate):
    c = _conn()
    if c.execute("SELECT 1 FROM users WHERE email=?", (body.email,)).fetchone():
        c.close()
        raise HTTPException(status_code=400, detail="该邮箱已注册")
    uid = str(uuid.uuid4())
    c.execute("INSERT INTO users (id,email,name,password_hash,tier,created_at) VALUES (?,?,?,?,?,?)",
              (uid, body.email, body.name or body.email.split("@")[0],
               _hash(body.password), UserTier.free.value, datetime.now(timezone.utc).isoformat()))
    c.commit(); c.close()
    return _create_tokens(uid, UserTier.free)

@router.post("/login", response_model=Token)
async def login(body: UserLogin):
    c = _conn()
    row = c.execute("SELECT id,password_hash,tier FROM users WHERE email=?", (body.email,)).fetchone()
    c.close()
    if not row or not _verify(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    return _create_tokens(row["id"], UserTier(row["tier"]))

@router.post("/refresh", response_model=Token)
async def refresh(refresh_token: str):
    data = _decode(refresh_token)
    if data is None:
        raise HTTPException(status_code=401, detail="无效的刷新令牌")
    c = _conn()
    row = c.execute("SELECT tier FROM users WHERE id=?", (data.user_id,)).fetchone()
    c.close()
    if not row:
        raise HTTPException(status_code=401, detail="用户不存在")
    return _create_tokens(data.user_id, UserTier(row["tier"]))

@router.get("/me", response_model=UserOut)
async def me(user: TokenData = Depends(require_auth)):
    c = _conn()
    row = c.execute("SELECT id,email,name,tier FROM users WHERE id=?", (user.user_id,)).fetchone()
    c.close()
    if not row:
        raise HTTPException(status_code=404, detail="用户不存在")
    return UserOut(id=row["id"], email=row["email"], name=row["name"], tier=UserTier(row["tier"]))

@router.put("/me/api-key")
async def update_api_key(api_key: str = None, base_url: str = None, model: str = None,
                         user: TokenData = Depends(require_auth)):
    sets, vals = [], []
    for k, v in [("api_key", api_key), ("base_url", base_url), ("model", model)]:
        if v is not None:
            sets.append(f"{k}=?"); vals.append(v)
    if sets:
        vals.append(user.user_id)
        c = _conn()
        c.execute(f"UPDATE users SET {','.join(sets)} WHERE id=?", vals)
        c.commit(); c.close()
    return {"status": "ok"}
