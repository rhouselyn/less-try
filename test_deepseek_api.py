#!/usr/bin/env python3
"""
测试 DeepSeek API
"""

import requests
import json

def test_deepseek_api():
    """测试 DeepSeek API"""
    
    print("=" * 60)
    print("测试 DeepSeek API")
    print("=" * 60)
    
    api_key = "sk-tszhvcglvfqiivwqqtqwkxmxsneyuymjjywtfxteofmfvkct"
    base_url = "https://api.siliconflow.cn/v1"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "deepseek-ai/DeepSeek-V4-Flash",
        "messages": [
            {"role": "user", "content": "Say 'Hello' in Chinese"}
        ],
        "temperature": 0.0,
        "max_tokens": 100
    }
    
    print(f"Model: deepseek-ai/DeepSeek-V4-Flash")
    
    try:
        print("\n发送请求...")
        response = requests.post(
            f"{base_url}/chat/completions",
            headers=headers,
            json=payload,
            timeout=60
        )
        
        print(f"状态码: {response.status_code}")
        result = response.json()
        
        if "choices" in result and len(result["choices"]) > 0:
            choice = result["choices"][0]
            msg = choice.get("message", {})
            content = msg.get("content", "")
            print(f"响应内容: {content}")
            
            if content:
                print("\n✓ API 正常工作!")
            else:
                print("\n✗ 没有 content 内容")
                print(f"完整响应: {json.dumps(result, indent=2)[:500]}")
        else:
            print(f"响应: {json.dumps(result, indent=2)[:500]}")
                
    except Exception as e:
        print(f"\n错误: {e}")

if __name__ == "__main__":
    test_deepseek_api()
