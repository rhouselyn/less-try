import requests
import time

def test_frontend_flow(text):
    print(f"测试文本: '{text}'")
    
    try:
        # 模拟前端的处理请求
        start_time = time.time()
        response = requests.post('http://localhost:8000/api/process-text', json={
            'text': text.strip(),
            'source_language': 'en',
            'target_language': 'zh'
        }, timeout=600)  # 10分钟超时
        
        print('API响应:', response.status_code, response.json())
        if response.status_code == 200:
            data = response.json()
            file_id = data.get('file_id')
            print('获取到文件ID:', file_id)
            
            # 模拟前端的轮询检查
            pollCount = 0
            maxPolls = 300  # 10分钟
            
            while pollCount < maxPolls:
                pollCount += 1
                print(f'第{pollCount}次轮询，文件ID: {file_id}')
                
                try:
                    status_response = requests.get(f'http://localhost:8000/api/status/{file_id}', timeout=600)
                    status = status_response.json()
                    print('状态响应:', status)
                    
                    if status['status'] == 'completed':
                        print('处理完成，词汇表长度:', len(status['vocab']))
                        print('处理用时:', time.time() - start_time, '秒')
                        return True
                    elif status['status'] == 'error':
                        print('处理错误:', status['error'])
                        return False
                    elif pollCount >= maxPolls:
                        print('轮询超时')
                        return False
                    else:
                        # 继续轮询，与前端相同的间隔
                        time.sleep(2)
                except Exception as error:
                    print('轮询错误:', error)
                    if pollCount >= maxPolls:
                        print('网络错误')
                        return False
                    else:
                        # 继续轮询
                        time.sleep(2)
        else:
            print(f'请求失败: {response.status_code}')
            return False
    except Exception as error:
        print('处理文本错误:', error)
        return False

def main():
    # 测试用户提供的文本
    text = "AI models generate responses and outputs based on complex algorithms and machine learning techniques, and those responses or outputs may be inaccurate, harmful, biased or indecent."
    
    print("测试用户提供的文本:")
    result = test_frontend_flow(text)
    print(f"处理结果: {'成功' if result else '失败'}")

if __name__ == "__main__":
    main()