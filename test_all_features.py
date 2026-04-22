import requests
import json
import time

# 测试数据
test_text = "I'm good, don't worry. I'm fine."

def test_all_features():
    """测试所有功能修复"""
    print("=== 测试所有功能修复 ===")
    
    # 1. 处理文本
    print("1. 处理文本...")
    response = requests.post('http://localhost:8000/api/process-text', json={
        "text": test_text,
        "source_language": "en",
        "target_language": "zh"
    })
    
    if response.status_code != 200:
        print(f"错误: {response.status_code}, {response.text}")
        return
    
    file_id = response.json()['file_id']
    print(f"文件ID: {file_id}")
    
    # 2. 等待处理完成
    print("2. 等待处理完成...")
    for _ in range(30):
        status_response = requests.get(f'http://localhost:8000/api/status/{file_id}')
        status_data = status_response.json()
        if status_data['status'] == 'completed':
            print("处理完成！")
            break
        elif status_data['status'] == 'error':
            print(f"处理错误: {status_data.get('error', 'Unknown error')}")
            return
        time.sleep(1)
    else:
        print("处理超时")
        return
    
    # 3. 测试词汇表
    print("3. 测试词汇表...")
    vocab_response = requests.get(f'http://localhost:8000/api/vocab/{file_id}')
    if vocab_response.status_code == 200:
        vocab_data = vocab_response.json()
        vocab = vocab_data.get('vocab', [])
        print(f"✅ 成功获取词汇表，共 {len(vocab)} 个单词")
        for word in vocab:
            print(f"   - {word.get('word', 'N/A')}")
    else:
        print(f"❌ 错误: {vocab_response.status_code}, {vocab_response.text}")
    
    # 4. 测试填空练习选项生成
    print("4. 测试填空练习选项生成...")
    phase_response = requests.get(f'http://localhost:8000/api/{file_id}/phase/2/unit/0')
    
    if phase_response.status_code == 200:
        phase_data = phase_response.json()
        if 'error' in phase_data:
            print(f"❌ 错误: {phase_data['error']}")
        else:
            exercise_type = phase_data.get('exercise_type')
            if exercise_type == 'masked_sentence':
                data = phase_data.get('data', {})
                original_sentence = data.get('original_sentence', '')
                masked_sentence = data.get('masked_sentence', '')
                answer_words = data.get('answer_words', [])
                options = data.get('options', [])
                
                print(f"✅ 成功生成填空练习:")
                print(f"   原始句子: {original_sentence}")
                print(f"   蒙版句子: {masked_sentence}")
                print(f"   正确答案: {answer_words}")
                print(f"   选项: {options}")
                
                # 验证选项不包含当前句子的单词
                import re
                sentence_words = set(word.lower() for word in re.findall(r"\b\w+(?:'\w+)?\b", original_sentence))
                invalid_options = []
                for option in options:
                    option_lower = option.lower()
                    if option_lower in sentence_words and option not in answer_words:
                        invalid_options.append(option)
                
                if invalid_options:
                    print(f"❌ 错误: 选项包含当前句子的单词: {invalid_options}")
                else:
                    print("✅ 正确: 选项不包含当前句子的单词")
            else:
                print(f"⚠️  不是填空练习，类型: {exercise_type}")
    else:
        print(f"❌ 错误: {phase_response.status_code}, {phase_response.text}")
    
    # 5. 测试单词查询功能
    print("5. 测试单词查询功能...")
    test_words = ["I'm", "don't", "good"]
    for word in test_words:
        word_response = requests.get(f'http://localhost:8000/api/word/{file_id}/{word.replace("'", "%27")}')
        if word_response.status_code == 200:
            word_data = word_response.json()
            print(f"✅ 成功查询到 '{word}' 的详情:")
            print(f"   单词: {word_data.get('word', 'N/A')}")
            print(f"   释义: {word_data.get('meaning', 'N/A')}")
            if word_data.get('variants_detail', []):
                print(f"   变体: {[v['form'] for v in word_data['variants_detail']]}")
        else:
            print(f"❌ 错误: {word_response.status_code}, {word_response.text}")
    
    # 6. 测试学习进度检查
    print("6. 测试学习进度检查...")
    progress_response = requests.get(f'http://localhost:8000/api/learn/{file_id}/progress')
    if progress_response.status_code == 200:
        progress_data = progress_response.json()
        print(f"✅ 成功获取学习进度:")
        print(f"   总单元数: {progress_data.get('total_units', 0)}")
        print(f"   当前单元: {progress_data.get('current_unit', 0)}")
        print(f"   所有单元完成: {progress_data.get('all_units_completed', False)}")
    else:
        print(f"❌ 错误: {progress_response.status_code}, {progress_response.text}")
    
    # 7. 测试翻译题生成
    print("7. 测试翻译题生成...")
    # 先设置学习进度为2，确保可以生成翻译题
    set_progress_response = requests.post(f'http://localhost:8000/api/learn/{file_id}/set-progress', json={"index": 2})
    if set_progress_response.status_code == 200:
        print("✅ 成功设置学习进度")
        # 检查是否可以生成翻译题
        check_response = requests.get(f'http://localhost:8000/api/learn/{file_id}/check-coverage')
        if check_response.status_code == 200:
            check_data = check_response.json()
            print(f"✅ 检查覆盖情况:")
            print(f"   可以生成句子: {check_data.get('can_form_sentences', False)}")
            print(f"   单元完成: {check_data.get('unit_completed', False)}")
            
            if check_data.get('can_form_sentences'):
                # 生成翻译题
                quiz_response = requests.get(f'http://localhost:8000/api/learn/{file_id}/sentence-quiz')
                if quiz_response.status_code == 200:
                    quiz_data = quiz_response.json()
                    print(f"✅ 成功生成翻译题:")
                    print(f"   原始句子: {quiz_data.get('original_sentence', 'N/A')}")
                    print(f"   正确翻译: {quiz_data.get('correct_translation', 'N/A')}")
                    print(f"   正确tokens: {quiz_data.get('correct_tokens', 'N/A')}")
                    print(f"   所有tokens: {quiz_data.get('tokens', 'N/A')}")
                else:
                    print(f"❌ 错误: {quiz_response.status_code}, {quiz_response.text}")
        else:
            print(f"❌ 错误: {check_response.status_code}, {check_response.text}")
    else:
        print(f"❌ 错误: {set_progress_response.status_code}, {set_progress_response.text}")

if __name__ == "__main__":
    test_all_features()
