# 呱邻国开源自用版精简计划

> Ponytail 模式：最懒的可行方案。删比加好，一行胜五十行。

## 目标

完善和精简开源自用版。删掉死的，清理冗余，重命名过时名称，整理结构。保持功能和逻辑不变。

---

## 一、删除死代码

| 项目 | 原因 |
|------|------|
| `Guapage/` | 整个目录无引用，旧版前端 |
| `backend/storage.py` | 已被 `db_storage.py` 完全替代 |
| `backend/routers/static.py` | 返回 410 的废弃 TTS 端点 |
| `frontend/src/hooks/useDragSwap.js` | 无组件引用 |
| `frontend/src/hooks/useTouchDragSwap.js` | 无组件引用 |
| `frontend/src/hooks/` 目录 | 删完上面两个后目录为空，也删 |

---

## 二、重命名 nvidia_api → llm_api

`nvidia_api.py` 名字过时，实际已支持任意 OpenAI 兼容 API（SiliconFlow、DeepSeek 等）。涉及 8 个文件的引用更新。

**文件重命名：** `backend/nvidia_api.py` → `backend/llm_api.py`

**内部重命名：**
- `class NvidiaAPI` → `class LLMAPI`
- `call_minimax_with_rotation` → `call_with_rotation`
- `call_minimax` → `call_llm`
- `[TIMING] call_minimax` → `[TIMING] call_llm`

**引用更新（8 个文件）：**
- `backend/utils/state.py` — import + 变量名 `nvidia_api` → `llm_api`
- `backend/main.py` — import
- `backend/utils/exercise_generators.py` — import + 使用
- `backend/routers/text_processing.py` — import + 使用
- `backend/routers/vocabulary.py` — 使用
- `backend/routers/settings.py` — import + 使用
- `backend/routers/learning.py` — 使用
- `backend/text_processor.py` — 参数名 + 使用

---

## 三、简化 db_storage.py

删除已废弃的双写逻辑：
- `__init__`：删 `fallback_to_file`、`dual_write` 参数，删 `self._file_storage`
- 删所有 `if self.dual_write and self._file_storage:` 分支
- 删所有 `if self.fallback_to_file and self._file_storage:` 分支
- 删 `from storage import Storage`
- 删 `migrate_from_files()` 和 `_migrate_file_dir()` 方法

---

## 四、清理引用

| 文件 | 改动 |
|------|------|
| `llm_api.py` L253 | `from storage import Storage; storage = Storage()` → `from utils.state import storage` |
| `main.py` | 删 `from routers import static` 和 `app.include_router(static.router)` |
| `state.py` | 删 `tts_cache`、`tts_cache_lock`、`MAX_TTS_CACHE`（注释已写"已弃用"） |

---

## 五、删除 PyInstaller 相关

用户确认不再需要 PyInstaller 打包。桌面版改为直接 `python app.py` 启动。

| 项目 | 原因 |
|------|------|
| `Gualingo.spec` | PyInstaller 打包配置，不再需要 |
| `backend/requirements.txt` 中 `pyinstaller==6.10.0` | 删除该行 |
| `.github/workflows/build-desktop.yml` | 依赖 PyInstaller 的桌面构建流程，不再需要 |
| `app.py` | **保留** — 桌面版仍用它启动后端（`python app.py`），只是不再打包成 exe |

---

## 六、Edge TTS 评估

**结论：保持后端 TTS，不迁移到前端。**

原因：
1. `edge-tts` Python 库连接 Microsoft 的 WebSocket 端点，需要特定 headers/tokens，浏览器 CORS 会阻止
2. 浏览器原生 `SpeechSynthesis` API 语音质量远不如 Edge Neural 语音，且各浏览器/OS 语音不一致
3. 当前方案简单可靠：前端 `new Audio('/api/tts/speak?...')` → 后端生成 → 流式返回 MP3
4. TTS 请求很轻量（只是转发到 Microsoft），对后端负担极小

---

## 七、更新文档和许可证

| 文件 | 改动 |
|------|------|
| `LICENSE` | GPL v3 → AGPL v3 |
| `README.md` | 更新为同时支持 Web 和桌面版，删除 PyInstaller 相关说明 |
| `backend/.env.example` | 对齐 config.py 实际配置项 |

---

## 八、项目结构整理

### 不做的重构（YAGNI）

- **不移动 `text_processor.py` 到 `utils/`** — 974 行但被 5 个模块引用，移动需改所有 import
- **不移动 `ui_translations.py` 到 `utils/`** — 同上
- **不移动 `db_storage.py` 到 `utils/`** — 同上
- **不拆分 `exercise_generators.py`** — 895 行但逻辑内聚
- **不合并前后端 TTS 语言映射** — 前端映射 BCP-47 区域代码，后端映射具体 voice 名，职责不同

---

## 验证

1. `pip install -r backend/requirements.txt` — 依赖正常
2. `cd frontend && npm install && npm run build` — 前端构建正常
3. `uvicorn backend.main:app --reload` — 后端启动正常，无 import 错误
4. 浏览器测试全流程：输入文本 → 处理 → 学习
5. `grep -r "nvidia_api\|NvidiaAPI\|call_minimax" backend/` — 应无结果
6. `grep -r "from storage import" backend/` — 应无结果
7. `grep -r "useDragSwap\|useTouchDragSwap" frontend/src/` — 应无结果
8. `grep -r "pyinstaller\|PyInstaller" backend/` — 应无结果

---

## 总结

7 类改动：删除死代码（6 个文件/目录 + hooks 目录）、重命名 nvidia_api→llm_api（8 个文件）、简化 db_storage.py、清理 3 处废弃引用、删除 PyInstaller 相关（3 项）、更新 3 个文档文件。零新增功能代码。
