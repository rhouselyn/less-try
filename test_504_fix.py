import requests
import time
import threading

BASE_URL = "http://localhost:8000"
POLL_RESULTS = []

def poll_status(file_id, duration=60):
    start = time.time()
    success_count = 0
    error_count = 0
    while time.time() - start < duration:
        try:
            resp = requests.get(f"{BASE_URL}/api/status/{file_id}", timeout=5)
            if resp.status_code == 200:
                success_count += 1
                data = resp.json()
                print(f"  [轮询] 成功 - 状态: {data.get('status')}, 进度: {data.get('progress', 0)}%")
            else:
                error_count += 1
                print(f"  [轮询] 错误 - HTTP {resp.status_code}")
        except requests.exceptions.Timeout:
            error_count += 1
            print(f"  [轮询] 超时!")
        except Exception as e:
            error_count += 1
            print(f"  [轮询] 异常: {e}")
        time.sleep(2)
    POLL_RESULTS.append({"success": success_count, "error": error_count})

def test_no_504():
    print("=== 测试: LLM调用期间轮询不再504 ===")
    text = "Deploy and scale models on your GPU infrastructure of choice with NVIDIA NIM inference microservices"
    
    response = requests.post(f"{BASE_URL}/api/process-text", json={
        "text": text,
        "source_language": "en",
        "target_language": "zh"
    })
    data = response.json()
    file_id = data["file_id"]
    print(f"文件ID: {file_id}")
    
    poll_thread = threading.Thread(target=poll_status, args=(file_id, 90), daemon=True)
    poll_thread.start()
    
    max_wait = 120
    start = time.time()
    while time.time() - start < max_wait:
        try:
            status = requests.get(f"{BASE_URL}/api/status/{file_id}", timeout=5).json()
        except:
            time.sleep(2)
            continue
        
        if status.get("status") == "completed":
            print(f"\n处理完成! 词汇数: {len(status.get('vocab', []))}")
            break
        if status.get("status") == "error":
            print(f"处理出错: {status.get('error')}")
            break
        time.sleep(3)
    
    poll_thread.join(timeout=5)
    
    if POLL_RESULTS:
        result = POLL_RESULTS[0]
        print(f"\n=== 轮询统计 ===")
        print(f"  成功: {result['success']}次")
        print(f"  失败: {result['error']}次")
        if result['error'] == 0:
            print(f"  ✅ 没有轮询错误! 504问题已修复!")
        else:
            ratio = result['success'] / (result['success'] + result['error']) * 100
            print(f"  成功率: {ratio:.1f}%")
            if ratio > 80:
                print(f"  ✅ 大部分轮询成功，504问题基本修复")
            else:
                print(f"  ⚠️ 仍有较多轮询失败")

if __name__ == "__main__":
    test_no_504()
    print("\n=== 测试完成! ===")
