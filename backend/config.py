import os
from pathlib import Path

# 自动加载 .env 文件（如果存在）
_env_file = Path(__file__).resolve().parent / ".env"
if _env_file.exists():
    with open(_env_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, _, value = line.partition('=')
            key = key.strip()
            value = value.strip()
            if key and key not in os.environ:
                os.environ[key] = value

# 项目根目录，默认为后端目录的上级，可通过 BASE_DIR 环境变量覆盖
BASE_DIR = Path(os.environ.get("BASE_DIR", str(Path(__file__).resolve().parent.parent)))

# 数据目录
DATA_DIR = Path(os.environ.get("DATA_DIR", str(BASE_DIR / "data")))

# 配置目录
CONFIG_DIR = Path(os.environ.get("CONFIG_DIR", str(BASE_DIR / "config")))

# UI 翻译缓存目录
UI_TRANSLATIONS_DIR = CONFIG_DIR / "ui_translations"

# LLM 设置文件
LLM_SETTINGS_FILE = CONFIG_DIR / "llm_settings.json"

# 用户偏好文件
USER_PREFS_FILE = CONFIG_DIR / "user_preferences.json"

# 前端静态文件目录（生产部署用）
FRONTEND_DIST_DIR = Path(os.environ.get("FRONTEND_DIST_DIR", str(BASE_DIR / "frontend" / "dist")))

# 服务器配置
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", 8000))
