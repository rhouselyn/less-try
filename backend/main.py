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
        print(f"[DEBUG] 开始处理文件 {file_id}")
        processing_status[file_id] = {"status": "processing", "progress": 0}
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 用于全局查重的集合
        global_seen_words = set()
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 翻译句子并获取分词结果
                translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子 {i+1} 处理完成")
                
                # 确保翻译结果的结构
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": translation_result
                }
                sentence_translations.append(sentence_data)
                
                # 提取词汇
                if isinstance(translation_result, dict) and "translation" in translation_result:
                    for token in translation_result["translation"]:
                        if isinstance(token, dict) and "text" in token:
                            word = token["text"].lower()
                            if word not in global_seen_words:
                                global_seen_words.add(word)
                                # 直接使用API返回的形态学缩写
                                morphology = token.get("morphology", "")
                                
                                vocab_entry = {
                                    "word": token["text"],
                                    "ipa": token.get("phonetic", ""),
                                    "context_meaning": token.get("translation", ""),
                                    "morphology": morphology,
                                    "sentence_index": i
                                }
                                all_vocab.append(vocab_entry)
                
                # 立即按字母表排序词汇表（确保每次都正确排序）
                all_vocab.sort(key=lambda x: x["word"].lower())
                print(f"[DEBUG] 排序后词表: {[word['word'] for word in all_vocab]}")
                
                # 更新进度
                progress = int((i + 1) / total_sentences * 100)
                processing_status[file_id] = {
                    "status": "processing",
                    "progress": progress,
                    "current_sentence": i + 1,
                    "total_sentences": total_sentences,
                    "vocab": all_vocab.copy(),  # 使用 copy 避免引用问题
                    "sentence_translations": sentence_translations.copy()
                }
                print(f"[DEBUG] 更新状态: 进度 {progress}%, 词表 {len(all_vocab)} 个单词, 已处理 {len(sentence_translations)} 个句子")
        
        # 保存新的结构：每个句子单独一条数据
        storage.save_pipeline_data(file_id, sentence_translations)
        storage.save_vocab(file_id, all_vocab)
        
        processing_status[file_id] = {
            "status": "completed",
            "progress": 100,
            "vocab": all_vocab,
            "sentence_translations": sentence_translations
        }
        print(f"[DEBUG] 所有处理完成！")
    except Exception as e:
        print(f"[ERROR] 处理出错: {str(e)}")
        import traceback
        traceback.print_exc()
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


@app.get("/api/learn/{file_id}/random-word")
async def get_random_word(file_id: str):
    try:
        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocab not found")
        
        # 随机选择一个单词
        random_word = random.choice(vocab)
        
        # 构建上下文
        sentences = storage.load_pipeline_data(file_id)
        context = ""
        if sentences:
            # 找到包含该单词的句子
            for sentence_data in sentences:
                if "sentence" in sentence_data:
                    if random_word["word"] in sentence_data["sentence"]:
                        context = sentence_data["sentence"]
                        break
            if not context and sentences:
                # 如果没找到，使用第一个句子作为上下文
                context = sentences[0].get("sentence", "")
        
        # 生成选项
        target_lang = "zh"  # 默认目标语言为中文
        correct_meaning = random_word.get("context_meaning", "")
        
        if not correct_meaning:
            # 尝试从其他字段获取释义
            if "translation" in random_word:
                correct_meaning = random_word["translation"]
            elif "meaning" in random_word:
                correct_meaning = random_word["meaning"]
        
        options_result = await nvidia_api.generate_multiple_choice(
            random_word["word"],
            correct_meaning,
            context,
            target_lang
        )
        
        # 提取选项和正确索引
        options = []
        correct_index = 0
        if "multiple_choice" in options_result and "options" in options_result["multiple_choice"]:
            for i, opt in enumerate(options_result["multiple_choice"]["options"]):
                options.append(opt["text"])
                if opt["is_correct"]:
                    correct_index = i
        else:
            # 回退到旧格式
            options = options_result.get("options", [correct_meaning, "选项1", "选项2", "选项3"])
            correct_index = options_result.get("correct_index", 0)
        
        return {
            "word": options_result.get("word", random_word["word"]),
            "ipa": options_result.get("ipa", random_word.get("ipa", "")),
            "correct_meaning": options_result.get("enriched_meaning", correct_meaning),
            "options": options,
            "correct_index": correct_index,
            "context": context,
            "variants_detail": options_result.get("variants_detail", []),
            "examples": options_result.get("examples", []),
            "memory_hint": options_result.get("memory_hint", "")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting random word: {str(e)}")


@app.get("/api/word/{file_id}/{word}")
async def get_word_details(file_id: str, word: str):
    try:
        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocab not found")
        
        # 查找单词
        word_data = None
        for entry in vocab:
            if entry["word"].lower() == word.lower():
                word_data = entry
                break
        
        if not word_data:
            raise HTTPException(status_code=404, detail="Word not found")
        
        # 构建上下文
        sentences = storage.load_pipeline_data(file_id)
        context_sentences = []
        if sentences:
            for sentence_data in sentences:
                if "sentence" in sentence_data:
                    if word_data["word"] in sentence_data["sentence"]:
                        context_sentences.append(sentence_data["sentence"])
        
        return {
            "word": word_data["word"],
            "ipa": word_data.get("ipa", ""),
            "meaning": word_data.get("context_meaning", word_data.get("translation", "")),
            "examples": word_data.get("examples", []),
            "context_sentences": context_sentences,
            "morphology": word_data.get("morphology", "")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting word details: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, timeout_keep_alive=600)
