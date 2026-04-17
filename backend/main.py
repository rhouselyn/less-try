from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import os
import json
import random
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


@app.get("/")
async def root():
    return {"message": "少邻国 - Lesslingo API"}


@app.post("/api/process-text")
async def process_text(request: dict):
    try:
        text = request.get("text", "")
        source_lang = request.get("source_language", "en")
        target_lang = request.get("target_language", "zh")
        
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
        
        file_id = f"text_{int(os.urandom(4).hex(), 16)}"
        
        # 先使用新的分句功能切分文本
        original_sentences = text_processor.split_sentences(text)
        
        # 翻译句子
        sentences = await text_processor.split_and_translate(
            text,
            source_lang,
            target_lang,
            nvidia_api
        )
        
        # 使用新的从句子提取词汇的功能
        words = text_processor.extract_words_from_sentences(original_sentences, source_lang)
        word_chunks = text_processor.chunk_words(words, chunk_size=10)
        
        vocab = []
        for chunk in word_chunks:
            chunk_vocab = await nvidia_api.generate_dictionary(
                chunk,
                text,
                source_lang,
                target_lang
            )
            vocab.extend(chunk_vocab)
        
        random.shuffle(vocab)
        
        storage.save_pipeline_data(file_id, sentences)
        storage.save_vocab(file_id, vocab)
        
        return {
            "file_id": file_id,
            "sentences": sentences,
            "vocab": vocab
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
    uvicorn.run(app, host="0.0.0.0", port=8000)
