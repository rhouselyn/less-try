import requests
import json
import time

# 测试数据
test_text = "I'm good, don't worry. I'm fine."

def test_masked_sentence_generation():
    """测试填空练习选项生成"""
    print("=== 测试填空练习选项生成 ===")
    
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
    
    # 3. 获取句子数据
    print("3. 获取句子数据...")
    sentences_response = requests.get(f'http://localhost:8000/api/sentences/{file_id}')
    sentences_data = sentences_response.json()
    sentences = sentences_data.get('sentences', [])
    
    if not sentences:
        print("没有句子数据")
        return
    
    print(f"找到 {len(sentences)} 个句子")
    for i, sentence_data in enumerate(sentences):
        print(f"句子 {i+1}: {sentence_data.get('sentence', '')}")
    
    # 4. 测试阶段二练习（填空练习）
    print("4. 测试阶段二练习...")
    phase_response = requests.get(f'http://localhost:8000/api/{file_id}/phase/2/unit/0')
    
    if phase_response.status_code != 200:
        print(f"错误: {phase_response.status_code}, {phase_response.text}")
        return
    
    phase_data = phase_response.json()
    if 'error' in phase_data:
        print(f"错误: {phase_data['error']}")
        return
    
    if phase_data.get('unit_complete'):
        print("单元已完成")
        return
    
    exercise_type = phase_data.get('exercise_type')
    print(f"练习类型: {exercise_type}")
    
    if exercise_type == 'masked_sentence':
        data = phase_data.get('data', {})
        original_sentence = data.get('original_sentence', '')
        masked_sentence = data.get('masked_sentence', '')
        answer_words = data.get('answer_words', [])
        options = data.get('options', [])
        
        print(f"原始句子: {original_sentence}")
        print(f"蒙版句子: {masked_sentence}")
        print(f"正确答案: {answer_words}")
        print(f"选项: {options}")
        
        # 验证选项不包含当前句子的单词
        print("5. 验证选项...")
        sentence_words = set(word.lower() for word in original_sentence.split())
        print(f"当前句子的单词: {sentence_words}")
        
        invalid_options = []
        for option in options:
            option_lower = option.lower()
            if option_lower in sentence_words:
                invalid_options.append(option)
        
        if invalid_options:
            print(f"❌ 错误: 选项包含当前句子的单词: {invalid_options}")
        else:
            print("✅ 正确: 选项不包含当前句子的单词")
        
        # 验证正确答案在选项中
        for answer in answer_words:
            if answer not in options:
                print(f"❌ 错误: 正确答案 {answer} 不在选项中")
            else:
                print(f"✅ 正确: 正确答案 {answer} 在选项中")
    else:
        print("不是填空练习，跳过验证")

if __name__ == "__main__":
    test_masked_sentence_generation()
