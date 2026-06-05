"""文本处理相关路由：process-text, status, detect-language, translate-text, generate-text"""

import re
import time
import asyncio
import datetime

from fastapi import APIRouter, HTTPException, BackgroundTasks

from nvidia_api import detect_language, get_lang_name
from utils.state import nvidia_api, storage, processing_status
from utils.exercise_generators import process_text_background, generate_title

router = APIRouter(prefix="/api", tags=["text-processing"])


@router.post("/process-text")
async def process_text(request: dict, background_tasks: BackgroundTasks):
    try:
        t_api_start = time.time()
        text = request.get("text", "")
        source_lang = request.get("source_language", "en")
        target_lang = request.get("target_language", "en")

        if not text:
            raise HTTPException(status_code=400, detail="Text is required")

        if source_lang == "auto":
            source_lang = await detect_language(text)

        now = datetime.datetime.now()
        file_id = f"text_{now.strftime('%Y%m%d_%H%M%S_%f')[:-3]}"

        app_settings = storage.load_user_preferences()

        recent_langs = app_settings.get("recent_languages", [])
        if source_lang in recent_langs:
            recent_langs.remove(source_lang)
        recent_langs.insert(0, source_lang)
        recent_langs = recent_langs[:10]
        app_settings["recent_languages"] = recent_langs
        storage.save_user_preferences(app_settings)

        t_title_start = time.time()
        title = await generate_title(text, source_lang)
        t_title_end = time.time()
        print(f"[TIMING] 标题生成: {t_title_end - t_title_start:.3f}s")

        text_preview = text.strip()[:100]
        storage.add_history_record(file_id, title, source_lang, target_lang, text_preview)

        background_tasks.add_task(process_text_background, file_id, text, source_lang, target_lang)

        t_api_end = time.time()
        print(f"[TIMING] /api/process-text API响应耗时: {t_api_end - t_api_start:.3f}s")

        return {
            "file_id": file_id,
            "status": "processing",
            "title": title
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{file_id}")
async def get_status(file_id: str):
    if file_id not in processing_status:
        raise HTTPException(status_code=404, detail="File not found")
    return processing_status[file_id]


@router.post("/detect-language")
async def detect_language_endpoint(request: dict):
    try:
        text = request.get("text", "")
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        lang = await detect_language(text)
        return {"detected_language": lang}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/translate-text")
async def translate_text(request: dict):
    try:
        text = request.get("text", "")
        source_lang = request.get("source_language", "zh")
        target_lang = request.get("target_language", "en")

        if not text:
            raise HTTPException(status_code=400, detail="Text is required")

        source_lang_name = get_lang_name(source_lang)
        target_lang_name = get_lang_name(target_lang)

        nvidia_api.reload()
        messages = [
            {
                "role": "system",
                "content": f"You are a professional translator. Translate the following text from {source_lang_name} to {target_lang_name}. Output ONLY the translated text, nothing else. Do not add any explanations, notes, or commentary. The translation should be natural and fluent. CRITICAL: Output must be plain text only. Do NOT use any markdown formatting (no bold, italic, headers, lists, code blocks, etc.), no emojis, no special symbols. Output pure plain text only."
            },
            {
                "role": "user",
                "content": text
            }
        ]
        response = await nvidia_api.call_minimax(messages, temperature=0.3, max_tokens=4096)

        translated_text = ""
        if "choices" in response and len(response["choices"]) > 0:
            translated_text = response["choices"][0].get("message", {}).get("content", "").strip()

        if not translated_text:
            raise HTTPException(status_code=500, detail="Translation failed")

        return {"translated_text": translated_text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-text")
async def generate_text(request: dict):
    try:
        prompt = request.get("prompt", "")
        source_lang = request.get("source_language", "en")
        target_lang = request.get("target_language", "zh")

        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")

        source_lang_name = get_lang_name(source_lang)

        nvidia_api.reload()
        messages = [
            {
                "role": "system",
                "content": f"You are a text generator. Generate a text in {source_lang_name} based on the user's description. CRITICAL RULES: 1. Generate text content that can include articles, stories, essays, descriptions, dialogues, conversations, or any other natural text form. 2. If the user requests dialogue or conversation content, generate natural exchanges between speakers with clear speaker labels (e.g. A:, B:, or names). 3. Do NOT include any meta-commentary, explanations, or notes about the text itself. 4. The text should be natural, coherent, and suitable for language learning. 5. The text should be at least 3-5 sentences long (or 3-5 exchanges for dialogue). 6. Output ONLY the generated text, nothing else. 7. CRITICAL: Output must be plain text only. Do NOT use any markdown formatting (no bold, italic, headers, lists, code blocks, etc.), no emojis, no special symbols. Output pure plain text only."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
        response = await nvidia_api.call_minimax(messages, temperature=0.7, max_tokens=4096)

        generated_text = ""
        if "choices" in response and len(response["choices"]) > 0:
            generated_text = response["choices"][0].get("message", {}).get("content", "").strip()

        if not generated_text:
            raise HTTPException(status_code=500, detail="Text generation failed")

        return {"generated_text": generated_text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
