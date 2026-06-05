"""阶段相关路由：phases, phase/*/units, phase/*/unit/*"""

from fastapi import APIRouter, HTTPException

from text_processor import BACKUP_VOCAB_BY_LANG, is_punctuation_only, is_source_lang_text, strip_edge_punctuation, NO_SPACE_LANGUAGES
from utils.state import text_processor, storage
from utils.helpers import (
    is_speaker_label, filter_eligible_sentences,
    fix_llm_options_result, get_translation_phrases,
)
from utils.exercise_generators import generate_and_save_learning_plan

router = APIRouter(prefix="/api", tags=["phases"])


@router.get("/{file_id}/phases")
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


@router.get("/{file_id}/phase/{phase_number}/units")
async def get_phase_units(file_id: str, phase_number: int):
    try:
        sentences = storage.load_pipeline_data(file_id)
        vocab = storage.load_vocab(file_id)
        if not sentences:
            raise HTTPException(status_code=404, detail="No sentences found")

        if phase_number == 1:
            current_index = storage.load_learning_progress(file_id)
            max_index = storage.load_learning_max_progress(file_id)

            plan = storage.load_learning_plan(file_id)
            if not plan:
                generate_and_save_learning_plan(file_id, vocab, storage.load_pipeline_data(file_id) or [])
                plan = storage.load_learning_plan(file_id)

            phase1_units = []
            accumulated = 0
            for i, unit_plan in enumerate(plan):
                items = unit_plan.get("items", [])
                start_index = accumulated
                end_index = accumulated + len(items)
                word_count = sum(1 for item in items if item["type"] == "word")
                completed = max_index >= end_index
                word_items = [item for item in items if item["type"] == "word"]
                all_words_cached = True
                for item in word_items:
                    vi = item.get("vocab_index")
                    if vi is not None and vi < len(vocab):
                        w = vocab[vi].get("word", "")
                        if w and not storage.load_word_cache(file_id, w):
                            all_words_cached = False
                            break
                phase1_units.append({
                    "word_count": word_count,
                    "exercises_count": len(items),
                    "completed": completed,
                    "start_index": start_index,
                    "end_index": end_index,
                    "generating": not all_words_cached
                })
                accumulated += len(items)

            current_unit = 0
            for i, unit in enumerate(phase1_units):
                if current_index < unit["end_index"]:
                    current_unit = i
                    break
            else:
                current_unit = len(phase1_units) - 1 if phase1_units else 0

            return {
                "phase_number": phase_number,
                "units": [
                    {
                        "unit_id": i,
                        "word_count": unit["word_count"],
                        "exercises_count": unit["exercises_count"],
                        "completed": unit["completed"],
                        "start_index": unit["start_index"],
                        "end_index": unit["end_index"],
                        "generating": unit["generating"]
                    }
                    for i, unit in enumerate(phase1_units)
                ],
                "current_unit": current_unit
            }
        else:
            eligible_sentences = filter_eligible_sentences(sentences)

            if not eligible_sentences:
                return {
                    "phase_number": phase_number,
                    "units": [{"unit_id": 0, "exercises_count": 0, "completed": True, "no_eligible_sentences": True}],
                    "current_unit": 0
                }

            exercise_order = storage.load_exercise_order(file_id, phase_number)
            exercises_per_sent = []
            for s in eligible_sentences:
                wc = len(s.get("sentence", "").split())
                if wc >= 20:
                    exercises_per_sent.append(3)
                elif wc >= 3:
                    exercises_per_sent.append(4)
                else:
                    exercises_per_sent.append(1)
            expected_length = sum(exercises_per_sent)

            if exercise_order is None:
                seed = hash(str([s.get("sentence", "") for s in eligible_sentences]))
                exercise_order = text_processor.generate_interleaved_exercise_order(
                    len(eligible_sentences), masks_per_sentence=3, seed=seed,
                    exercises_per_sentence_list=exercises_per_sent
                )
                storage.save_exercise_order(file_id, phase_number, exercise_order)
                storage.save_phase2_progress(file_id, 0)

            unit_size = 10
            total_exercises = len(exercise_order)
            num_units = max(1, (total_exercises + unit_size - 1) // unit_size)

            max_exercise_index = storage.load_phase2_max_progress(file_id)
            current_exercise_index = storage.load_phase2_progress(file_id)
            if max_exercise_index > total_exercises:
                storage.save_phase2_progress(file_id, 0)
                max_exercise_index = 0
                current_exercise_index = 0

            units = []
            for i in range(num_units):
                start = i * unit_size
                end = min(start + unit_size, total_exercises)
                units.append({
                    "unit_id": i,
                    "exercises_count": end - start,
                    "completed": max_exercise_index >= end
                })

            current_unit = 0
            for i in range(num_units):
                if current_exercise_index < (i + 1) * unit_size and current_exercise_index >= i * unit_size:
                    current_unit = i
                    break
            else:
                current_unit = min(num_units - 1, current_exercise_index // unit_size)

            return {
                "phase_number": phase_number,
                "units": units,
                "current_unit": current_unit
            }
    except Exception as e:
        print(f"[ERROR] get_phase_units: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{file_id}/phase/{phase_number}/unit/{unit_id}")
async def get_phase_unit_exercise(file_id: str, phase_number: int, unit_id: int):
    try:
        storage.touch_history_record(file_id)
        sentences = storage.load_pipeline_data(file_id)
        vocab = storage.load_vocab(file_id)
        if not sentences:
            raise HTTPException(status_code=404, detail="No sentences found")

        if phase_number == 2:
            language_settings = storage.load_language_settings(file_id)
            source_lang = language_settings.get("source_lang", "en")

            eligible_sentences = filter_eligible_sentences(sentences)

            if not eligible_sentences:
                return {"unit_complete": True, "no_eligible_sentences": True}

            exercise_order = storage.load_exercise_order(file_id, phase_number)
            exercises_per_sent = []
            for s in eligible_sentences:
                wc = len(s.get("sentence", "").split())
                if wc >= 20:
                    exercises_per_sent.append(3)
                elif wc >= 3:
                    exercises_per_sent.append(4)
                else:
                    exercises_per_sent.append(1)
            expected_length = sum(exercises_per_sent)

            if exercise_order is None:
                seed = hash(str([s.get("sentence", "") for s in eligible_sentences]))
                exercise_order = text_processor.generate_interleaved_exercise_order(
                    len(eligible_sentences), masks_per_sentence=3, seed=seed,
                    exercises_per_sentence_list=exercises_per_sent
                )
                storage.save_exercise_order(file_id, phase_number, exercise_order)
                storage.save_phase2_progress(file_id, 0)

            unit_size = 10
            current_exercise_index = storage.load_phase2_progress(file_id)
            total_exercises = len(exercise_order)
            max_exercise_index = storage.load_phase2_max_progress(file_id)
            if max_exercise_index > total_exercises:
                storage.save_phase2_progress(file_id, 0)
                current_exercise_index = 0
            current_unit = current_exercise_index // unit_size

            exercise_start = unit_id * unit_size
            exercise_end = min(exercise_start + unit_size, len(exercise_order))

            if current_exercise_index >= exercise_end:
                storage.save_phase2_progress(file_id, exercise_start)
                current_exercise_index = exercise_start
            elif current_exercise_index < exercise_start:
                storage.save_phase2_progress(file_id, exercise_start)
                current_exercise_index = exercise_start

            sent_idx, type_idx = exercise_order[current_exercise_index]
            current_sentence_data = eligible_sentences[sent_idx]
            current_sentence = current_sentence_data["sentence"]

            translation_result = current_sentence_data.get("translation_result", {})
            translation_tokens = []
            if "translation" in translation_result:
                for token in translation_result["translation"]:
                    if isinstance(token, dict) and "text" in token:
                        token_text = token["text"]
                        if not is_punctuation_only(token_text) and not is_speaker_label(token_text):
                            translation_tokens.append(token_text)

            exercise_index_in_unit = current_exercise_index - exercise_start
            total_exercises_in_unit = exercise_end - exercise_start

            if type_idx < 3:
                if source_lang in NO_SPACE_LANGUAGES:
                    word_count = len(current_sentence.replace(' ', ''))
                else:
                    word_count = len(current_sentence.split())
                if word_count < 3:
                    type_idx = 3

            if type_idx < 3:
                mask_seed = hash(current_sentence) + 1
                masked_exercise = text_processor.generate_masked_sentence(
                    current_sentence,
                    vocab,
                    translation_tokens,
                    sentences,
                    mask_seed=mask_seed,
                    source_lang=source_lang,
                    mask_version=type_idx,
                    max_distractors=3
                )

                return {
                    "exercise_type": "masked_sentence",
                    "exercise_index_in_unit": exercise_index_in_unit,
                    "total_exercises_in_unit": total_exercises_in_unit,
                    "mask_version": type_idx,
                    "total_masks": 3,
                    "data": masked_exercise,
                    "unit_id": unit_id,
                    "sentence_preview": current_sentence[:50] + "..." if len(current_sentence) > 50 else current_sentence
                }
            else:
                tokenized_translation = translation_result.get("tokenized_translation", "")

                original_tokens = []

                if "translation" in translation_result:
                    for token in translation_result["translation"]:
                        if isinstance(token, dict) and "text" in token:
                            token_text = strip_edge_punctuation(token["text"].strip())
                            if token_text and not is_punctuation_only(token_text) and not is_speaker_label(token_text):
                                original_tokens.append(token_text)

                if not original_tokens:
                    original_tokens = text_processor.tokenize_sentence(current_sentence, language=source_lang)

                if len(original_tokens) > 8:
                    new_exercise_index = current_exercise_index + 1
                    storage.save_phase2_progress(file_id, new_exercise_index)
                    if new_exercise_index >= len(exercise_order):
                        return {"unit_complete": True}
                    return await get_phase_unit_exercise(file_id, phase_number, unit_id)

                import random
                random.seed(hash(current_sentence) + type_idx)
                distractors = []
                original_lower_set = set(t.lower() for t in original_tokens)
                max_distractors = 3

                all_candidate_distractors = []
                candidate_set = set()
                for sent_data in eligible_sentences:
                    if sent_data is current_sentence_data:
                        continue
                    if "translation_result" in sent_data and "translation" in sent_data["translation_result"]:
                        for token in sent_data["translation_result"]["translation"]:
                            if isinstance(token, dict) and "text" in token:
                                token_text = token["text"].strip()
                                if token_text and token_text.lower() not in original_lower_set and token_text.lower() not in candidate_set:
                                    all_candidate_distractors.append(token_text)
                                    candidate_set.add(token_text.lower())

                vocab_words = [v["word"] for v in vocab]
                for vw in vocab_words:
                    if vw.lower() not in original_lower_set and vw.lower() not in candidate_set:
                        all_candidate_distractors.append(vw)
                        candidate_set.add(vw.lower())

                random.shuffle(all_candidate_distractors)
                distractors = all_candidate_distractors[:max_distractors]

                if len(distractors) < max_distractors:
                    backup_vocab_list = BACKUP_VOCAB_BY_LANG.get(source_lang, BACKUP_VOCAB_BY_LANG["en"])
                    backup_distractors = list(backup_vocab_list)
                    random.shuffle(backup_distractors)
                    idx = 0
                    while len(distractors) < max_distractors:
                        bd = backup_distractors[idx % len(backup_distractors)]
                        if bd.lower() not in original_lower_set and bd not in distractors:
                            distractors.append(bd)
                        idx += 1

                all_tokens = original_tokens + distractors
                random.shuffle(all_tokens)

                return {
                    "exercise_type": "translation_reconstruction",
                    "exercise_index_in_unit": exercise_index_in_unit,
                    "total_exercises_in_unit": total_exercises_in_unit,
                    "data": {
                        "native_translation": tokenized_translation,
                        "original_tokens": original_tokens,
                        "options": all_tokens
                    },
                    "unit_id": unit_id,
                    "sentence_preview": current_sentence[:50] + "..." if len(current_sentence) > 50 else current_sentence
                }

        return {"redirect_to_phase1": True}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{file_id}/phase/{phase_number}/unit/{unit_id}/next")
async def next_phase_exercise(file_id: str, phase_number: int, unit_id: int):
    try:
        if phase_number == 2:
            current_exercise_index = storage.load_phase2_progress(file_id)
            new_exercise_index = current_exercise_index + 1

            exercise_order = storage.load_exercise_order(file_id, phase_number)
            if exercise_order is None:
                return {"success": False, "error": "No exercise order found"}

            unit_size = 10
            total_exercises = len(exercise_order)
            new_unit = new_exercise_index // unit_size

            if new_exercise_index >= total_exercises:
                storage.save_phase2_progress(file_id, new_exercise_index)
                return {"success": True, "all_complete": True}

            if new_unit > unit_id:
                storage.save_phase2_progress(file_id, new_exercise_index)
                return {"success": True, "unit_complete": True, "new_unit": new_unit}

            storage.save_phase2_progress(file_id, new_exercise_index)
            return await get_phase_unit_exercise(file_id, phase_number, unit_id)
        else:
            progress = storage.load_phase_progress(file_id, phase_number)
            current_exercise_index = progress["current_exercise"]
            new_exercise_index = current_exercise_index + 1

            sentences = storage.load_pipeline_data(file_id)
            sentence_list = [s for s in sentences if "sentence" in s]
            units = text_processor.group_sentences_into_units(sentence_list, 8)

            if unit_id >= len(units):
                return {"success": False, "error": "Unit not found"}

            max_exercises = len(units[unit_id])

            if new_exercise_index >= max_exercises:
                new_unit_id = unit_id + 1
                storage.save_phase_progress(file_id, phase_number, new_unit_id, 0, 0)
                return {"success": True, "unit_complete": True, "new_unit": new_unit_id}
            else:
                storage.save_phase_progress(file_id, phase_number, unit_id, new_exercise_index, 0)
                return {"success": True, "new_exercise_index": new_exercise_index}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{file_id}/phase/{phase_number}/unit/{unit_id}/complete")
async def complete_phase_unit(file_id: str, phase_number: int, unit_id: int):
    try:
        if phase_number == 2:
            exercise_order = storage.load_exercise_order(file_id, phase_number)
            if exercise_order:
                unit_size = 10
                new_exercise_index = (unit_id + 1) * unit_size
                storage.save_phase2_progress(file_id, new_exercise_index)
            return {"success": True}
        else:
            storage.save_phase_progress(file_id, phase_number, unit_id + 1, 0, 0)
            return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{file_id}/phase/{phase_number}/set-progress")
async def set_phase_progress(file_id: str, phase_number: int, request: dict):
    try:
        if phase_number == 2:
            exercise_index = request.get("exercise_index", 0)
            storage.save_phase2_progress(file_id, exercise_index)
            return {"success": True}
        else:
            unit_id = request.get("unit_id", 0)
            exercise_index = request.get("exercise_index", 0)
            exercise_type_index = request.get("exercise_type_index", 0)
            storage.save_phase_progress(file_id, phase_number, unit_id, exercise_index, exercise_type_index)
            return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
