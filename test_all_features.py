import requests
import json
import time

BASE_URL = "http://localhost:8000"

# 测试文本
TEST_TEXT = "I'm good, don't worry."

# 测试1: 处理文本
def test_process_text():
    print("=== 测试1: 处理文本 ===")
    url = f"{BASE_URL}/api/process-text"
    data = {
        "text": TEST_TEXT,
        "source_lang": "en",
        "target_lang": "zh"
    }
    response = requests.post(url, json=data)
    print(f"状态码: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"文件ID: {result.get('file_id')}")
        return result.get('file_id')
    else:
        print(f"错误: {response.text}")
        return None

# 测试2: 查询状态
def test_get_status(file_id):
    print("\n=== 测试2: 查询状态 ===")
    url = f"{BASE_URL}/api/status/{file_id}"
    for i in range(30):  # 最多轮询30次
        response = requests.get(url)
        status = response.json()
        print(f"状态: {status.get('status')}, 进度: {status.get('progress')}%")
        if status.get('status') == 'completed':
            print("处理完成！")
            return status
        time.sleep(2)
    return None

# 测试3: 查询词汇表
def test_vocab(file_id):
    print("\n=== 测试3: 查询词汇表 ===")
    url = f"{BASE_URL}/api/vocab/{file_id}"
    response = requests.get(url)
    print(f"状态码: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        vocab = result.get('vocab', [])
        print(f"词汇表长度: {len(vocab)}")
        for word in vocab:
            print(f"- {word.get('word')}: {word.get('translation')}")
        return vocab
    else:
        print(f"错误: {response.text}")
        return []

# 测试4: 测试第一阶段翻译题
def test_phase1_translation(file_id):
    print("\n=== 测试4: 测试第一阶段翻译题 ===")
    # 先学习几个单词
    for i in range(2):
        # 获取随机单词
        url = f"{BASE_URL}/api/learn/{file_id}/random-word"
        response = requests.get(url)
        if response.status_code == 200:
            word_data = response.json()
            print(f"学习单词: {word_data.get('word')}")
        else:
            print(f"获取单词错误: {response.text}")
        
        # 标记为已学
        url = f"{BASE_URL}/api/learn/{file_id}/next"
        response = requests.get(url)
        if response.status_code == 200:
            result = response.json()
            print(f"学习进度: {result.get('new_index')}")
        else:
            print(f"更新进度错误: {response.text}")
    
    # 检查是否可以生成翻译题
    url = f"{BASE_URL}/api/learn/{file_id}/check-coverage"
    response = requests.get(url)
    print(f"覆盖度检查状态码: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"是否可以生成句子: {result.get('can_form_sentences')}")
        if result.get('can_form_sentences'):
            # 生成翻译题
            url = f"{BASE_URL}/api/learn/{file_id}/sentence-quiz"
            response = requests.get(url)
            print(f"生成翻译题状态码: {response.status_code}")
            if response.status_code == 200:
                quiz_data = response.json()
                print(f"翻译题生成成功: {quiz_data.get('sentence')}")
            else:
                print(f"生成翻译题错误: {response.text}")

# 测试5: 测试token卡片例句
def test_word_detail(file_id, word):
    print(f"\n=== 测试5: 测试单词 '{word}' 的详情 ===")
    url = f"{BASE_URL}/api/word/{file_id}/{word}"
    response = requests.get(url)
    print(f"状态码: {response.status_code}")
    if response.status_code == 200:
        word_detail = response.json()
        print(f"单词: {word_detail.get('word')}")
        print(f"释义: {word_detail.get('meaning')}")
        print(f"例句数量: {len(word_detail.get('examples', []))}")
        for i, example in enumerate(word_detail.get('examples', [])):
            print(f"  例句 {i+1}: {example.get('sentence')}")
            print(f"  翻译: {example.get('translation')}")
        print(f"上下文句子数量: {len(word_detail.get('context_sentences', []))}")
        for i, ctx in enumerate(word_detail.get('context_sentences', [])):
            if isinstance(ctx, dict):
                print(f"  上下文 {i+1}: {ctx.get('sentence')}")
                print(f"  翻译: {ctx.get('translation')}")
            else:
                print(f"  上下文 {i+1}: {ctx}")
    else:
        print(f"错误: {response.text}")

# 测试6: 测试第二阶段填空练习
def test_phase2_exercises(file_id):
    print("\n=== 测试6: 测试第二阶段填空练习 ===")
    # 获取阶段信息
    url = f"{BASE_URL}/api/phases/{file_id}"
    response = requests.get(url)
    print(f"获取阶段状态码: {response.status_code}")
    if response.status_code == 200:
        phases_data = response.json()
        print(f"阶段数量: {len(phases_data.get('phases', []))}")
        
        # 获取第二阶段单元
        url = f"{BASE_URL}/api/2/units/{file_id}"
        response = requests.get(url)
        print(f"获取单元状态码: {response.status_code}")
        if response.status_code == 200:
            units_data = response.json()
            print(f"第二阶段单元数量: {len(units_data.get('units', []))}")
            
            # 测试第一个单元
            if units_data.get('units'):
                unit_id = units_data.get('units')[0].get('unit_id')
                url = f"{BASE_URL}/api/{file_id}/phase/2/unit/{unit_id}"
                response = requests.get(url)
                print(f"获取单元练习状态码: {response.status_code}")
                if response.status_code == 200:
                    exercise_data = response.json()
                    if not exercise_data.get('unit_complete'):
                        print(f"练习类型: {exercise_data.get('exercise_type')}")
                        if exercise_data.get('exercise_type') == 'masked_sentence':
                            print(f"蒙版句子: {exercise_data.get('data', {}).get('masked_sentence')}")
                            print(f"正确答案: {exercise_data.get('data', {}).get('answer_words')}")
                            print(f"选项: {exercise_data.get('data', {}).get('options')}")

# 主函数
def main():
    try:
        # 测试1: 处理文本
        file_id = test_process_text()
        if not file_id:
            print("错误: 没有获取到file_id")
            return
        
        # 测试2: 查询状态直到完成
        status = test_get_status(file_id)
        if not status:
            print("错误: 处理超时")
            return
        
        # 测试3: 查询词汇表
        vocab = test_vocab(file_id)
        if not vocab:
            print("错误: 词汇表为空")
            return
        
        # 测试4: 测试第一阶段翻译题
        test_phase1_translation(file_id)
        
        # 测试5: 测试token卡片例句
        for word in ['i', 'm', 'good', 'don', 't', 'worry']:
            test_word_detail(file_id, word)
        
        # 测试6: 测试第二阶段填空练习
        test_phase2_exercises(file_id)
        
        print("\n=== 所有测试完成！ ===")
    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
