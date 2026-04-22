import requests
import time

BASE_URL = "http://localhost:8000"
FILE_ID = "text_20260422_071639_825"

def test_get_vocab():
    """测试获取词汇表"""
    print("\n=== 测试获取词汇表 ===")
    vocab_url = f"{BASE_URL}/api/vocab/{FILE_ID}"
    response = requests.get(vocab_url)
    print(f"响应代码: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"词汇表: {[w['word'] for w in data.get('vocab', [])]}")
        print("✅ 词汇表获取成功")
        return True
    print(f"响应内容: {response.text}")
    return False

def test_get_sentences():
    """测试获取句子"""
    print("\n=== 测试获取句子 ===")
    sentences_url = f"{BASE_URL}/api/sentences/{FILE_ID}"
    response = requests.get(sentences_url)
    print(f"响应代码: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        for i, sent in enumerate(data.get('sentences', [])):
            print(f"  句子 {i+1}: {sent['sentence']}")
            if 'translation_result' in sent and 'translation' in sent['translation_result']:
                tokens = [t['text'] for t in sent['translation_result']['translation']]
                print(f"    tokens: {tokens} (count: {len(tokens)})")
        print("✅ 句子获取成功")
        return True
    print(f"响应内容: {response.text}")
    return False

def test_check_coverage(learned_count):
    """测试覆盖度检查"""
    print(f"\n=== 测试覆盖度检查 (已学单词数: {learned_count}) ===")
    
    # 设置学习进度
    set_progress_url = f"{BASE_URL}/api/learn/{FILE_ID}/set-progress"
    response = requests.post(set_progress_url, json={"index": learned_count})
    print(f"设置进度响应: {response.status_code}")
    
    # 检查覆盖度
    check_url = f"{BASE_URL}/api/learn/{FILE_ID}/check-coverage"
    response = requests.get(check_url)
    print(f"覆盖度检查响应: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"  can_form_sentences: {data.get('can_form_sentences')}")
        print(f"  unit_completed: {data.get('unit_completed')}")
        
        if data.get('can_form_sentences'):
            print("✅ 可以生成句子翻译题")
        else:
            print("❌ 不能生成句子翻译题")
        return data
    print(f"响应内容: {response.text}")
    return None

def test_sentence_quiz():
    """测试句子翻译题生成"""
    print("\n=== 测试句子翻译题生成 ===")
    quiz_url = f"{BASE_URL}/api/learn/{FILE_ID}/sentence-quiz"
    response = requests.get(quiz_url)
    print(f"响应代码: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"  原文: {data.get('original_sentence')}")
        print(f"  正确翻译: {data.get('correct_translation')}")
        print(f"  正确tokens: {data.get('correct_tokens')}")
        print(f"  所有选项tokens: {data.get('tokens')}")
        print("✅ 句子翻译题生成成功")
        return True
    
    print(f"响应内容: {response.text}")
    return False

def test_phase2_exercises():
    """测试第二阶段练习"""
    print("\n=== 测试第二阶段练习 ===")
    
    # 获取第二阶段单元
    print("\n--- 获取第二阶段单元列表 ---")
    units_url = f"{BASE_URL}/api/{FILE_ID}/phase/2/units"
    response = requests.get(units_url)
    print(f"响应代码: {response.status_code}")
    
    if response.status_code != 200:
        print(f"响应内容: {response.text}")
        return False
    
    units_data = response.json()
    print(f"单元数: {len(units_data.get('units', []))}")
    print(f"当前单元: {units_data.get('current_unit')}")
    
    # 获取第一单元的练习
    print("\n--- 获取单元 0 的练习 ---")
    exercise_url = f"{BASE_URL}/api/{FILE_ID}/phase/2/unit/0"
    response = requests.get(exercise_url)
    print(f"响应代码: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"单元完成: {data.get('unit_complete')}")
        
        if not data.get('unit_complete'):
            print(f"练习类型: {data.get('exercise_type')}")
            print(f"练习索引: {data.get('exercise_index')}")
            
            if data.get('exercise_type') == 'masked_sentence':
                exercise_data = data.get('data', {})
                print(f"蒙版句子: {exercise_data.get('masked_sentence')}")
                print(f"答案单词: {exercise_data.get('answer_words')}")
                print(f"选项: {exercise_data.get('options')}")
                
                if exercise_data.get('options'):
                    print("✅ 填空练习有选项")
                else:
                    print("❌ 填空练习没有选项")
            return True
    print(f"响应内容: {response.text}")
    return False

def main():
    print("=== 开始测试所有修复 ===")
    
    # 1. 获取词汇表
    test_get_vocab()
    
    # 2. 获取句子
    test_get_sentences()
    
    # 3. 测试覆盖度检查 - 学1个单词
    test_check_coverage(1)
    
    # 4. 测试覆盖度检查 - 学2个单词
    coverage_data = test_check_coverage(2)
    
    # 5. 如果可以生成句子，测试句子翻译题
    if coverage_data and coverage_data.get('can_form_sentences'):
        test_sentence_quiz()
    
    # 6. 测试第二阶段练习
    test_phase2_exercises()
    
    print("\n=== 所有测试完成 ===")

if __name__ == "__main__":
    main()
