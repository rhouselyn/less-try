from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import os
import json
import random
import asyncio
from dotenv import load_dotenv
from pathlib import Path

from nvidia_api import NvidiaAPI
from text_processor import TextProcessor
from storage import Storage

load_dotenv()

app = FastAPI(title="少邻国 - Lesslingo", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

nvidia_api = NvidiaAPI()
text_processor = TextProcessor()
storage = Storage()

# 存储处理状态
processing_status = {}


@app.get("/")
async def root():
    return {"message": "少邻国 - Lesslingo API"}


async def process_text_background(file_id: str, text: str, source_lang: str, target_lang: str):
    try:
        processing_status[file_id] = {"status": "processing"}
        
        # 翻译句子并获取分词结果
        translation_result = await text_processor.split_and_translate(
            text,
            source_lang,
            target_lang,
            nvidia_api
        )
        
        # 直接使用 split_and_translate 的结果作为词汇表
        vocab = []
        if isinstance(translation_result, dict) and "translation" in translation_result:
            seen_words = set()
            for token in translation_result["translation"]:
                if isinstance(token, dict) and "text" in token:
                    word = token["text"].lower()
                    if word not in seen_words:
                        seen_words.add(word)
                        # 直接使用API返回的形态学缩写
                        morphology = token.get("morphology", "")
                        
                        vocab_entry = {
                            "word": token["text"],
                            "ipa": token.get("phonetic", ""),
                            "context_meaning": token.get("translation", ""),
                            "morphology": morphology,
                            "translation": token.get("translation", "")
                        }
                        vocab.append(vocab_entry)
        
        # 随机排序词汇表
        random.shuffle(vocab)
        
        storage.save_pipeline_data(file_id, translation_result)
        storage.save_vocab(file_id, vocab)
        
        processing_status[file_id] = {
            "status": "completed",
            "translation_result": translation_result,
            "vocab": vocab
        }
    except Exception as e:
        processing_status[file_id] = {
            "status": "error",
            "error": str(e)
        }


@app.post("/api/process-text")
async def process_text(request: dict, background_tasks: BackgroundTasks):
    try:
        text = request.get("text", "")
        source_lang = request.get("source_language", "en")
        target_lang = request.get("target_language", "zh")
        
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        file_id = f"text_{int(os.urandom(4).hex(), 16)}"
        
        # 立即返回文件ID，后台处理
        background_tasks.add_task(process_text_background, file_id, text, source_lang, target_lang)
        
        return {
            "file_id": file_id,
            "status": "processing"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/status/{file_id}")
async def get_status(file_id: str):
    if file_id not in processing_status:
        raise HTTPException(status_code=404, detail="File not found")
    return processing_status[file_id]


@app.get("/api/vocab/{file_id}")
async def get_vocab(file_id: str):
    try:
        vocab = storage.load_vocab(file_id)
        return {"vocab": vocab}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Vocab not found: {str(e)}")


@app.get("/api/sentences/{file_id}")
async def get_sentences(file_id: str):
    try:
        sentences = storage.load_pipeline_data(file_id)
        return {"sentences": sentences}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Sentences not found: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, timeout_keep_alive=600)
