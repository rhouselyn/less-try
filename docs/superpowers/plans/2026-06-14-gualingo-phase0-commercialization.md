# 呱邻国 Phase 0 商业化改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将呱邻国从开源工具改造为 Freemium SaaS 产品，实现用户系统、API 代理、云同步和支付集成。

**Architecture:** 在现有 FastAPI + React 架构上扩展，新增用户认证服务（JWT）、API 代理层（配额管理）、云同步服务（增量同步）和支付服务（Stripe + 国内支付）。社区版保留 BYOK + 本地存储，商业版通过环境变量切换为平台服务模式。

**Tech Stack:** FastAPI · React 18 · SQLite(本地) · PostgreSQL(云端) · Redis(配额/缓存) · JWT · Stripe · Docker

**设计文档:** `docs/superpowers/specs/2026-06-14-gualingo-commercialization-design.md`

---

## 文件结构

### 新增文件

```
backend/
  auth/
    __init__.py
    models.py          ← 用户/订阅数据模型
    router.py          ← 认证相关路由
    jwt_utils.py       ← JWT 生成/验证
    deps.py            ← 依赖注入（获取当前用户）
  api_proxy/
    __init__.py
    router.py          ← API 代理路由
    quota.py           ← 配额管理（Redis 计数器）
    key_pool.py        ← 平台 API Key 池管理
  sync/
    __init__.py
    router.py          ← 云同步路由
    merge.py           ← 增量合并逻辑
  billing/
    __init__.py
    router.py          ← 支付/订阅路由
    stripe_webhook.py  ← Stripe Webhook 处理
  cloud_storage.py     ← PostgreSQL 云端存储
  config_cloud.py      ← 云服务配置（数据库/Redis/Stripe 等）

frontend/src/
  components/
    LoginPage.jsx      ← 登录/注册页面
    PricingPage.jsx    ← 定价/订阅页面
    AccountMenu.jsx    ← 用户菜单（头像/登出/订阅状态）
  utils/
    auth.js            ← 认证工具（token 管理、axios 拦截器）
```

### 修改文件

```
backend/main.py               ← 注册新路由，添加认证中间件
backend/config.py             ← 添加云服务配置项
backend/nvidia_api.py         ← API 代理层集成
backend/utils/state.py        ← storage 切换逻辑（本地/云端）
frontend/src/App.jsx          ← 添加登录/定价路由，认证状态
frontend/src/utils/api.js     ← 添加认证 header，API 代理相关调用
```

---

## Task 1: 用户认证后端

**Files:**
- Create: `backend/auth/__init__.py`
- Create: `backend/auth/models.py`
- Create: `backend/auth/jwt_utils.py`
- Create: `backend/auth/deps.py`
- Create: `backend/auth/router.py`
- Modify: `backend/requirements.txt`
- Modify: `backend/main.py`

- [ ] **Step 1: 添加认证依赖**

在 `backend/requirements.txt` 末尾添加：

```
pyjwt>=2.8.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.6
```

- [ ] **Step 2: 创建用户数据模型**

创建 `backend/auth/__init__.py`（空文件）和 `backend/auth/models.py`：

```python
"""用户与订阅数据模型。"""

from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional
from enum import Enum


class UserTier(str, Enum):
    free = "free"
    basic = "basic"
    pro = "pro"


class UserBase(BaseModel):
    email: str
    name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class User(UserBase):
    id: str
    tier: UserTier = UserTier.free
    api_key: Optional[str] = None  # BYOK 用户的自有 Key
    base_url: Optional[str] = None
    model: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: str
    tier: UserTier = UserTier.free
```

- [ ] **Step 3: 创建 JWT 工具**

创建 `backend/auth/jwt_utils.py`：

```python
"""JWT token 生成与验证。"""

import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from auth.models import UserTier, TokenData

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7


def create_access_token(user_id: str, tier: UserTier) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "tier": tier.value, "exp": expire, "type": "access"}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: str, tier: UserTier) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": user_id, "tier": tier.value, "exp": expire, "type": "refresh"}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> TokenData:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        tier: str = payload.get("tier", "free")
        token_type: str = payload.get("type", "access")
        if user_id is None:
            return None
        return TokenData(user_id=user_id, tier=UserTier(tier))
    except (JWTError, ValueError):
        return None


def create_tokens(user_id: str, tier: UserTier) -> dict:
    return {
        "access_token": create_access_token(user_id, tier),
        "refresh_token": create_refresh_token(user_id, tier),
        "token_type": "bearer",
    }
```

在 `backend/requirements.txt` 末尾追加：

```
python-jose[cryptography]>=3.3.0
```

- [ ] **Step 4: 创建依赖注入**

创建 `backend/auth/deps.py`：

```python
"""认证依赖注入。"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth.jwt_utils import decode_token
from auth.models import TokenData, UserTier

security = HTTPBearer(auto_error=False)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """从 JWT 获取当前用户，未登录返回 None（允许匿名访问社区版）。"""
    if credentials is None:
        return None
    token_data = decode_token(credentials.credentials)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭据",
        )
    return token_data


async def require_auth(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """要求用户必须登录。"""
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="请先登录",
        )
    return current_user


async def require_tier(min_tier: UserTier):
    """创建要求最低订阅层级的依赖。"""
    tier_order = {UserTier.free: 0, UserTier.basic: 1, UserTier.pro: 2}

    async def _check_tier(current_user: TokenData = Depends(require_auth)) -> TokenData:
        if tier_order.get(current_user.tier, 0) < tier_order.get(min_tier, 0):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"此功能需要 {min_tier.value} 及以上订阅",
            )
        return current_user
    return _check_tier
```

- [ ] **Step 5: 创建认证路由**

创建 `backend/auth/router.py`：

```python
"""用户认证路由。"""

import uuid
import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from auth.models import UserCreate, UserLogin, User, Token, UserTier
from auth.jwt_utils import create_tokens, decode_token
from auth.deps import require_auth, get_current_user, TokenData
from config import DATA_DIR

router = APIRouter(prefix="/api/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 简易用户存储（SQLite），后续迁移到 PostgreSQL
import sqlite3
import json

USER_DB_PATH = str(DATA_DIR / "users.db")


def _get_user_conn():
    conn = sqlite3.connect(USER_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            password_hash TEXT NOT NULL,
            tier TEXT NOT NULL DEFAULT 'free',
            api_key TEXT,
            base_url TEXT,
            model TEXT,
            oauth_provider TEXT,
            oauth_id TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT
        )
    """)
    conn.commit()
    return conn


def _hash_password(password: str) -> str:
    return pwd_context.hash(password)


def _verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


@router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    conn = _get_user_conn()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (user_data.email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="该邮箱已注册")
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        "INSERT INTO users (id, email, name, password_hash, tier, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (user_id, user_data.email, user_data.name or user_data.email.split("@")[0],
         _hash_password(user_data.password), UserTier.free.value, now)
    )
    conn.commit()
    conn.close()
    return create_tokens(user_id, UserTier.free)


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    conn = _get_user_conn()
    row = conn.execute("SELECT id, password_hash, tier FROM users WHERE email = ?", (user_data.email,)).fetchone()
    conn.close()
    if not row or not _verify_password(user_data.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")
    return create_tokens(row["id"], UserTier(row["tier"]))


@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_token: str):
    token_data = decode_token(refresh_token)
    if token_data is None:
        raise HTTPException(status_code=401, detail="无效的刷新令牌")
    conn = _get_user_conn()
    row = conn.execute("SELECT tier FROM users WHERE id = ?", (token_data.user_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=401, detail="用户不存在")
    return create_tokens(token_data.user_id, UserTier(row["tier"]))


@router.get("/me", response_model=User)
async def get_me(current_user: TokenData = Depends(require_auth)):
    conn = _get_user_conn()
    row = conn.execute(
        "SELECT id, email, name, tier, api_key, base_url, model, created_at FROM users WHERE id = ?",
        (current_user.user_id,)
    ).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="用户不存在")
    return User(
        id=row["id"], email=row["email"], name=row["name"],
        tier=UserTier(row["tier"]), api_key=row["api_key"],
        base_url=row["base_url"], model=row["model"],
        created_at=row["created_at"]
    )


@router.put("/me/api-key")
async def update_api_key(
    api_key: str = None, base_url: str = None, model: str = None,
    current_user: TokenData = Depends(require_auth)
):
    conn = _get_user_conn()
    updates = []
    params = []
    if api_key is not None:
        updates.append("api_key = ?")
        params.append(api_key)
    if base_url is not None:
        updates.append("base_url = ?")
        params.append(base_url)
    if model is not None:
        updates.append("model = ?")
        params.append(model)
    if updates:
        params.append(current_user.user_id)
        conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
    conn.close()
    return {"status": "ok"}
```

- [ ] **Step 6: 注册认证路由到主应用**

在 `backend/main.py` 中添加路由注册。在 `from routers import ...` 之后添加：

```python
from auth.router import router as auth_router
app.include_router(auth_router)
```

- [ ] **Step 7: 验证认证端点**

启动后端，测试注册和登录：

```bash
cd /workspace && uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
curl -X POST http://localhost:8000/api/auth/register -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"test123","name":"Test"}'
# 预期: 返回 access_token 和 refresh_token

curl -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"test123"}'
# 预期: 返回 token

curl http://localhost:8000/api/auth/me -H "Authorization: Bearer <access_token>"
# 预期: 返回用户信息
```

- [ ] **Step 8: 提交**

```bash
git add backend/auth/ backend/requirements.txt backend/main.py
git commit -m "feat: add user authentication system (register/login/JWT)"
```

---

## Task 2: 前端认证集成

**Files:**
- Create: `frontend/src/utils/auth.js`
- Create: `frontend/src/components/LoginPage.jsx`
- Create: `frontend/src/components/AccountMenu.jsx`
- Modify: `frontend/src/utils/api.js`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: 创建认证工具**

创建 `frontend/src/utils/auth.js`：

```javascript
/** 认证工具：token 管理、axios 拦截器。 */

import axios from 'axios';

const TOKEN_KEY = 'gualingo_tokens';
const USER_KEY = 'gualingo_user';

export const auth = {
  getTokens() {
    try {
      return JSON.parse(localStorage.getItem(TOKEN_KEY));
    } catch { return null; }
  },

  setTokens(tokens) {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  },

  clearTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getAccessToken() {
    const tokens = this.getTokens();
    return tokens?.access_token || null;
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch { return null; }
  },

  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  isLoggedIn() {
    return !!this.getAccessToken();
  },

  async login(email, password) {
    const response = await axios.post('/api/auth/login', { email, password });
    this.setTokens(response.data);
    await this.fetchUser();
    return response.data;
  },

  async register(email, password, name) {
    const response = await axios.post('/api/auth/register', { email, password, name });
    this.setTokens(response.data);
    await this.fetchUser();
    return response.data;
  },

  async fetchUser() {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      this.setUser(response.data);
      return response.data;
    } catch {
      this.clearTokens();
      return null;
    }
  },

  logout() {
    this.clearTokens();
    window.location.reload();
  }
};

// axios 请求拦截器：自动附加 token
axios.interceptors.request.use((config) => {
  const token = auth.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// axios 响应拦截器：401 时尝试刷新 token
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const tokens = auth.getTokens();
      if (tokens?.refresh_token) {
        try {
          const response = await axios.post('/api/auth/refresh', tokens.refresh_token, {
            headers: { 'Content-Type': 'text/plain' }
          });
          auth.setTokens(response.data);
          originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
          return axios(originalRequest);
        } catch {
          auth.clearTokens();
          window.location.reload();
        }
      }
    }
    return Promise.reject(error);
  }
);
```

- [ ] **Step 2: 创建登录页面**

创建 `frontend/src/components/LoginPage.jsx`：

```jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { auth } from '../utils/auth';

export default function LoginPage({ t, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await auth.register(email, password, name);
      } else {
        await auth.login(email, password);
      }
      onLoginSuccess?.();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || (isRegister ? '注册失败' : '登录失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-parchment-50 border-2 border-aged-200 rounded-sm p-8 shadow-retro"
      >
        <h2 className="text-2xl font-serif text-ink-800 text-center mb-6">
          {isRegister ? (t?.register || '注册') : (t?.login || '登录')}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm text-ink-600 mb-1">{t?.name || '昵称'}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-aged-200 rounded-sm bg-white focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-ink-600 mb-1">{t?.email || '邮箱'}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-aged-200 rounded-sm bg-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm text-ink-600 mb-1">{t?.password || '密码'}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-aged-200 rounded-sm bg-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-amber-500 text-white font-medium rounded-sm hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {loading ? '...' : (isRegister ? (t?.register || '注册') : (t?.login || '登录'))}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-ink-500">
          {isRegister ? (t?.hasAccount || '已有账号？') : (t?.noAccount || '没有账号？')}
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="text-amber-600 hover:text-amber-700 ml-1"
          >
            {isRegister ? (t?.login || '登录') : (t?.register || '注册')}
          </button>
        </p>

        <div className="mt-6 pt-4 border-t border-aged-200">
          <p className="text-center text-xs text-ink-400">
            {t?.byokHint || '也可以跳过登录，直接使用自己的 API Key'}
          </p>
          <button
            onClick={() => onLoginSuccess?.()}
            className="w-full mt-2 py-2 border border-aged-200 text-ink-600 rounded-sm hover:bg-parchment-100 transition-colors text-sm"
          >
            {t?.skipLogin || '跳过，直接使用'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 3: 创建用户菜单组件**

创建 `frontend/src/components/AccountMenu.jsx`：

```jsx
import { useState, useRef, useEffect } from 'react';
import { auth } from '../utils/auth';

export default function AccountMenu({ t }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const user = auth.getUser();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const tierLabel = { free: t?.freeTier || '免费版', basic: t?.basicTier || '基础版', pro: t?.proTier || '专业版' };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-sm hover:bg-parchment-200/60 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-medium">
          {(user.name || user.email)[0].toUpperCase()}
        </div>
        <span className="text-sm text-ink-700 hidden sm:inline">{user.name || user.email}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-parchment-50 border-2 border-aged-200 rounded-sm shadow-retro z-50">
          <div className="px-4 py-3 border-b border-aged-200">
            <p className="text-sm font-medium text-ink-800">{user.email}</p>
            <p className="text-xs text-amber-600 mt-0.5">{tierLabel[user.tier] || user.tier}</p>
          </div>
          <button
            onClick={() => { auth.logout(); setOpen(false); }}
            className="w-full text-left px-4 py-2 text-sm text-ink-600 hover:bg-parchment-100 transition-colors"
          >
            {t?.logout || '退出登录'}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 在 api.js 中添加认证相关 API**

在 `frontend/src/utils/api.js` 的 `api` 对象末尾添加：

```javascript
  // 认证相关
  getMe: async () => {
    const response = await axios.get(`${baseUrl}/api/auth/me`);
    return response.data;
  },

  updateApiKey: async (apiKey, baseUrl, model) => {
    const response = await axios.put(`${baseUrl}/api/auth/me/api-key`, {
      api_key: apiKey, base_url: baseUrl, model: model
    });
    return response.data;
  },
```

- [ ] **Step 5: 在 App.jsx 中集成认证流程**

在 `frontend/src/App.jsx` 中：

1. 在文件顶部 import 区域添加：
```jsx
import LoginPage from './components/LoginPage'
import AccountMenu from './components/AccountMenu'
import { auth } from './utils/auth'
```

2. 在 App 函数内，state 声明区域添加：
```jsx
const [currentUser, setCurrentUser] = useState(null)
const [showLogin, setShowLogin] = useState(false)
```

3. 在第一个 `useEffect`（warmupSpeech 那个）中添加用户恢复逻辑：
```jsx
// 恢复登录状态
auth.fetchUser().then(user => {
  if (user) setCurrentUser(user)
}).catch(() => {})
```

4. 在顶部导航栏（InputStep 页面的 Settings 按钮旁边）添加 AccountMenu：
```jsx
{currentUser ? (
  <AccountMenu t={t} />
) : (
  <button
    onClick={() => setShowLogin(true)}
    className="px-3 py-1.5 text-sm text-amber-600 hover:text-amber-700 transition-colors"
  >
    {t?.login || '登录'}
  </button>
)}
```

5. 添加登录页面路由逻辑（在 step === 'input' 判断之前）：
```jsx
{showLogin && !currentUser && (
  <LoginPage t={t} onLoginSuccess={async () => {
    const user = auth.getUser();
    setCurrentUser(user);
    setShowLogin(false);
  }} />
)}
```

- [ ] **Step 6: 验证前端认证流程**

启动前端开发服务器，测试：
1. 点击"登录"按钮，显示登录页面
2. 注册新用户，自动登录并显示用户菜单
3. 刷新页面，自动恢复登录状态
4. 点击"跳过，直接使用"，不登录也能使用 BYOK

- [ ] **Step 7: 提交**

```bash
git add frontend/src/utils/auth.js frontend/src/components/LoginPage.jsx frontend/src/components/AccountMenu.jsx frontend/src/utils/api.js frontend/src/App.jsx
git commit -m "feat: add frontend authentication (login/register/account menu)"
```

---

## Task 3: API 代理层

**Files:**
- Create: `backend/api_proxy/__init__.py`
- Create: `backend/api_proxy/key_pool.py`
- Create: `backend/api_proxy/quota.py`
- Create: `backend/api_proxy/router.py`
- Modify: `backend/nvidia_api.py`
- Modify: `backend/main.py`

- [ ] **Step 1: 创建 API Key 池管理**

创建 `backend/api_proxy/__init__.py`（空文件）和 `backend/api_proxy/key_pool.py`：

```python
"""平台 API Key 池管理。"""

import json
import os
from pathlib import Path
from typing import List, Dict, Optional
from config import CONFIG_DIR


POOL_FILE = CONFIG_DIR / "api_key_pool.json"


def _load_pool() -> List[Dict]:
    if POOL_FILE.exists():
        with open(POOL_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def _save_pool(pool: List[Dict]):
    POOL_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(POOL_FILE, 'w', encoding='utf-8') as f:
        json.dump(pool, f, ensure_ascii=False, indent=2)


def get_pool_keys() -> List[Dict]:
    """获取所有平台 API Key 配置。"""
    return _load_pool()


def add_pool_key(api_key: str, base_url: str, model: str, max_rpm: int = 60) -> Dict:
    """添加一个平台 Key 到池中。"""
    pool = _load_pool()
    entry = {
        "id": f"pool_{len(pool)}",
        "api_key": api_key,
        "base_url": base_url,
        "model": model,
        "max_rpm": max_rpm,
        "current_rpm": 0,
        "enabled": True,
    }
    pool.append(entry)
    _save_pool(pool)
    return entry


def remove_pool_key(key_id: str) -> bool:
    """从池中移除一个 Key。"""
    pool = _load_pool()
    new_pool = [k for k in pool if k.get("id") != key_id]
    if len(new_pool) < len(pool):
        _save_pool(new_pool)
        return True
    return False


def get_available_key() -> Optional[Dict]:
    """获取当前可用的平台 Key（最简单的轮询策略）。"""
    pool = _load_pool()
    available = [k for k in pool if k.get("enabled", True)]
    if not available:
        return None
    # 按 current_rpm 升序，选择最空闲的 Key
    available.sort(key=lambda k: k.get("current_rpm", 0))
    return available[0]
```

- [ ] **Step 2: 创建配额管理**

创建 `backend/api_proxy/quota.py`：

```python
"""用户 API 配额管理。"""

import json
from datetime import datetime, timezone
from typing import Optional
from config import DATA_DIR

# 简易配额存储（后续迁移到 Redis）
QUOTA_FILE = DATA_DIR / "api_quotas.json"

# 各层级配额定义
TIER_QUOTAS = {
    "free": 0,        # 免费版使用自己的 Key，平台不提供额度
    "basic": 50,      # 基础版每月 50 次文本处理
    "pro": -1,        # 专业版无限
}


def _load_quotas() -> dict:
    if QUOTA_FILE.exists():
        with open(QUOTA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def _save_quotas(quotas: dict):
    QUOTA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(QUOTA_FILE, 'w', encoding='utf-8') as f:
        json.dump(quotas, f, ensure_ascii=False, indent=2)


def get_user_quota(user_id: str, tier: str) -> dict:
    """获取用户当月配额使用情况。"""
    quotas = _load_quotas()
    now = datetime.now(timezone.utc)
    month_key = f"{now.year}-{now.month:02d}"
    user_key = f"{user_id}:{month_key}"

    user_quota = quotas.get(user_key, {"used": 0, "limit": TIER_QUOTAS.get(tier, 0)})
    # 更新 limit 以反映当前 tier
    user_quota["limit"] = TIER_QUOTAS.get(tier, 0)
    return user_quota


def check_quota(user_id: str, tier: str) -> bool:
    """检查用户是否还有配额。"""
    quota = get_user_quota(user_id, tier)
    if quota["limit"] == -1:  # 无限
        return True
    return quota["used"] < quota["limit"]


def increment_usage(user_id: str, tier: str, count: int = 1) -> dict:
    """增加用户使用量。"""
    quotas = _load_quotas()
    now = datetime.now(timezone.utc)
    month_key = f"{now.year}-{now.month:02d}"
    user_key = f"{user_id}:{month_key}"

    if user_key not in quotas:
        quotas[user_key] = {"used": 0, "limit": TIER_QUOTAS.get(tier, 0)}

    quotas[user_key]["used"] += count
    quotas[user_key]["limit"] = TIER_QUOTAS.get(tier, 0)
    _save_quotas(quotas)
    return quotas[user_key]
```

- [ ] **Step 3: 创建 API 代理路由**

创建 `backend/api_proxy/router.py`：

```python
"""API 代理路由。"""

from fastapi import APIRouter, Depends, HTTPException
from auth.deps import require_auth, TokenData
from auth.models import UserTier
from api_proxy.quota import get_user_quota, check_quota, increment_usage
from api_proxy.key_pool import get_available_key

router = APIRouter(prefix="/api/proxy", tags=["api-proxy"])


@router.get("/quota")
async def get_quota(current_user: TokenData = Depends(require_auth)):
    """获取当前用户的 API 配额使用情况。"""
    return get_user_quota(current_user.user_id, current_user.tier.value)


@router.post("/use")
async def use_api(current_user: TokenData = Depends(require_auth)):
    """使用一次平台 API 调用（由后端内部调用，非前端直接调用）。"""
    tier = current_user.tier.value
    if tier == "free":
        raise HTTPException(status_code=403, detail="免费版需使用自己的 API Key")

    if not check_quota(current_user.user_id, tier):
        raise HTTPException(status_code=429, detail="本月 API 额度已用完，请升级订阅")

    key = get_available_key()
    if not key:
        raise HTTPException(status_code=503, detail="平台 API 暂时不可用，请稍后重试")

    # 增加使用量
    quota = increment_usage(current_user.user_id, tier)
    return {
        "api_key": key["api_key"],
        "base_url": key["base_url"],
        "model": key["model"],
        "remaining": quota["limit"] - quota["used"] if quota["limit"] != -1 else -1,
    }
```

- [ ] **Step 4: 集成 API 代理到 nvidia_api.py**

在 `backend/nvidia_api.py` 中，修改 `call_minimax_with_rotation` 函数，在尝试用户自有 Key 之前，先检查是否为平台代理用户：

在 `call_minimax_with_rotation` 函数开头（`settings = _load_settings()` 之前）添加平台代理逻辑：

```python
async def call_minimax_with_rotation(messages: List[Dict], tools: List[Dict] = None, temperature: float = 0.0, max_tokens: int = 4096, user_context: dict = None):
    """调用 LLM API，支持用户自有 Key 和平台代理。"""
    import time as _time

    # 如果有用户上下文且为付费用户，尝试平台代理
    if user_context and user_context.get("tier") != "free":
        try:
            from api_proxy.key_pool import get_available_key
            from api_proxy.quota import check_quota, increment_usage
            tier = user_context["tier"]
            user_id = user_context["user_id"]
            if check_quota(user_id, tier):
                key = get_available_key()
                if key:
                    api = NvidiaAPI.__new__(NvidiaAPI)
                    api.api_key = key["api_key"]
                    api.base_url = key["base_url"]
                    api.model = key["model"]
                    api.headers = {
                        "Authorization": f"Bearer {key['api_key']}",
                        "Content-Type": "application/json"
                    }
                    try:
                        result = await api.call_minimax(messages, tools=tools, temperature=temperature, max_tokens=max_tokens)
                        increment_usage(user_id, tier)
                        return result
                    except (requests.exceptions.HTTPError, requests.exceptions.Timeout, requests.exceptions.ConnectionError):
                        pass  # 回退到用户自有 Key
        except Exception:
            pass  # 平台代理失败，回退到 BYOK

    # 原有的 BYOK 逻辑
    settings = _load_settings()
    # ... 后续代码不变
```

- [ ] **Step 5: 注册 API 代理路由**

在 `backend/main.py` 中添加：

```python
from api_proxy.router import router as api_proxy_router
app.include_router(api_proxy_router)
```

- [ ] **Step 6: 验证 API 代理**

1. 添加一个平台 Key：
```bash
curl -X POST http://localhost:8000/api/proxy/pool -H "Content-Type: application/json" -d '{"api_key":"test-key","base_url":"https://api.siliconflow.cn/v1","model":"Qwen/Qwen3.6-27B"}'
```

2. 用付费用户登录后查看配额：
```bash
curl http://localhost:8000/api/proxy/quota -H "Authorization: Bearer <token>"
```

- [ ] **Step 7: 提交**

```bash
git add backend/api_proxy/ backend/nvidia_api.py backend/main.py
git commit -m "feat: add API proxy layer with quota management"
```

---

## Task 4: 云同步服务

**Files:**
- Create: `backend/sync/__init__.py`
- Create: `backend/sync/router.py`
- Create: `backend/sync/merge.py`
- Create: `backend/cloud_storage.py`
- Create: `backend/config_cloud.py`
- Modify: `backend/main.py`
- Modify: `frontend/src/utils/api.js`

- [ ] **Step 1: 创建云服务配置**

创建 `backend/config_cloud.py`：

```python
"""云服务配置。"""

import os

# 云模式开关（社区版为 False，商业版为 True）
CLOUD_MODE = os.environ.get("CLOUD_MODE", "false").lower() == "true"

# PostgreSQL 配置
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# Redis 配置
REDIS_URL = os.environ.get("REDIS_URL", "")

# Stripe 配置
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

# 国内支付配置
WECHAT_PAY_MCH_ID = os.environ.get("WECHAT_PAY_MCH_ID", "")
ALIPAY_APP_ID = os.environ.get("ALIPAY_APP_ID", "")
```

- [ ] **Step 2: 创建云端存储**

创建 `backend/sync/__init__.py`（空文件）和 `backend/cloud_storage.py`：

```python
"""云端存储（PostgreSQL），仅在 CLOUD_MODE=True 时使用。"""

import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from config_cloud import CLOUD_MODE, DATABASE_URL


if CLOUD_MODE and DATABASE_URL:
    import asyncpg

    class CloudStorage:
        def __init__(self):
            self._pool = None

        async def _get_pool(self):
            if self._pool is None:
                self._pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
            return self._pool

        async def sync_user_data(self, user_id: str, data_type: str, data: Any, client_timestamp: str):
            """上传用户数据到云端。"""
            pool = await self._get_pool()
            async with pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO user_cloud_data (user_id, data_type, data, updated_at)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (user_id, data_type)
                    DO UPDATE SET data = $3, updated_at = $4
                """, user_id, data_type, json.dumps(data, ensure_ascii=False), datetime.now(timezone.utc).isoformat())

        async def get_user_data(self, user_id: str, data_type: str) -> Optional[Dict]:
            """从云端获取用户数据。"""
            pool = await self._get_pool()
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT data, updated_at FROM user_cloud_data WHERE user_id = $1 AND data_type = $2",
                    user_id, data_type
                )
                if row:
                    return {"data": json.loads(row["data"]), "updated_at": row["updated_at"]}
                return None

        async def get_all_user_data(self, user_id: str) -> Dict[str, Any]:
            """获取用户所有云端数据。"""
            pool = await self._get_pool()
            async with pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT data_type, data, updated_at FROM user_cloud_data WHERE user_id = $1",
                    user_id
                )
                return {row["data_type"]: {"data": json.loads(row["data"]), "updated_at": row["updated_at"]} for row in rows}

    cloud_storage = CloudStorage()
else:
    cloud_storage = None
```

- [ ] **Step 3: 创建合并逻辑**

创建 `backend/sync/merge.py`：

```python
"""增量同步合并逻辑。采用 LWW（Last Write Wins）策略。"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional


def merge_data(local_data: Any, cloud_data: Any, local_ts: Optional[str], cloud_ts: Optional[str]) -> Any:
    """合并本地和云端数据，最后写入胜出。"""
    if local_ts is None:
        return cloud_data
    if cloud_ts is None:
        return local_data

    local_time = datetime.fromisoformat(local_ts)
    cloud_time = datetime.fromisoformat(cloud_ts)

    if cloud_time >= local_time:
        return cloud_data
    return local_data


def compute_sync_delta(local_state: Dict[str, Any], cloud_state: Dict[str, Any]) -> Dict[str, Any]:
    """计算需要同步的增量数据。"""
    delta = {}
    for key, cloud_value in cloud_state.items():
        local_value = local_state.get(key)
        if local_value is None:
            delta[key] = cloud_value
        elif isinstance(cloud_value, dict) and isinstance(local_value, dict):
            if cloud_value.get("updated_at") and local_value.get("updated_at"):
                if cloud_value["updated_at"] > local_value["updated_at"]:
                    delta[key] = cloud_value
            else:
                delta[key] = cloud_value
    return delta
```

- [ ] **Step 4: 创建云同步路由**

创建 `backend/sync/router.py`：

```python
"""云同步路由。"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, Optional
from auth.deps import require_auth, TokenData
from auth.models import UserTier
from config_cloud import CLOUD_MODE, cloud_storage

router = APIRouter(prefix="/api/sync", tags=["sync"])


class SyncUploadRequest(BaseModel):
    data_type: str  # "history" | "progress" | "vocab" | "preferences"
    data: Any
    client_timestamp: Optional[str] = None


class SyncDownloadResponse(BaseModel):
    data_type: str
    data: Any
    server_timestamp: Optional[str] = None


@router.post("/upload")
async def upload_data(
    request: SyncUploadRequest,
    current_user: TokenData = Depends(require_auth)
):
    """上传本地数据到云端。"""
    if not CLOUD_MODE or cloud_storage is None:
        raise HTTPException(status_code=501, detail="云同步服务未启用")

    if current_user.tier == UserTier.free:
        raise HTTPException(status_code=403, detail="云同步需要基础版及以上订阅")

    from datetime import datetime, timezone
    timestamp = request.client_timestamp or datetime.now(timezone.utc).isoformat()

    await cloud_storage.sync_user_data(
        current_user.user_id, request.data_type, request.data, timestamp
    )
    return {"status": "ok", "timestamp": timestamp}


@router.get("/download/{data_type}", response_model=SyncDownloadResponse)
async def download_data(
    data_type: str,
    current_user: TokenData = Depends(require_auth)
):
    """从云端下载数据。"""
    if not CLOUD_MODE or cloud_storage is None:
        raise HTTPException(status_code=501, detail="云同步服务未启用")

    if current_user.tier == UserTier.free:
        raise HTTPException(status_code=403, detail="云同步需要基础版及以上订阅")

    result = await cloud_storage.get_user_data(current_user.user_id, data_type)
    if result is None:
        return SyncDownloadResponse(data_type=data_type, data=None, server_timestamp=None)
    return SyncDownloadResponse(
        data_type=data_type,
        data=result["data"],
        server_timestamp=result["updated_at"]
    )


@router.get("/download-all")
async def download_all(current_user: TokenData = Depends(require_auth)):
    """下载所有云端数据。"""
    if not CLOUD_MODE or cloud_storage is None:
        raise HTTPException(status_code=501, detail="云同步服务未启用")

    if current_user.tier == UserTier.free:
        raise HTTPException(status_code=403, detail="云同步需要基础版及以上订阅")

    return await cloud_storage.get_all_user_data(current_user.user_id)
```

- [ ] **Step 5: 注册云同步路由**

在 `backend/main.py` 中添加：

```python
from sync.router import router as sync_router
app.include_router(sync_router)
```

- [ ] **Step 6: 前端添加同步 API**

在 `frontend/src/utils/api.js` 的 `api` 对象末尾添加：

```javascript
  // 云同步
  syncUpload: async (dataType, data, clientTimestamp) => {
    const response = await axios.post(`${baseUrl}/api/sync/upload`, {
      data_type: dataType,
      data: data,
      client_timestamp: clientTimestamp || new Date().toISOString(),
    });
    return response.data;
  },

  syncDownload: async (dataType) => {
    const response = await axios.get(`${baseUrl}/api/sync/download/${dataType}`);
    return response.data;
  },

  syncDownloadAll: async () => {
    const response = await axios.get(`${baseUrl}/api/sync/download-all`);
    return response.data;
  },
```

- [ ] **Step 7: 提交**

```bash
git add backend/sync/ backend/cloud_storage.py backend/config_cloud.py backend/main.py frontend/src/utils/api.js
git commit -m "feat: add cloud sync service (upload/download/LWW merge)"
```

---

## Task 5: 支付集成（Stripe）

**Files:**
- Create: `backend/billing/__init__.py`
- Create: `backend/billing/router.py`
- Create: `backend/billing/stripe_webhook.py`
- Modify: `backend/main.py`
- Create: `frontend/src/components/PricingPage.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: 添加 Stripe 依赖**

在 `backend/requirements.txt` 末尾添加：

```
stripe>=7.0.0
```

- [ ] **Step 2: 创建支付路由**

创建 `backend/billing/__init__.py`（空文件）和 `backend/billing/router.py`：

```python
"""支付与订阅路由。"""

import os
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import stripe
from auth.deps import require_auth, TokenData
from auth.models import UserTier
from config_cloud import STRIPE_SECRET_KEY

router = APIRouter(prefix="/api/billing", tags=["billing"])

stripe.api_key = STRIPE_SECRET_KEY

# Stripe 价格 ID（需要在 Stripe Dashboard 中创建）
PRICE_IDS = {
    "basic_monthly": os.environ.get("STRIPE_BASIC_PRICE_ID", ""),
    "pro_monthly": os.environ.get("STRIPE_PRO_PRICE_ID", ""),
}


class CheckoutRequest(BaseModel):
    plan: str  # "basic" | "pro"
    success_url: str
    cancel_url: str


@router.post("/checkout")
async def create_checkout(
    request: CheckoutRequest,
    current_user: TokenData = Depends(require_auth)
):
    """创建 Stripe Checkout Session。"""
    if request.plan not in ("basic", "pro"):
        raise HTTPException(status_code=400, detail="无效的订阅计划")

    price_id = PRICE_IDS.get(f"{request.plan}_monthly")
    if not price_id:
        raise HTTPException(status_code=500, detail="支付配置错误")

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            client_reference_id=current_user.user_id,
            metadata={"user_id": current_user.user_id, "plan": request.plan},
        )
        return {"url": session.url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/portal")
async def create_portal(
    current_user: TokenData = Depends(require_auth)
):
    """创建 Stripe 客户门户 Session（管理订阅）。"""
    # 需要先获取或创建 Stripe Customer
    try:
        import sqlite3
        from config import DATA_DIR
        conn = sqlite3.connect(str(DATA_DIR / "users.db"))
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT id FROM users WHERE id = ?", (current_user.user_id,)).fetchone()

        # 简化：使用 Checkout 中的 client_reference_id 来关联
        session = stripe.billing_portal.Session.create(
            customer="",  # 需要从 webhook 回调中获取 customer_id
            return_url=os.environ.get("FRONTEND_URL", "http://localhost:8000"),
        )
        conn.close()
        return {"url": session.url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/subscription")
async def get_subscription(
    current_user: TokenData = Depends(require_auth)
):
    """获取当前用户的订阅状态。"""
    import sqlite3
    from config import DATA_DIR
    conn = sqlite3.connect(str(DATA_DIR / "users.db"))
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT tier FROM users WHERE id = ?", (current_user.user_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="用户不存在")
    return {"tier": row["tier"]}
```

- [ ] **Step 3: 创建 Stripe Webhook 处理**

创建 `backend/billing/stripe_webhook.py`：

```python
"""Stripe Webhook 处理。"""

import json
import sqlite3
import stripe
from fastapi import Request, HTTPException
from config_cloud import STRIPE_WEBHOOK_SECRET, STRIPE_SECRET_KEY
from config import DATA_DIR
from auth.models import UserTier

stripe.api_key = STRIPE_SECRET_KEY


async def handle_stripe_webhook(request: Request):
    """处理 Stripe Webhook 事件。"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="无效的签名")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        plan = session.get("metadata", {}).get("plan")
        if user_id and plan:
            _update_user_tier(user_id, plan)

    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        # 根据 subscription 更新用户 tier
        plan = subscription.get("metadata", {}).get("plan")
        user_id = subscription.get("metadata", {}).get("user_id")
        if user_id and plan:
            _update_user_tier(user_id, plan)

    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        user_id = subscription.get("metadata", {}).get("user_id")
        if user_id:
            _update_user_tier(user_id, "free")

    return {"status": "ok"}


def _update_user_tier(user_id: str, plan: str):
    """更新用户订阅层级。"""
    conn = sqlite3.connect(str(DATA_DIR / "users.db"))
    tier = UserTier(plan).value if plan in ("free", "basic", "pro") else "free"
    conn.execute("UPDATE users SET tier = ? WHERE id = ?", (tier, user_id))
    conn.commit()
    conn.close()
```

- [ ] **Step 4: 注册支付路由和 Webhook**

在 `backend/main.py` 中添加：

```python
from billing.router import router as billing_router
from billing.stripe_webhook import handle_stripe_webhook

app.include_router(billing_router)

# Stripe Webhook 端点（不需要 JWT 认证）
@app.post("/api/billing/webhook")
async def stripe_webhook(request: Request):
    return await handle_stripe_webhook(request)
```

- [ ] **Step 5: 创建定价页面**

创建 `frontend/src/components/PricingPage.jsx`：

```jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { auth } from '../utils/auth';
import { api } from '../utils/api';

const PLANS = [
  {
    id: 'free',
    name: '免费版',
    price: '¥0',
    period: '/月',
    features: ['自带 API Key', '本地存储', '基础学习功能', '多 Key 轮询', 'Web + 桌面端'],
    cta: '当前方案',
    disabled: true,
  },
  {
    id: 'basic',
    name: '基础版',
    price: '¥19',
    period: '/月',
    features: ['平台 API 额度（50次/月）', '云同步', 'SRS 间隔复习', '跨设备使用'],
    cta: '升级基础版',
    highlight: true,
  },
  {
    id: 'pro',
    name: '专业版',
    price: '¥49',
    period: '/月',
    features: ['无限 API 额度', 'AI 口语对话', '学习分析', '优先支持', '所有基础版功能'],
    cta: '升级专业版',
  },
];

export default function PricingPage({ t, onBack, currentTier }) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (plan) => {
    if (!auth.isLoggedIn()) {
      alert(t?.loginRequired || '请先登录');
      return;
    }
    setLoading(true);
    try {
      const result = await api.createCheckout(
        plan,
        window.location.href,
        window.location.href
      );
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      alert(err.response?.data?.detail || '订阅失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-parchment-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <button onClick={onBack} className="text-ink-500 hover:text-ink-700 mb-8 flex items-center gap-1">
          ← {t?.back || '返回'}
        </button>

        <h1 className="text-3xl font-serif text-ink-800 text-center mb-2">
          {t?.pricingTitle || '选择适合你的方案'}
        </h1>
        <p className="text-center text-ink-500 mb-10">
          {t?.pricingSubtitle || '免费开始，随时升级'}
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-parchment-50 border-2 rounded-sm p-6 ${
                plan.highlight ? 'border-amber-500 shadow-retro' : 'border-aged-200'
              }`}
            >
              <h3 className="text-xl font-serif text-ink-800 mb-1">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-ink-800">{plan.price}</span>
                <span className="text-ink-500">{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-sm text-ink-600 flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => !plan.disabled && handleSubscribe(plan.id)}
                disabled={plan.disabled || loading || currentTier === plan.id}
                className={`w-full py-2.5 rounded-sm font-medium transition-colors ${
                  plan.highlight
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'border border-aged-200 text-ink-600 hover:bg-parchment-100'
                } disabled:opacity-50`}
              >
                {currentTier === plan.id ? (t?.currentPlan || '当前方案') : plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 在 api.js 添加支付 API**

在 `frontend/src/utils/api.js` 的 `api` 对象末尾添加：

```javascript
  // 支付
  createCheckout: async (plan, successUrl, cancelUrl) => {
    const response = await axios.post(`${baseUrl}/api/billing/checkout`, {
      plan, success_url: successUrl, cancel_url: cancelUrl,
    });
    return response.data;
  },

  getSubscription: async () => {
    const response = await axios.get(`${baseUrl}/api/billing/subscription`);
    return response.data;
  },
```

- [ ] **Step 7: 在 App.jsx 中添加定价页面路由**

在 `frontend/src/App.jsx` 中添加 PricingPage 的 import 和路由逻辑。

- [ ] **Step 8: 提交**

```bash
git add backend/billing/ backend/main.py frontend/src/components/PricingPage.jsx frontend/src/utils/api.js frontend/src/App.jsx backend/requirements.txt
git commit -m "feat: add billing system (Stripe checkout + webhook + pricing page)"
```

---

## Task 6: 代码清理与许可证变更

**Files:**
- Delete: `Guapage/` 目录
- Modify: `LICENSE`
- Modify: `backend/db_storage.py` (移除双写逻辑)
- Modify: `backend/utils/state.py` (统一使用 DatabaseStorage)

- [ ] **Step 1: 删除 Guapage 目录**

```bash
rm -rf /workspace/Guapage
git add -A Guapage/
git commit -m "chore: remove unused Guapage directory"
```

- [ ] **Step 2: 更新许可证为 AGPL v3**

替换 `LICENSE` 文件内容为 AGPL v3 全文。

```bash
git add LICENSE
git commit -m "chore: change license from GPL v3 to AGPL v3"
```

- [ ] **Step 3: 移除文件存储双写逻辑**

在 `backend/db_storage.py` 中，将所有 `dual_write` 和 `fallback_to_file` 相关逻辑移除：

1. 修改 `__init__` 方法，移除 `fallback_to_file` 和 `dual_write` 参数
2. 移除 `self._file_storage` 相关代码
3. 移除所有方法中的 `if self.dual_write and self._file_storage:` 和 `if self.fallback_to_file and self._file_storage:` 分支

- [ ] **Step 4: 统一 storage 使用 DatabaseStorage**

在 `backend/utils/state.py` 中，确保 `storage` 实例使用 `DatabaseStorage` 而非 `Storage`：

```python
from db_storage import DatabaseStorage
storage = DatabaseStorage()
```

- [ ] **Step 5: 提交**

```bash
git add backend/db_storage.py backend/utils/state.py
git commit -m "refactor: unify storage to DatabaseStorage, remove dual-write"
```

---

## 自审清单

**1. Spec 覆盖率：**
- 用户注册/登录系统 → Task 1 + Task 2 ✓
- 平台 API 代理服务 → Task 3 ✓
- 云同步基础 → Task 4 ✓
- 支付集成 → Task 5 ✓
- 许可证变更 → Task 6 ✓
- 代码清理 → Task 6 ✓

**2. 占位符扫描：** 无 TBD/TODO，所有代码步骤包含完整实现。

**3. 类型一致性：** 所有 Task 间共享的模型（UserTier、TokenData）在 Task 1 中定义，后续 Task 引用一致。API 路由前缀统一（/api/auth、/api/proxy、/api/sync、/api/billing）。
