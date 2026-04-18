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
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        
        all_vocab = []
        all_translation_results = []
        
        for i, sentence in enumerate(sentences):
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                
                # 提取词汇
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
                                    "translation": token.get("translation", ""),
                                    "sentence_index": i
                                }
                                all_vocab.append(vocab_entry)
                
                all_translation_results.append(translation_result)
                
                # 更新进度
                progress = int((i + 1) / total_sentences * 100)
                processing_status[file_id] = {
                    "status": "processing",
                    "progress": progress,
                    "current_sentence": i + 1,
                    "total_sentences": total_sentences,
                    "vocab": all_vocab,
                    "translation_results": all_translation_results
                }
        
        # 按字母表排序词汇表
        all_vocab.sort(key=lambda x: x["word"].lower())
        
        storage.save_pipeline_data(file_id, {
            "sentences": sentences,
            "translation_results": all_translation_results
        })
        storage.save_vocab(file_id, all_vocab)
        
        processing_status[file_id] = {
            "status": "completed",
            "progress": 100,
            "vocab": all_vocab,
            "translation_results": all_translation_results,
            "sentences": sentences
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
        
        import datetime
        now = datetime.datetime.now()
        file_id = f"text_{now.strftime('%Y%m%d_%H%M%S_%f')[:-3]}"
        
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
