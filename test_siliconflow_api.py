#!/usr/bin/env python3
"""
测试 SiliconFlow API
"""

import requests
import json

def test_siliconflow_api():
    """测试 SiliconFlow API"""
    
    print("=" * 60)
    print("测试 SiliconFlow API")
    print("=" * 60)
    
    api_key = "sk-tszhvcglvfqiivwqqtqwkxmxsneyuymjjywtfxteofmfvkct"
    base_url = "https://api.siliconflow.cn/v1"
    model = "Qwen/Qwen3.6-27B"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": "Hello, how are you?"}
        ],
        "temperature": 0.0,
        "max_tokens": 100
    }
    
    print(f"\nAPI URL: {base_url}/chat/completions")
    print(f"Model: {model}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        print("\n发送请求...")
        response = requests.post(
            f"{base_url}/chat/completions",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        
    except requests.exceptions.Timeout:
        print("\n❌ 请求超时!")
    except requests.exceptions.RequestException as e:
        print(f"\n❌ 请求失败: {e}")
    except Exception as e:
        print(f"\n❌ 错误: {e}")

if __name__ == "__main__":
    test_siliconflow_api()
