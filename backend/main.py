from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import os
import json
import random
import asyncio
from dotenv import load_dotenv
from pathlib import Path
import re

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
        
        # 保存语言设置
        storage.save_language_settings(file_id, source_lang, target_lang)
        
        # 拆分为多个句子
        sentences = text_processor.split_sentences(text)
        total_sentences = len(sentences)
        print(f"[DEBUG] 分割为 {total_sentences} 个句子: {sentences}")
        
        all_vocab = []
        # 新的数据结构：每个句子单独一条数据
        sentence_translations = []
        
        # 处理句子级别的数据
        for i, sentence in enumerate(sentences):
            print(f"[DEBUG] 正在处理第 {i+1}/{total_sentences} 个句子: {repr(sentence)}")
            if sentence.strip():
                # 对每个句子单独进行翻译
                print(f"[DEBUG] 正在翻译句子: {repr(sentence)}")
                sentence_translation_result = await text_processor.process_translation(
                    sentence,
                    source_lang,
                    target_lang,
                    nvidia_api
                )
                print(f"[DEBUG] 句子翻译完成")
                
                # 构建句子数据
                sentence_data = {
                    "sentence": sentence,
                    "translation_result": sentence_translation_result
                }
                sentence_translations.append(sentence_data)
            
            # 更新进度
            progress = int((i + 1) / total_sentences * 100)
            processing_status[file_id] = {
                "status": "processing",
                "progress": progress,
                "current_sentence": i + 1,
                "total_sentences": total_sentences
            }
            print(f"[DEBUG] 更新状态: 进度 {progress}%, 已处理 {len(sentence_translations)} 个句子")
        
        # 从所有句子的翻译结果中提取词典条目
        all_vocab = []
        for i, sentence_data in enumerate(sentence_translations):
            translation_result = sentence_data.get("translation_result", {})
            if isinstance(translation_result, dict) and "dictionary_entries" in translation_result:
                for dict_entry in translation_result["dictionary_entries"]:
                    # 为每个词条添加句子索引
                    dict_entry["sentence_index"] = i
                    all_vocab.append(dict_entry)
        
        # 去重
        seen = set()
        unique_vocab = []
        for entry in all_vocab:
            word = entry.get("word", "").lower()
            if word not in seen and word:
                seen.add(word)
                unique_vocab.append(entry)
        all_vocab = unique_vocab
        
        # 按字母表排序词汇表
        all_vocab.sort(key=lambda x: x["word"].lower())
        print(f"[DEBUG] 从所有句子中提取词典条目，共 {len(all_vocab)} 个单词: {[word['word'] for word in all_vocab]}")
        
        # 保存新的结构：每个句子单独一条数据
        storage.save_pipeline_data(file_id, sentence_translations)
        storage.save_vocab(file_id, all_vocab)
        
        # 提前生成并保存固定的单词打乱顺序
        if all_vocab:
            random.seed(42)
            shuffled_indices = list(range(len(all_vocab)))
            random.shuffle(shuffled_indices)
            storage.save_shuffled_order(file_id, shuffled_indices)
            print(f"[DEBUG] 保存打乱顺序: {shuffled_indices}")
            
            # 预生成第一个单词的信息
            asyncio.create_task(pre_generate_next_word(file_id, all_vocab, 0))
            print(f"[DEBUG] 预生成第一个单词信息")
        
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


# 存储预生成的单词信息
pre_generated_words = {}

@app.get("/api/learn/{file_id}/random-word")
async def get_random_word(file_id: str):
    try:
        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocab not found")
        
        print(f"[DEBUG] 单词总数: {len(vocab)}, 单词列表: {[w['word'] for w in vocab]}")
        
        # 加载语言设置
        language_settings = storage.load_language_settings(file_id)
        target_lang = language_settings["target_lang"]
        
        # 加载学习进度
        current_index = storage.load_learning_progress(file_id)
        print(f"[DEBUG] 加载学习进度: current_index = {current_index}")
        
        # 使用保存的固定打乱顺序
        shuffled_indices = storage.load_shuffled_order(file_id)
        if not shuffled_indices:
            # 如果没有保存，生成并保存
            random.seed(42)
            shuffled_indices = list(range(len(vocab)))
            random.shuffle(shuffled_indices)
            storage.save_shuffled_order(file_id, shuffled_indices)
        print(f"[DEBUG] 打乱后的索引顺序: {shuffled_indices}")
        
        # 获取当前单词
        actual_index = shuffled_indices[current_index % len(vocab)]
        random_word = vocab[actual_index]
        word = random_word["word"]
        print(f"[DEBUG] 当前单词索引: {current_index}, 实际索引: {actual_index}, 单词: {word}")
        
        # 先检查缓存
        cached_word = storage.load_word_cache(file_id, word)
        if cached_word:
            print(f"[DEBUG] 从缓存中获取随机单词信息: {word}")
            # 构建学习模式响应
            options = []
            correct_index = 0
            if "multiple_choice" in cached_word and "options" in cached_word["multiple_choice"]:
                for i, opt in enumerate(cached_word["multiple_choice"]["options"]):
                    options.append(opt["text"])
                    if opt["is_correct"]:
                        correct_index = i
            else:
                # 回退到旧格式
                options = [cached_word.get("meaning", ""), "选项1", "选项2", "选项3"]
                correct_index = 0
            
            # 启动后台任务预生成下一个单词
            asyncio.create_task(pre_generate_next_word(file_id, vocab, current_index + 1))
            
            return {
                "word": cached_word.get("word", word),
                "ipa": cached_word.get("ipa", ""),
                "correct_meaning": cached_word.get("meaning", ""),
                "options": options,
                "correct_index": correct_index,
                "context": "",  # 上下文在单词详情中显示
                "variants_detail": cached_word.get("variants_detail", []),
                "examples": cached_word.get("examples", []),
                "memory_hint": cached_word.get("memory_hint", "")
            }
        
        # 构建上下文（包含翻译）
        sentences = storage.load_pipeline_data(file_id)
        context = ""
        context_sentences = []
        if sentences:
            # 找到包含该单词的句子
            for sentence_data in sentences:
                if "sentence" in sentence_data:
                    if word in sentence_data["sentence"]:
                        context = sentence_data["sentence"]
                        # 获取翻译
                        translation = ""
                        if "translation_result" in sentence_data:
                            translation = sentence_data["translation_result"].get("tokenized_translation", "")
                        context_sentences.append({
                            "sentence": sentence_data["sentence"],
                            "translation": translation
                        })
                        break
            if not context and sentences:
                # 如果没找到，使用第一个句子作为上下文
                context = sentences[0].get("sentence", "")
        
        # 生成选项
        correct_meaning = random_word.get("context_meaning", "")
        
        if not correct_meaning:
            # 尝试从其他字段获取释义
            if "translation" in random_word:
                correct_meaning = random_word["translation"]
            elif "meaning" in random_word:
                correct_meaning = random_word["meaning"]
        
        options_result = await nvidia_api.generate_multiple_choice(
            word,
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
        
        # 构建响应数据
        response_data = {
            "word": options_result.get("word", word),
            "ipa": options_result.get("ipa", random_word.get("ipa", "")),
            "correct_meaning": options_result.get("enriched_meaning", correct_meaning),
            "options": options,
            "correct_index": correct_index,
            "context": context,
            "variants_detail": options_result.get("variants_detail", []),
            "examples": options_result.get("examples", []),
            "memory_hint": options_result.get("memory_hint", "")
        }
        
        # 构建缓存数据
        cache_data = dict(options_result)
        cache_data["word"] = options_result.get("word", word)
        cache_data["ipa"] = options_result.get("ipa", random_word.get("ipa", ""))
        cache_data["meaning"] = options_result.get("enriched_meaning", correct_meaning)
        cache_data["examples"] = options_result.get("examples", [])
        cache_data["context_sentences"] = context_sentences
        cache_data["morphology"] = random_word.get("morphology", "")
        cache_data["variants_detail"] = options_result.get("variants_detail", [])
        cache_data["memory_hint"] = options_result.get("memory_hint", "")
        cache_data["multiple_choice"] = options_result.get("multiple_choice", {})
        if "context_translations" in cache_data:
            del cache_data["context_translations"]
        
        # 缓存结果
        storage.save_word_cache(file_id, word, cache_data)
        print(f"[DEBUG] 缓存随机单词信息: {word}")
        
        # 启动后台任务预生成下一个单词
        asyncio.create_task(pre_generate_next_word(file_id, vocab, current_index + 1))
        
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting random word: {str(e)}")


@app.post("/api/learn/{file_id}/next-word")
async def next_word(file_id: str):
    try:
        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocab not found")
        
        # 加载学习进度
        current_index = storage.load_learning_progress(file_id)
        print(f"[DEBUG] 加载学习进度: current_index = {current_index}")
        
        # 更新进度
        new_index = current_index + 1
        storage.save_learning_progress(file_id, new_index)
        print(f"[DEBUG] 保存学习进度: {new_index}")
        
        # 启动后台任务预生成下一个单词
        asyncio.create_task(pre_generate_next_word(file_id, vocab, new_index))
        
        return {"success": True, "new_index": new_index}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error moving to next word: {str(e)}")


@app.post("/api/learn/{file_id}/set-progress")
async def set_progress(file_id: str, request: dict):
    try:
        index = request.get("index", 0)
        storage.save_learning_progress(file_id, index)
        print(f"[DEBUG] 设置学习进度: {index}")
        
        # 预生成下一个单词
        vocab = storage.load_vocab(file_id)
        if vocab:
            asyncio.create_task(pre_generate_next_word(file_id, vocab, index))
        
        return {"success": True, "index": index}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error setting progress: {str(e)}")

async def pre_generate_next_word(file_id: str, vocab: List[Dict], next_index: int):
    """后台预生成下一个单词的信息"""
    try:
        # 加载语言设置
        language_settings = storage.load_language_settings(file_id)
        target_lang = language_settings["target_lang"]
        
        # 使用保存的固定打乱顺序
        shuffled_indices = storage.load_shuffled_order(file_id)
        if not shuffled_indices:
            # 如果没有保存，生成并保存
            random.seed(42)
            shuffled_indices = list(range(len(vocab)))
            random.shuffle(shuffled_indices)
            storage.save_shuffled_order(file_id, shuffled_indices)
        
        # 获取下一个单词
        actual_index = shuffled_indices[next_index % len(vocab)]
        random_word = vocab[actual_index]
        word = random_word["word"]
        
        # 检查是否已缓存
        if storage.load_word_cache(file_id, word):
            print(f"[DEBUG] 预生成单词已缓存: {word}")
            return
        
        # 构建上下文（包含翻译）
        sentences = storage.load_pipeline_data(file_id)
        context = ""
        context_sentences = []
        if sentences:
            # 找到包含该单词的句子
            for sentence_data in sentences:
                if "sentence" in sentence_data:
                    if word in sentence_data["sentence"]:
                        context = sentence_data["sentence"]
                        # 获取翻译
                        translation = ""
                        if "translation_result" in sentence_data:
                            translation = sentence_data["translation_result"].get("tokenized_translation", "")
                        context_sentences.append({
                            "sentence": sentence_data["sentence"],
                            "translation": translation
                        })
                        break
            if not context and sentences:
                # 如果没找到，使用第一个句子作为上下文
                context = sentences[0].get("sentence", "")
        
        # 生成选项
        correct_meaning = random_word.get("context_meaning", "")
        
        if not correct_meaning:
            # 尝试从其他字段获取释义
            if "translation" in random_word:
                correct_meaning = random_word["translation"]
            elif "meaning" in random_word:
                correct_meaning = random_word["meaning"]
        
        print(f"[DEBUG] 后台预生成单词信息: {word}")
        
        # 调用generate_multiple_choice获取丰富的单词信息
        options_result = await nvidia_api.generate_multiple_choice(
            word,
            correct_meaning,
            context,
            target_lang
        )
        
        # 构建缓存数据
        cache_data = dict(options_result)
        cache_data["word"] = options_result.get("word", word)
        cache_data["ipa"] = options_result.get("ipa", random_word.get("ipa", ""))
        cache_data["meaning"] = options_result.get("enriched_meaning", correct_meaning)
        cache_data["examples"] = options_result.get("examples", [])
        cache_data["context_sentences"] = context_sentences
        cache_data["morphology"] = random_word.get("morphology", "")
        cache_data["variants_detail"] = options_result.get("variants_detail", [])
        cache_data["memory_hint"] = options_result.get("memory_hint", "")
        cache_data["multiple_choice"] = options_result.get("multiple_choice", {})
        if "context_translations" in cache_data:
            del cache_data["context_translations"]
        
        # 缓存结果
        storage.save_word_cache(file_id, word, cache_data)
        print(f"[DEBUG] 缓存预生成单词信息: {word}")
        
    except Exception as e:
        print(f"[ERROR] 预生成单词信息失败: {str(e)}")


@app.get("/api/word/{file_id}/{word}")
async def get_word_details(file_id: str, word: str):
    try:
        # 先检查缓存
        cached_word = storage.load_word_cache(file_id, word)
        if cached_word:
            print(f"[DEBUG] 从缓存中获取单词信息: {word}")
            # 如果是学习模式请求，需要补充 options 和 correct_index
            if "multiple_choice" in cached_word and "options" in cached_word["multiple_choice"]:
                # 已经包含完整数据，直接返回
                return cached_word
            else:
                # 旧格式缓存，需要补充
                pass

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

        # 构建上下文（包含翻译）
        sentences = storage.load_pipeline_data(file_id)
        context = ""
        context_sentences = []
        context_sentences_with_translations = []
        if sentences:
            for sentence_data in sentences:
                if "sentence" in sentence_data:
                    if word_data["word"] in sentence_data["sentence"]:
                        context_sentences.append(sentence_data["sentence"])
                        # 获取翻译
                        translation = ""
                        if "translation_result" in sentence_data:
                            translation = sentence_data["translation_result"].get("tokenized_translation", "")
                        context_sentences_with_translations.append({
                            "sentence": sentence_data["sentence"],
                            "translation": translation
                        })
            if not context and sentences:
                # 如果没找到，使用第一个句子作为上下文
                context = sentences[0].get("sentence", "")

        # 加载语言设置
        language_settings = storage.load_language_settings(file_id)
        target_lang = language_settings["target_lang"]

        correct_meaning = word_data.get("context_meaning", "")

        if not correct_meaning:
            # 尝试从其他字段获取释义
            if "translation" in word_data:
                correct_meaning = word_data["translation"]
            elif "meaning" in word_data:
                correct_meaning = word_data["meaning"]

        # 调用generate_multiple_choice获取丰富的单词信息
        options_result = await nvidia_api.generate_multiple_choice(
            word_data["word"],
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
        
        # 构建响应数据（同时支持单词详情和学习模式）
        print(f"[DEBUG] options_result keys: {list(options_result.keys())}")
        print(f"[DEBUG] options_result['context_sentences']: {options_result.get('context_sentences')}")
        print(f"[DEBUG] context_sentences_with_translations: {context_sentences_with_translations}")
        # 先构建 response_data 完全 manually, to avoid issues
        response_data = {}
        response_data["word"] = options_result.get("word", word_data["word"])
        response_data["ipa"] = options_result.get("ipa", word_data.get("ipa", ""))
        response_data["meaning"] = options_result.get("enriched_meaning", correct_meaning)
        response_data["correct_meaning"] = options_result.get("enriched_meaning", correct_meaning)
        response_data["examples"] = options_result.get("examples", [])
        response_data["context_sentences"] = context_sentences_with_translations
        response_data["context"] = context
        response_data["morphology"] = word_data.get("morphology", "")
        response_data["variants_detail"] = options_result.get("variants_detail", [])
        response_data["memory_hint"] = options_result.get("memory_hint", "")
        response_data["options"] = options
        response_data["correct_index"] = correct_index
        response_data["multiple_choice"] = options_result.get("multiple_choice", {})
        # Add any other keys from options_result except context_sentences, context_translations
        for key, value in options_result.items():
            if key not in response_data and key not in ["context_translations"]:
                response_data[key] = value
        print(f"[DEBUG] response_data['context_sentences']: {response_data['context_sentences']}")
        
        # 缓存结果
        storage.save_word_cache(file_id, word, response_data)
        print(f"[DEBUG] 缓存单词信息: {word}")
        
        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting word details: {str(e)}")


@app.get("/api/learn/{file_id}/progress")
async def get_learning_progress(file_id: str):
    try:
        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocab not found")
        
        # 实现10个单词一组的分组
        group_size = 10
        units = []
        for i in range(0, len(vocab), group_size):
            unit_words = vocab[i:i+group_size]
            units.append({
                "word_count": len(unit_words),
                "completed": False
            })
        
        # 加载学习进度
        current_index = storage.load_learning_progress(file_id)
        current_unit = current_index // group_size
        
        # 标记已完成的单元
        for i in range(current_unit):
            if i < len(units):
                units[i]["completed"] = True
        
        total_units = len(units)
        all_units_completed = current_unit >= total_units
        
        return {
            "units": units,
            "current_unit": current_unit,
            "total_units": total_units,
            "all_units_completed": all_units_completed
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting learning progress: {str(e)}")


@app.get("/api/learn/{file_id}/unit/{unit_id}")
async def get_unit_words(file_id: str, unit_id: int):
    try:
        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocab not found")
        
        # 实现10个单词一组的分组
        group_size = 10
        start_index = unit_id * group_size
        end_index = start_index + group_size
        unit_words = vocab[start_index:end_index]
        
        if not unit_words:
            raise HTTPException(status_code=404, detail="Unit not found")
        
        # 为每个单词生成学习数据
        language_settings = storage.load_language_settings(file_id)
        target_lang = language_settings["target_lang"]
        
        learning_words = []
        for word_data in unit_words:
            # 构建上下文
            sentences = storage.load_pipeline_data(file_id)
            context = ""
            if sentences:
                for sentence_data in sentences:
                    if "sentence" in sentence_data:
                        if word_data["word"] in sentence_data["sentence"]:
                            context = sentence_data["sentence"]
                            break
                if not context and sentences:
                    # 如果没找到，使用第一个句子作为上下文
                    context = sentences[0].get("sentence", "")
            
            correct_meaning = word_data.get("context_meaning", "")
            
            if not correct_meaning:
                # 尝试从其他字段获取释义
                if "translation" in word_data:
                    correct_meaning = word_data["translation"]
                elif "meaning" in word_data:
                    correct_meaning = word_data["meaning"]
            
            # 调用generate_multiple_choice获取丰富的单词信息
            options_result = await nvidia_api.generate_multiple_choice(
                word_data["word"],
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
            
            # 构建学习数据
            learning_word = {
                "word": options_result.get("word", word_data["word"]),
                "ipa": options_result.get("ipa", word_data.get("ipa", "")),
                "correct_meaning": options_result.get("enriched_meaning", correct_meaning),
                "options": options,
                "correct_index": correct_index,
                "context": context,
                "variants_detail": options_result.get("variants_detail", []),
                "examples": options_result.get("examples", []),
                "memory_hint": options_result.get("memory_hint", "")
            }
            learning_words.append(learning_word)
        
        return {
            "unit_id": unit_id,
            "words": learning_words
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting unit words: {str(e)}")


@app.get("/api/learn/{file_id}/check-coverage")
async def check_coverage(file_id: str):
    try:
        vocab = storage.load_vocab(file_id)
        if not vocab:
            return {"can_form_sentences": False, "unit_completed": False}
        
        # 加载学习进度
        current_index = storage.load_learning_progress(file_id)
        
        # 检查是否完成了当前单元
        unit_size = 10
        current_unit = current_index // unit_size
        words_in_unit = min(unit_size, len(vocab) - current_unit * unit_size)
        unit_completed = current_index >= (current_unit * unit_size + words_in_unit)
        
        # 检查是否已经学习完所有单词
        all_words_learned = current_index >= len(vocab)
        
        # 对于短文本，学习完所有单词后就可以开始句子翻译
        if len(vocab) <= 5:
            if not all_words_learned:
                return {"can_form_sentences": False, "unit_completed": unit_completed}
        else:
            # 至少要学够3个单词后才可能出现句子翻译题
            if current_index < 2:
                return {"can_form_sentences": False, "unit_completed": unit_completed}
        
        # 学习完所有单词后，所有单词都算已学
        if all_words_learned:
            learned_word_set = set(word["word"].lower() for word in vocab)
        else:
            # 否则只算到current_index-1的单词（因为current_index是下一个要学的单词）
            learned_words = vocab[:current_index]
            learned_word_set = set(word["word"].lower() for word in learned_words)
        
        # 加载句子
        sentences = storage.load_pipeline_data(file_id)
        if not sentences:
            return {"can_form_sentences": False, "unit_completed": unit_completed}
        
        # 检查是否有句子可以用已学单词组成
        can_form = False
        for sentence_data in sentences:
            if "sentence" in sentence_data:
                sentence = sentence_data["sentence"]
                # 使用改进的分词函数，正确处理缩写形式
                words_in_sentence = set(word.lower() for word in text_processor.tokenize_sentence(sentence))
                # 检查是否所有单词都在已学单词中
                if words_in_sentence.issubset(learned_word_set) and len(words_in_sentence) >= 2:
                    can_form = True
                    break
        
        return {"can_form_sentences": can_form, "unit_completed": unit_completed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking coverage: {str(e)}")


@app.get("/api/learn/{file_id}/sentence-quiz")
async def generate_sentence_quiz(file_id: str):
    try:
        vocab = storage.load_vocab(file_id)
        if not vocab:
            raise HTTPException(status_code=404, detail="Vocab not found")
        
        # 加载语言设置
        language_settings = storage.load_language_settings(file_id)
        target_lang = language_settings["target_lang"]
        
        # 加载学习进度
        current_index = storage.load_learning_progress(file_id)
        learned_words = vocab[:current_index + 1]
        learned_word_set = set(word["word"].lower() for word in learned_words)
        
        # 加载句子
        sentences = storage.load_pipeline_data(file_id)
        if not sentences:
            raise HTTPException(status_code=404, detail="Sentences not found")
        
        # 找到可以用已学单词组成的句子
        eligible_sentences = []
        for sentence_data in sentences:
            if "sentence" in sentence_data:
                sentence = sentence_data["sentence"]
                # 简单分词（按空格）
                words_in_sentence = set(word.lower() for word in sentence.split() if word.isalpha())
                # 检查是否所有单词都在已学单词中，且至少2个单词
                if words_in_sentence.issubset(learned_word_set) and len(words_in_sentence) >= 2:
                    eligible_sentences.append(sentence_data)
        
        if not eligible_sentences:
            raise HTTPException(status_code=404, detail="No eligible sentences found")
        
        # 随机选择一个句子
        import random
        selected_sentence = random.choice(eligible_sentences)
        original_sentence = selected_sentence["sentence"]
        
        # 直接使用LLM生成的数据
        translation_result = selected_sentence["translation_result"]
        tokenized_translation = translation_result.get("tokenized_translation", "")
        redundant_tokens = translation_result.get("redundant_tokens", [])
        
        # 过滤掉标点符号，只保留文字
        def clean_token(token):
            return re.sub(r'[^\w\s]', '', token)
        
        # 生成正确答案的token列表 - 使用LLM生成的translation数组中的translation字段
        correct_tokens = []
        if "translation" in translation_result:
            for token in translation_result["translation"]:
                if isinstance(token, dict) and "translation" in token:
                    text = token["translation"]
                    cleaned_text = clean_token(text)
                    if cleaned_text:
                        correct_tokens.append(cleaned_text)
        
        # 清理冗余词
        cleaned_redundant_tokens = []
        for token in redundant_tokens:
            cleaned_text = clean_token(token)
            if cleaned_text and cleaned_text not in correct_tokens:
                cleaned_redundant_tokens.append(cleaned_text)
        
        # 过滤掉重复的冗余词，只保留不超过3个
        unique_redundant = list(set(cleaned_redundant_tokens))
        selected_distractors = unique_redundant[:3]
        
        # 合并正确tokens和干扰词，然后打乱
        all_tokens = correct_tokens + selected_distractors
        random.shuffle(all_tokens)
        
        # 清理正确翻译，移除标点符号
        correct_translation = clean_token(tokenized_translation)
        
        return {
            "original_sentence": original_sentence,
            "correct_translation": correct_translation,
            "correct_tokens": correct_tokens,
            "tokens": all_tokens
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating sentence quiz: {str(e)}")


# --- 新的学习阶段 API ---
@app.get("/api/{file_id}/phases")
async def get_phases(file_id: str):
    """获取所有阶段列表和进度"""
    try:
        # 加载句子数据
        sentences = storage.load_pipeline_data(file_id)
        if not sentences:
            raise HTTPException(status_code=404, detail="No sentences found")
        
        # 提取句子列表
        sentence_list = [s["sentence"] for s in sentences if "sentence" in s]
        
        # 分组为单元（8句/单元）
        units = text_processor.group_sentences_into_units(sentence_list, 8)
        
        # 获取各阶段进度
        phase1_progress = storage.load_phase_progress(file_id, 1)
        phase2_progress = storage.load_phase_progress(file_id, 2)
        
        return {
            "phases": [
                {
                    "phase_number": 1,
                    "name": "阶段一：单词学习",
                    "units_count": len(units),
                    "progress": phase1_progress
                },
                {
                    "phase_number": 2,
                    "name": "阶段二：句子练习",
                    "units_count": len(units),
                    "progress": phase2_progress
                }
            ],
            "total_units": len(units)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/{file_id}/phase/{phase_number}/units")
async def get_phase_units(file_id: str, phase_number: int):
    """获取指定阶段的单元列表"""
    try:
        sentences = storage.load_pipeline_data(file_id)
        if not sentences:
            raise HTTPException(status_code=404, detail="No sentences found")
        
        sentence_list = [s["sentence"] for s in sentences if "sentence" in s]
        units = text_processor.group_sentences_into_units(sentence_list, 8)
        
        # 加载进度
        progress = storage.load_phase_progress(file_id, phase_number)
        
        return {
            "phase_number": phase_number,
            "units": [
                {
                    "unit_id": i,
                    "sentences_count": len(unit),
                    "completed": i < progress["current_unit"]
                }
                for i, unit in enumerate(units)
            ],
            "current_unit": progress["current_unit"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/{file_id}/phase/{phase_number}/unit/{unit_id}")
async def get_phase_unit_exercise(file_id: str, phase_number: int, unit_id: int):
    """获取指定单元的当前练习"""
    try:
        # 加载数据
        sentences = storage.load_pipeline_data(file_id)
        vocab = storage.load_vocab(file_id)
        if not sentences:
            raise HTTPException(status_code=404, detail="No sentences found")
        
        # 获取该单元的句子
        sentence_list = [s for s in sentences if "sentence" in s]
        
        # 加载或生成句子随机顺序
        shuffled_indices = storage.load_sentence_order(file_id, phase_number)
        if not shuffled_indices:
            # 生成并保存随机顺序
            import random
            random.seed(42)  # 固定种子，确保每次顺序一致
            shuffled_indices = list(range(len(sentence_list)))
            random.shuffle(shuffled_indices)
            storage.save_sentence_order(file_id, phase_number, shuffled_indices)
        
        # 应用随机顺序
        shuffled_sentences = [sentence_list[i] for i in shuffled_indices]
        
        # 分组为单元
        units = text_processor.group_sentences_into_units(shuffled_sentences, 8)
        
        if unit_id >= len(units):
            raise HTTPException(status_code=404, detail="Unit not found")
        
        unit_sentences = units[unit_id]
        
        # 加载进度
        progress = storage.load_phase_progress(file_id, phase_number)
        
        exercise_index = progress["current_exercise"]
        
        if exercise_index >= len(unit_sentences) * 2:  # 每个句子两个练习
            return {"unit_complete": True}
        
        # 确定练习类型（0: 蒙版填空, 1: 翻译还原）
        sentence_idx = exercise_index // 2
        exercise_type = exercise_index % 2
        
        current_sentence_data = unit_sentences[sentence_idx]
        current_sentence = current_sentence_data["sentence"]
        
        # 安全检查：防止无限递归
        import time
        last_exercise_time = getattr(get_phase_unit_exercise, "last_exercise_time", 0)
        current_time = time.time()
        if current_time - last_exercise_time < 0.5:
            # 短时间内多次调用，可能是无限递归
            return {"error": "无法生成练习，请尝试其他单元"}
        get_phase_unit_exercise.last_exercise_time = current_time
        
        if phase_number == 2:
            if exercise_type == 0:
                # 练习1：蒙版填空
                # 获取翻译tokens
                translation_result = current_sentence_data.get("translation_result", {})
                translation_tokens = []
                if "translation" in translation_result:
                    for token in translation_result["translation"]:
                        if isinstance(token, dict) and "text" in token:
                            translation_tokens.append(token["text"])
                
                # 生成蒙版练习（支持任意长度句子）
                masked_exercise = text_processor.generate_masked_sentence(
                    current_sentence, 
                    vocab, 
                    translation_tokens if translation_tokens else None
                )
                
                return {
                    "exercise_type": "masked_sentence",
                    "exercise_index": exercise_index,
                    "data": masked_exercise,
                    "unit_id": unit_id
                }
            else:
                # 练习2：翻译还原（从母语到原文）
                translation_result = current_sentence_data.get("translation_result", {})
                tokenized_translation = translation_result.get("tokenized_translation", "")
                original_tokens = text_processor.tokenize_sentence(current_sentence)
                
                # Get English distractors from vocab
                import random
                distractors = []
                vocab_words = [v["word"] for v in vocab]
                original_lower = [t.lower() for t in original_tokens]
                random.shuffle(vocab_words)
                for vw in vocab_words:
                    if vw.lower() not in original_lower and len(distractors) < 4:
                        distractors.append(vw)
                
                # Backup distractors
                backup_distractors = ["apple", "banana", "cat", "dog", "elephant", "fish"]
                idx = 0
                while len(distractors) < 4:
                    bd = backup_distractors[idx % len(backup_distractors)]
                    if bd.lower() not in original_lower and bd not in distractors:
                        distractors.append(bd)
                    idx += 1
                
                # Prepare options
                all_tokens = original_tokens + distractors
                random.shuffle(all_tokens)
                
                return {
                    "exercise_type": "translation_reconstruction",
                    "exercise_index": exercise_index,
                    "data": {
                        "native_translation": tokenized_translation,
                        "original_tokens": original_tokens,
                        "options": all_tokens
                    },
                    "unit_id": unit_id
                }
        
        # 阶段1：返回单词学习（复用现有逻辑）
        # 这里我们暂时返回第一阶段的进度入口
        return {"redirect_to_phase1": True}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/{file_id}/phase/{phase_number}/unit/{unit_id}/next")
async def next_phase_exercise(file_id: str, phase_number: int, unit_id: int):
    """进入下一个练习"""
    try:
        progress = storage.load_phase_progress(file_id, phase_number)
        new_exercise_index = progress["current_exercise"] + 1
        
        # 检查单元是否完成
        sentences = storage.load_pipeline_data(file_id)
        sentence_list = [s for s in sentences if "sentence" in s]
        units = text_processor.group_sentences_into_units(sentence_list, 8)
        
        if unit_id >= len(units):
            return {"success": False, "error": "Unit not found"}
        
        max_exercises = len(units[unit_id]) * 2
        
        if new_exercise_index >= max_exercises:
            # 单元完成，进入下一个单元
            new_unit_id = unit_id + 1
            storage.save_phase_progress(file_id, phase_number, new_unit_id, 0)
            return {"success": True, "unit_complete": True, "new_unit": new_unit_id}
        else:
            storage.save_phase_progress(file_id, phase_number, unit_id, new_exercise_index)
            return {"success": True, "new_exercise_index": new_exercise_index}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/{file_id}/phase/{phase_number}/unit/{unit_id}/complete")
async def complete_phase_unit(file_id: str, phase_number: int, unit_id: int):
    """标记单元为完成"""
    try:
        storage.save_phase_progress(file_id, phase_number, unit_id + 1, 0)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, timeout_keep_alive=600)
