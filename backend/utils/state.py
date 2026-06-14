"""共享状态：全局单例和可变状态，供各 router 和工具模块引用。"""

from api_client import LLMClient
from text_processor import TextProcessor
from db_storage import DatabaseStorage

# ---- 核心单例 ----
llm = LLMClient()
text_processor = TextProcessor()
storage = DatabaseStorage()

# ---- 处理状态 ----
processing_status = {}
word_gen_state = {}

# ---- UI 翻译缓存 ----
_ui_translation_cache = {}
_ui_translation_tasks = {}

# ---- 预生成单词信息 ----
pre_generated_words = {}
