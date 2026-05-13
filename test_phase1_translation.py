import sys
sys.path.insert(0, '/workspace/backend')

from storage import Storage
import json
import shutil
import asyncio

storage = Storage()
test_file_id = "test_phase1_translation"
test_dir = storage.get_file_dir(test_file_id)
if test_dir.exists():
    shutil.rmtree(test_dir)

sentences_data = [
    {
        "sentence": "Hi man, how are you doing today?",
        "word_count": 7,
        "translation_result": {
            "translation": [
                {"text": "Hi", "translation": "嗨"},
                {"text": "man", "translation": "伙计"},
                {"text": "how", "translation": "怎样"},
                {"text": "are", "translation": "是"},
                {"text": "you", "translation": "你"},
                {"text": "doing", "translation": "做"},
                {"text": "today", "translation": "今天"},
            ],
            "tokenized_translation": "嗨，伙计，你今天怎么样？",
            "redundant_tokens": ["昨天", "明天", "很好", "他们"],
        }
    }
]

vocab = [
    {"word": "hi", "tokens": ["hi"], "translation": "嗨", "ipa": "/haɪ/", "context_meaning": "嗨", "examples": ["Hi there!"], "options": ["嗨", "再见", "谢谢", "对不起"], "grammar": "感叹词"},
    {"word": "man", "tokens": ["man"], "translation": "伙计", "ipa": "/mæn/", "context_meaning": "伙计", "examples": ["Hey man!"], "options": ["伙计", "女人", "孩子", "动物"], "grammar": "名词"},
    {"word": "how", "tokens": ["how"], "translation": "怎样", "ipa": "/haʊ/", "context_meaning": "怎样", "examples": ["How are you?"], "options": ["怎样", "什么", "哪里", "何时"], "grammar": "副词"},
    {"word": "are", "tokens": ["are"], "translation": "是", "ipa": "/ɑːr/", "context_meaning": "是", "examples": ["You are kind."], "options": ["是", "有", "做", "去"], "grammar": "动词"},
    {"word": "you", "tokens": ["you"], "translation": "你", "ipa": "/juː/", "context_meaning": "你", "examples": ["You are nice."], "options": ["你", "我", "他", "她"], "grammar": "代词"},
    {"word": "doing", "tokens": ["doing"], "translation": "做", "ipa": "/ˈduːɪŋ/", "context_meaning": "做", "examples": ["What are you doing?"], "options": ["做", "说", "想", "看"], "grammar": "动词"},
    {"word": "today", "tokens": ["today"], "translation": "今天", "ipa": "/təˈdeɪ/", "context_meaning": "今天", "examples": ["Today is Monday."], "options": ["今天", "昨天", "明天", "后天"], "grammar": "名词"},
]

storage.save_pipeline_data(test_file_id, sentences_data)
storage.save_vocab(test_file_id, vocab)
storage.save_language_settings(test_file_id, "en", "zh")

from main import next_word, get_random_word

print("=" * 60)
print("测试: 阶段一翻译题插入流程")
print("=" * 60)

async def test_translation_insertion():
    storage.save_learning_progress(test_file_id, 0)
    
    print("\n--- 模拟学完7个单词 ---")
    for i in range(7):
        word = await get_random_word(test_file_id)
        word_text = word.get("word", "?")
        print(f"  学习单词 {i+1}/7: {word_text}")
        
        result = await next_word(test_file_id)
        new_index = result.get("new_index", 0)
        sentence_quiz = result.get("sentence_quiz")
        
        if sentence_quiz:
            print(f"  ✓ 学完第{i+1}个词后，后端返回翻译题!")
            print(f"    英文句子: {sentence_quiz['original_sentence']}")
            print(f"    正确tokens: {sentence_quiz['correct_tokens']}")
            print(f"    所有选项: {sentence_quiz['tokens']}")
            assert sentence_quiz['original_sentence'] == "Hi man, how are you doing today?"
            assert len(sentence_quiz['correct_tokens']) > 0
            assert len(sentence_quiz['tokens']) > len(sentence_quiz['correct_tokens'])
            print("  ✓ 翻译题数据正确!")
            break
        else:
            print(f"    → 没有翻译题，继续学习 (new_index={new_index})")
    else:
        print("  ✗ 学完所有7个词后仍然没有翻译题!")
    
    print("\n--- 检查已使用的句子 ---")
    used = storage.load_used_sentences(test_file_id) or []
    print(f"  已使用的句子: {used}")
    assert len(used) > 0, "应该有已使用的句子"
    print("  ✓ 句子已标记为已使用")

asyncio.run(test_translation_insertion())

print()
print("=" * 60)
print("测试: 重新进入单元时不会重复出翻译题")
print("=" * 60)

async def test_no_repeat():
    storage.save_learning_progress(test_file_id, 0)
    
    result = await next_word(test_file_id)
    sentence_quiz = result.get("sentence_quiz")
    if sentence_quiz:
        print("  ✗ 重新进入时不应该再次出现翻译题（句子已使用）")
    else:
        print("  ✓ 重新进入时不会重复出翻译题")

asyncio.run(test_no_repeat())

if test_dir.exists():
    shutil.rmtree(test_dir)

print()
print("=" * 60)
print("所有测试完成!")
print("=" * 60)
