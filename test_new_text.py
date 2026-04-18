import requests
import time

def test_process_text(text):
    # 发送处理请求
    start_time = time.time()
    response = requests.post('http://localhost:8000/api/process-text', json={
        'text': text,
        'source_language': 'en',
        'target_language': 'zh'
    })
    
    if response.status_code == 200:
        data = response.json()
        file_id = data.get('file_id')
        print(f"文本: '{text}'")
        print(f"获取到文件ID: {file_id}")
        
        # 轮询状态
        max_polls = 300
        poll_count = 0
        while poll_count < max_polls:
            poll_count += 1
            time.sleep(2)
            status_response = requests.get(f'http://localhost:8000/api/status/{file_id}')
            if status_response.status_code == 200:
                status_data = status_response.json()
                print(f"轮询 {poll_count}: {status_data['status']}")
                if status_data['status'] == 'completed':
                    print(f"处理完成，用时: {time.time() - start_time:.2f}秒")
                    print(f"词汇表长度: {len(status_data['vocab'])}")
                    print(f"句子翻译数量: {len(status_data['sentence_translations'])}")
                    return True
                elif status_data['status'] == 'error':
                    print(f"处理错误: {status_data['error']}")
                    return False
        print(f"轮询超时")
        return False
    else:
        print(f"请求失败: {response.status_code}")
        return False

def main():
    # 测试新文本
    text = "AI models generate responses and outputs based on complex algorithms and machine learning techniques, and those responses or outputs may be inaccurate, harmful, biased or indecent."
    
    print("测试新文本:")
    result = test_process_text(text)
    print(f"处理结果: {'成功' if result else '失败'}")

if __name__ == "__main__":
    main()