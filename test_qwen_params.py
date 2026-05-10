#!/usr/bin/env python3
"""
测试 Qwen 模型的不同参数
"""

import requests
import json

def test_qwen_params():
    """测试 Qwen 模型的不同参数"""
    
    api_key = "sk-tszhvcglvfqiivwqqtqwkxmxsneyuymjjywtfxteofmfvkct"
    base_url = "https://api.siliconflow.cn/v1"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    messages = [
        {"role": "user", "content": "Say 'Hello' in Chinese"}
    ]
    
    test_cases = [
        {"name": "默认", "params": {}},
        {"name": "禁用思考", "params": {"thinking": {"type": "disabled"}}},
        {"name": "不启用思考", "params": {"enable_thinking": False}},
        {"name": "max_tokens大一点", "params": {"max_tokens": 500}},
    ]
    
    for test in test_cases:
        print(f"\n{'='*60}")
        print(f"测试: {test['name']}")
        print(f"{'='*60}")
        
        payload = {
            "model": "Qwen/Qwen3.6-27B",
            "messages": messages,
            "temperature": 0.0,
            "max_tokens": 200
        }
        payload.update(test["params"])
        
        try:
            response = requests.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                choice = result["choices"][0]
                msg = choice.get("message", {})
                content = msg.get("content", "")
                reasoning = msg.get("reasoning_content", "")
                
                print(f"content: {content[:200] if content else '(empty)'}")
                print(f"reasoning_content: {reasoning[:200] if reasoning else '(empty)'}")
                
                if content:
                    print(f"\n✓ 有 content 内容")
                else:
                    print(f"\n✗ 没有 content 内容")
            else:
                print(f"响应: {json.dumps(result, indent=2)[:500]}")
                
        except Exception as e:
            print(f"错误: {e}")

if __name__ == "__main__":
    test_qwen_params()
