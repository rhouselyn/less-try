from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import os
import json
import random
import asyncio
import datetime
from dotenv import load_dotenv
from pathlib import Path

from nvidia_api import NvidiaAPI
from text_processor import TextProcessor
from storage import Storage
from learning_engine import LearningEngine

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
learning_engine = LearningEngine(storage)

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
        
        # 10-word grouping logic
        word_groups = text_processor.chunk_words(all_vocab, chunk_size=10)
        
        # 保存新的结构：每个句子单独一条数据
        storage.save_pipeline_data(file_id, sentence_translations)
        storage.save_vocab(file_id, all_vocab)
        
        processing_status[file_id] = {
            "status": "completed",
            "progress": 100,
            "vocab": all_vocab,
            "word_groups": word_groups,
            "sentence_translations": sentence_translations
        }
        print(f"[DEBUG] 所有处理完成！生成了 {len(word_groups)} 组单词")
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
        # Generate word groups
        word_groups = text_processor.chunk_words(vocab, chunk_size=10)
        return {"vocab": vocab, "word_groups": word_groups}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Vocab not found: {str(e)}")


@app.get("/api/sentences/{file_id}")
async def get_sentences(file_id: str):
    try:
        sentences = storage.load_pipeline_data(file_id)
        return {"sentences": sentences}
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Sentences not found: {str(e)}")


@app.post("/api/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    source_language: str = Form(...),
    target_language: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    try:
        # Generate file ID
        import datetime
        now = datetime.datetime.now()
        file_id = f"text_{now.strftime('%Y%m%d_%H%M%S_%f')[:-3]}"
        
        # Save uploaded file
        uploads_dir = storage.get_uploads_dir()
        file_path = uploads_dir / f"{file_id}_{file.filename}"
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Read file content
        text = content.decode("utf-8")
        
        # Save file metadata
        metadata = {
            "file_id": file_id,
            "filename": file.filename,
            "source_language": source_language,
            "target_language": target_language,
            "upload_time": now.isoformat(),
            "file_size": len(content)
        }
        storage.save_file_metadata(file_id, metadata)
        
        # Process text in background
        background_tasks.add_task(process_text_background, file_id, text, source_language, target_language)
        
        return {
            "file_id": file_id,
            "status": "processing",
            "filename": file.filename
        }
    except Exception as e:
        print(f"[ERROR] File upload error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/files")
async def list_files():
    try:
        files = storage.list_files()
        file_list = []
        for file_id in files:
            metadata = storage.load_file_metadata(file_id)
            file_list.append({
                "file_id": file_id,
                "filename": metadata.get("filename", "Unknown"),
                "source_language": metadata.get("source_language", "Unknown"),
                "target_language": metadata.get("target_language", "Unknown"),
                "upload_time": metadata.get("upload_time", "Unknown")
            })
        return {"files": file_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/files/{file_id}")
async def delete_file(file_id: str):
    try:
        storage.delete_file(file_id)
        if file_id in processing_status:
            del processing_status[file_id]
        return {"status": "success", "file_id": file_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/enrich-vocab/{file_id}")
async def enrich_vocab(file_id: str, request: dict):
    try:
        # Load existing vocabulary
        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocabulary not found")
        
        # Get context from sentences
        sentences = storage.load_pipeline_data(file_id)
        context = " ".join([s["sentence"] for s in sentences if "sentence" in s])
        
        # Extract words from vocab
        words = [entry["word"] for entry in vocab]
        
        # Get language information
        metadata = storage.load_file_metadata(file_id)
        source_lang = metadata.get("source_language", "en")
        target_lang = metadata.get("target_language", "zh")
        
        # Enrich vocabulary using generate_dictionary tool
        enriched_words = await nvidia_api.generate_dictionary(words, context, source_lang, target_lang)
        
        # Update vocab with enriched data
        enriched_vocab = []
        word_map = {entry["word"].lower(): entry for entry in enriched_words}
        
        for entry in vocab:
            word_lower = entry["word"].lower()
            if word_lower in word_map:
                # Update with enriched data
                enriched_entry = word_map[word_lower]
                enriched_entry.update(entry)
                enriched_vocab.append(enriched_entry)
            else:
                enriched_vocab.append(entry)
        
        # Save enriched vocabulary
        storage.save_vocab(file_id, enriched_vocab)
        
        # Generate word groups
        word_groups = text_processor.chunk_words(enriched_vocab, chunk_size=10)
        
        return {
            "status": "success",
            "file_id": file_id,
            "vocab": enriched_vocab,
            "word_groups": word_groups
        }
    except Exception as e:
        print(f"[ERROR] Vocab enrichment error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-multiple-choice/{file_id}")
async def generate_multiple_choice(file_id: str, request: dict):
    try:
        # Load vocabulary
        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocabulary not found")
        
        # Get context from sentences
        sentences = storage.load_pipeline_data(file_id)
        context = " ".join([s["sentence"] for s in sentences if "sentence" in s])
        
        # Get language information
        metadata = storage.load_file_metadata(file_id)
        source_lang = metadata.get("source_language", "en")
        target_lang = metadata.get("target_language", "zh")
        
        # Generate multiple choice questions
        questions = await nvidia_api.generate_multiple_choice(vocab, context, source_lang, target_lang)
        
        return {
            "status": "success",
            "file_id": file_id,
            "questions": questions
        }
    except Exception as e:
        print(f"[ERROR] Multiple choice generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-matching/{file_id}")
async def generate_matching(file_id: str, request: dict):
    try:
        # Load vocabulary
        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocabulary not found")
        
        # Get context from sentences
        sentences = storage.load_pipeline_data(file_id)
        context = " ".join([s["sentence"] for s in sentences if "sentence" in s])
        
        # Get language information
        metadata = storage.load_file_metadata(file_id)
        source_lang = metadata.get("source_language", "en")
        target_lang = metadata.get("target_language", "zh")
        
        # Generate matching questions
        questions = await nvidia_api.generate_matching(vocab, context, source_lang, target_lang)
        
        return {
            "status": "success",
            "file_id": file_id,
            "questions": questions
        }
    except Exception as e:
        print(f"[ERROR] Matching generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/create-snapshot/{file_id}")
async def create_snapshot(file_id: str, request: dict):
    try:
        # Load vocabulary
        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocabulary not found")
        
        # Get context from sentences
        sentences = storage.load_pipeline_data(file_id)
        context = " ".join([s["sentence"] for s in sentences if "sentence" in s])
        
        # Get language information
        metadata = storage.load_file_metadata(file_id)
        source_lang = metadata.get("source_language", "en")
        target_lang = metadata.get("target_language", "zh")
        
        # Generate both types of questions
        multiple_choice = await nvidia_api.generate_multiple_choice(vocab, context, source_lang, target_lang)
        matching = await nvidia_api.generate_matching(vocab, context, source_lang, target_lang)
        
        # Create snapshot
        snapshot = {
            "vocab": vocab,
            "multiple_choice": multiple_choice,
            "matching": matching,
            "created_at": datetime.datetime.now().isoformat(),
            "source_language": source_lang,
            "target_language": target_lang
        }
        
        # Save snapshot
        storage.save_snapshot(file_id, snapshot)
        
        return {
            "status": "success",
            "file_id": file_id,
            "snapshot": snapshot
        }
    except Exception as e:
        print(f"[ERROR] Snapshot creation error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/snapshot/{file_id}")
async def get_snapshot(file_id: str):
    try:
        # Load snapshot
        snapshot = storage.load_snapshot(file_id)
        if not snapshot:
            raise HTTPException(status_code=404, detail="Snapshot not found")
        
        return {
            "status": "success",
            "file_id": file_id,
            "snapshot": snapshot
        }
    except Exception as e:
        print(f"[ERROR] Snapshot loading error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# Learning Engine Endpoints
@app.get("/api/learning/coverage/{file_id}")
async def get_coverage(file_id: str):
    try:
        # Get user progress
        progress = learning_engine.get_user_progress(file_id)
        
        # Check coverage
        coverage = learning_engine.check_coverage(file_id, progress)
        
        return {
            "status": "success",
            "file_id": file_id,
            "coverage": coverage
        }
    except Exception as e:
        print(f"[ERROR] Coverage check error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/learning/next-module/{file_id}")
async def get_next_module(file_id: str):
    try:
        # Get user progress
        progress = learning_engine.get_user_progress(file_id)
        
        # Get next module
        module = learning_engine.get_next_module(file_id, progress)
        
        # Generate dynamic sentences for the module
        sentences = learning_engine.generate_dynamic_sentences(file_id, module["module"])
        
        return {
            "status": "success",
            "file_id": file_id,
            "module": module,
            "sentences": sentences
        }
    except Exception as e:
        print(f"[ERROR] Next module error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/learning/generate-quiz/{file_id}")
async def generate_quiz(file_id: str, request: dict):
    try:
        # Get parameters
        quiz_type = request.get("quiz_type", "multiple_choice")
        module_number = request.get("module_number")
        
        # Get user progress
        progress = learning_engine.get_user_progress(file_id)
        
        # Get module words
        module = learning_engine.get_next_module(file_id, progress)
        
        # Generate quiz
        questions = learning_engine.generate_quiz(file_id, module["module"], quiz_type)
        
        return {
            "status": "success",
            "file_id": file_id,
            "quiz_type": quiz_type,
            "questions": questions
        }
    except Exception as e:
        print(f"[ERROR] Quiz generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/learning/update-progress/{file_id}")
async def update_progress(file_id: str, request: dict):
    try:
        # Get parameters
        word = request.get("word")
        is_correct = request.get("is_correct", False)
        
        if not word:
            raise HTTPException(status_code=400, detail="Word is required")
        
        # Update progress
        updated_progress = learning_engine.update_progress(file_id, word, is_correct)
        
        # Get coverage after update
        coverage = learning_engine.check_coverage(file_id, updated_progress)
        
        return {
            "status": "success",
            "file_id": file_id,
            "word": word,
            "is_correct": is_correct,
            "progress": updated_progress,
            "coverage": coverage
        }
    except Exception as e:
        print(f"[ERROR] Progress update error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/learning/get-progress/{file_id}")
async def get_progress(file_id: str):
    try:
        # Get user progress
        progress = learning_engine.get_user_progress(file_id)
        
        # Get coverage
        coverage = learning_engine.check_coverage(file_id, progress)
        
        return {
            "status": "success",
            "file_id": file_id,
            "progress": progress,
            "coverage": coverage
        }
    except Exception as e:
        print(f"[ERROR] Get progress error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/learning/reset-progress/{file_id}")
async def reset_progress(file_id: str):
    try:
        # Reset progress
        reset_progress = learning_engine.reset_progress(file_id)
        
        return {
            "status": "success",
            "file_id": file_id,
            "progress": reset_progress
        }
    except Exception as e:
        print(f"[ERROR] Reset progress error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, timeout_keep_alive=600)
