import requests
import time

BASE_URL = "http://localhost:8000"

# 测试用例：输入"hi bro"，学习语言为中文，母语为英文
def test_sentence_quiz():
    print("=== 测试句子翻译题生成问题 ===")
    
    # 1. 处理文本
    text = "hi bro"
    source_lang = "en"
    target_lang = "zh"
    
    print(f"输入文本: {text}")
    print(f"源语言: {source_lang}")
    print(f"目标语言: {target_lang}")
    
    response = requests.post(f"{BASE_URL}/api/process-text", json={
        "text": text,
        "source_language": source_lang,
        "target_language": target_lang
    })
    
    if response.status_code != 200:
        print(f"错误: {response.status_code} - {response.text}")
        return False
    
    file_id = response.json().get("file_id")
    print(f"文件ID: {file_id}")
    
    # 2. 轮询处理状态
    max_polls = 60
    poll_count = 0
    
    while poll_count < max_polls:
        time.sleep(1)
        poll_count += 1
        
        status_response = requests.get(f"{BASE_URL}/api/status/{file_id}")
        if status_response.status_code != 200:
            print(f"状态查询错误: {status_response.status_code} - {status_response.text}")
            return False
        
        status_data = status_response.json()
        print(f"处理状态: {status_data.get('status')}, 进度: {status_data.get('progress', 0)}%")
        
        if status_data.get('status') == 'completed':
            break
    
    if status_data.get('status') != 'completed':
        print("处理未完成")
        return False
    
    # 3. 检查覆盖度
    coverage_response = requests.get(f"{BASE_URL}/api/learn/{file_id}/check-coverage")
    if coverage_response.status_code != 200:
        print(f"检查覆盖度错误: {coverage_response.status_code} - {coverage_response.text}")
        return False
    
    coverage_data = coverage_response.json()
    print("\n覆盖度检查结果:")
    print(f"can_form_sentences: {coverage_data.get('can_form_sentences')}")
    print(f"unit_completed: {coverage_data.get('unit_completed')}")
    
    # 4. 尝试生成句子翻译题
    if coverage_data.get('can_form_sentences'):
        quiz_response = requests.get(f"{BASE_URL}/api/learn/{file_id}/sentence-quiz")
        if quiz_response.status_code != 200:
            print(f"生成句子翻译题错误: {quiz_response.status_code} - {quiz_response.text}")
            return False
        
        quiz_data = quiz_response.json()
        print("\n句子翻译题数据:")
        print(quiz_data)
    else:
        print("\n无法生成句子翻译题，因为can_form_sentences为false")
    
    return True

if __name__ == "__main__":
    print("开始测试...")
    success = test_sentence_quiz()
    print(f"\n测试结果: {'成功' if success else '失败'}")
