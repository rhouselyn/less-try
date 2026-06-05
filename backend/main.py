"""少邻国 - Lesslingo 后端入口。

职责：创建 FastAPI 应用、挂载 CORS 中间件、注册路由、启动事件、前端静态文件服务。
"""

import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from nvidia_api import get_settings
from config import UI_TRANSLATIONS_DIR, FRONTEND_DIST_DIR, HOST, PORT
from utils.state import _ui_translation_cache, word_gen_rate_limiter
from utils.helpers import RateLimiter

# ── 创建应用 ──────────────────────────────────────────────
app = FastAPI(title="少邻国 - Lesslingo", version="1.0.0")

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
    global word_gen_rate_limiter
    from utils.state import word_gen_rate_limiter as _wgrl
    import utils.state as _state

    app_settings = get_settings()
    rpm = app_settings.get("rpm", 20)
    _state.word_gen_rate_limiter = RateLimiter(rpm)

    # Load existing translation files into cache
    if UI_TRANSLATIONS_DIR.exists():
        for cache_file in UI_TRANSLATIONS_DIR.glob("*.json"):
            lang_code = cache_file.stem
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    _ui_translation_cache[lang_code] = json.load(f)
            except (json.JSONDecodeError, IOError):
                pass

# ── 生产部署：挂载前端静态文件（必须放在所有 API 路由之后） ──
if FRONTEND_DIST_DIR.exists() and (FRONTEND_DIST_DIR / "index.html").exists():
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    # 挂载 assets 静态资源
    assets_dir = FRONTEND_DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="static-assets")

    # SPA fallback：所有非 /api 路由返回 index.html
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        return FileResponse(str(FRONTEND_DIST_DIR / "index.html"))

# ── 直接运行 ──────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT, timeout_keep_alive=600)
