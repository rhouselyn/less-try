"""共享状态：全局单例和可变状态，供各 router 和工具模块引用。"""

import asyncio

from nvidia_api import NvidiaAPI
from text_processor import TextProcessor
from storage import Storage

# ---- 核心单例 ----
nvidia_api = NvidiaAPI()
text_processor = TextProcessor()
storage = Storage()

# ---- 处理状态 ----
processing_status = {}
word_gen_state = {}

# ---- TTS 缓存（已弃用但保留结构） ----
tts_cache = {}
tts_cache_lock = asyncio.Lock()
MAX_TTS_CACHE = 200

# ---- UI 翻译缓存 ----
_ui_translation_cache = {}
_ui_translation_tasks = {}

# ---- 预生成单词信息 ----
pre_generated_words = {}
