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
        
        # 翻译句子并获取分词结果
        translation_results = await text_processor.split_and_translate(
            text,
            source_lang,
            target_lang,
            nvidia_api
        )
        
        # 从翻译结果中提取词汇并去重
        word_map = {}
        if isinstance(translation_results, dict) and "translation" in translation_results:
            for token in translation_results["translation"]:
                if isinstance(token, dict) and "text" in token:
                    word = token["text"].lower()
                    if word not in word_map:
                        word_map[word] = {
                            "word": word,
                            "translations": set(),
                            "phonetics": [],
                            "morphology": token.get("morphology", ""),
                            "grammar_explanation": translation_results.get("grammar_explanation", "")
                        }
                    # 添加翻译到集合（自动去重）
                    if "translation" in token:
                        word_map[word]["translations"].add(token["translation"])
                    # 收集音标
                    if "phonetic" in token and token["phonetic"]:
                        word_map[word]["phonetics"].append(token["phonetic"])
        
        # 处理词汇数据，解决音标冲突，构建最终词汇表
        vocab = []
        for word_data in word_map.values():
            # 解决音标冲突
            phonetic = text_processor.resolve_phonetic_conflicts(word_data["phonetics"])
            
            # 构建词汇条目
            vocab_entry = {
                "word": word_data["word"],
                "ipa": phonetic,
                "context_meaning": "; ".join(word_data["translations"]),
                "morphology": word_data["morphology"],
                "variants": [],  # 暂时为空，后续可以通过generate_dictionary生成
                "examples": [],  # 暂时为空，后续可以通过generate_dictionary生成
                "options": [],  # 暂时为空，后续可以通过generate_dictionary生成
                "grammar": word_data["grammar_explanation"],
                "translation": "; ".join(word_data["translations"]),
                "tokens": [word_data["word"]]
            }
            vocab.append(vocab_entry)
        
        # 随机排序词汇表
        random.shuffle(vocab)
        
        storage.save_pipeline_data(file_id, translation_results)
        storage.save_vocab(file_id, vocab)
        
        return {
            "file_id": file_id,
            "translation_result": translation_results,
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
