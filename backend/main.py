"""少邻国 - Gualingo 后端入口。

职责：创建 FastAPI 应用、挂载 CORS 中间件、注册路由、启动事件、前端静态文件服务。
支持多前端主题切换：根据 cookie 中的 ui_theme 选择不同的前端 dist 目录。
"""

import json
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from nvidia_api import get_settings
from config import UI_TRANSLATIONS_DIR, FRONTEND_CEL_DIR, FRONTEND_VINTAGE_DIR, HOST, PORT
from utils.state import _ui_translation_cache, storage

# ── 创建应用 ──────────────────────────────────────────────
app = FastAPI(title="少邻国 - Gualingo", version="1.0.0")

# ── CORS 中间件 ───────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 注册路由 ──────────────────────────────────────────────
from routers import static, text_processing, learning, phases, vocabulary, history, settings

app.include_router(static.router)
app.include_router(text_processing.router)
app.include_router(learning.router)
app.include_router(phases.router)
app.include_router(vocabulary.router)
app.include_router(history.router)
app.include_router(settings.router)

# ── 启动事件 ──────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    # Load existing translation files into cache
    if UI_TRANSLATIONS_DIR.exists():
        for cache_file in UI_TRANSLATIONS_DIR.glob("*.json"):
            lang_code = cache_file.stem
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    _ui_translation_cache[lang_code] = json.load(f)
            except (json.JSONDecodeError, IOError):
                pass


# ── 多前端支持 ─────────────────────────────────────────────

# 前端目录映射
FRONTEND_DIRS = {
    "cel": FRONTEND_CEL_DIR,
    "vintage": FRONTEND_VINTAGE_DIR,
}

from pathlib import Path

def _get_frontend_dir(request: Request) -> Path:
    """根据 cookie 或用户偏好决定使用哪个前端目录"""
    # 1. 优先看 cookie
    theme = request.cookies.get("ui_theme")
    if theme and theme in FRONTEND_DIRS:
        d = FRONTEND_DIRS[theme]
        if d.exists() and (d / "index.html").exists():
            return d
    # 2. 看用户偏好
    try:
        prefs = storage.load_user_preferences()
        theme = prefs.get("ui_theme", "cel")
        if theme in FRONTEND_DIRS:
            d = FRONTEND_DIRS[theme]
            if d.exists() and (d / "index.html").exists():
                return d
    except Exception:
        pass
    # 3. 默认赛璐璐
    return FRONTEND_CEL_DIR


# 挂载前端的 assets 目录
# 两个前端的 assets 文件名有 content hash 不会冲突
# 使用合并目录来同时服务两个前端的静态资源
_MERGED_ASSETS_DIR = FRONTEND_CEL_DIR.parent.parent / "frontend-merged-assets"
if not _MERGED_ASSETS_DIR.exists():
    # 回退：只使用 cel 的 assets
    _MERGED_ASSETS_DIR = FRONTEND_CEL_DIR / "assets"

if _MERGED_ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(_MERGED_ASSETS_DIR)), name="assets")


# 主题切换 API
@app.post("/api/switch-theme")
async def switch_theme(request: Request):
    """切换前端主题，设置 cookie 并返回重定向信息"""
    body = await request.json()
    theme = body.get("theme", "cel")
    if theme not in FRONTEND_DIRS:
        theme = "cel"
    # 保存到用户偏好
    try:
        prefs = storage.load_user_preferences()
        prefs["ui_theme"] = theme
        storage.save_user_preferences(prefs)
    except Exception:
        pass
    return {"theme": theme, "redirect": f"/{theme}/"}


# 根路径：返回默认前端
@app.get("/")
async def serve_root(request: Request):
    frontend_dir = _get_frontend_dir(request)
    return FileResponse(str(frontend_dir / "index.html"))


# 各主题的专属路径
@app.get("/cel/{full_path:path}")
async def serve_cel(request: Request, full_path: str):
    return FileResponse(str(FRONTEND_CEL_DIR / "index.html"))


@app.get("/vintage/{full_path:path}")
async def serve_vintage(request: Request, full_path: str):
    return FileResponse(str(FRONTEND_VINTAGE_DIR / "index.html"))


# SPA fallback：所有非 /api、非主题路径的路由返回对应前端 index.html
@app.get("/{full_path:path}")
async def serve_frontend(request: Request, full_path: str):
    frontend_dir = _get_frontend_dir(request)
    return FileResponse(str(frontend_dir / "index.html"))


# ── 直接运行 ──────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT, timeout_keep_alive=600)
