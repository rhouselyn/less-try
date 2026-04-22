import requests
import json
import time

# 测试数据
test_text = "hi bro. what's up."

def test_user_issues():
    """测试用户提到的问题"""
    print("=== 测试用户提到的问题 ===")
    
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
    
    # 4. 测试第一阶段学习
    print("4. 测试第一阶段学习...")
    for i in range(len(vocab)):
        print(f"   学习第 {i+1} 个单词...")
        word_response = requests.get(f'http://localhost:8000/api/learn/{file_id}/random-word')
        if word_response.status_code == 200:
            word_data = word_response.json()
            print(f"      单词: {word_data.get('word', 'N/A')}")
            print(f"      选项: {word_data.get('options', [])}")
            # 移动到下一个单词
            next_response = requests.post(f'http://localhost:8000/api/learn/{file_id}/next-word')
            if next_response.status_code == 200:
                print(f"      成功移动到下一个单词")
            else:
                print(f"      错误: {next_response.status_code}, {next_response.text}")
        else:
            print(f"      错误: {word_response.status_code}, {word_response.text}")
    
    # 5. 测试学习进度检查
    print("5. 测试学习进度检查...")
    progress_response = requests.get(f'http://localhost:8000/api/learn/{file_id}/progress')
    if progress_response.status_code == 200:
        progress_data = progress_response.json()
        print(f"✅ 成功获取学习进度:")
        print(f"   总单元数: {progress_data.get('total_units', 0)}")
        print(f"   当前单元: {progress_data.get('current_unit', 0)}")
        print(f"   所有单元完成: {progress_data.get('all_units_completed', False)}")
    else:
        print(f"❌ 错误: {progress_response.status_code}, {progress_response.text}")
    
    # 6. 测试翻译题生成
    print("6. 测试翻译题生成...")
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
            print("⚠️  无法生成翻译题")
    else:
        print(f"❌ 错误: {check_response.status_code}, {check_response.text}")
    
    # 7. 测试第二阶段练习
    print("7. 测试第二阶段练习...")
    phase_response = requests.get(f'http://localhost:8000/api/{file_id}/phases')
    if phase_response.status_code == 200:
        phase_data = phase_response.json()
        print(f"✅ 成功获取阶段信息:")
        for phase in phase_data.get('phases', []):
            print(f"   阶段 {phase.get('phase_number')}: {phase.get('name')}, 进度: {phase.get('progress')}")
        
        # 测试第二阶段单元
        unit_response = requests.get(f'http://localhost:8000/api/{file_id}/phase/2/unit/0')
        if unit_response.status_code == 200:
            unit_data = unit_response.json()
            print(f"✅ 成功获取第二阶段单元:")
            if 'error' in unit_data:
                print(f"   错误: {unit_data['error']}")
            elif unit_data.get('unit_complete'):
                print(f"   单元已完成")
            else:
                print(f"   练习类型: {unit_data.get('exercise_type')}")
                if 'data' in unit_data:
                    data = unit_data['data']
                    if unit_data.get('exercise_type') == 'masked_sentence':
                        print(f"   原始句子: {data.get('original_sentence', 'N/A')}")
                        print(f"   蒙版句子: {data.get('masked_sentence', 'N/A')}")
                        print(f"   正确答案: {data.get('answer_words', 'N/A')}")
                        print(f"   选项: {data.get('options', 'N/A')}")
        else:
            print(f"❌ 错误: {unit_response.status_code}, {unit_response.text}")
    else:
        print(f"❌ 错误: {phase_response.status_code}, {phase_response.text}")

if __name__ == "__main__":
    test_user_issues()
