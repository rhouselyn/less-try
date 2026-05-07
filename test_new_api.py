#!/usr/bin/env python3
"""
测试新API渠道是否正常工作
"""

import asyncio
import sys
sys.path.insert(0, '/workspace/backend')

from nvidia_api import NvidiaAPI

async def test_api():
    """测试新API渠道"""
    print("=" * 60)
    print("测试新API渠道")
    print("=" * 60)
    
    api = NvidiaAPI()
    
    print(f"\nAPI配置:")
    print(f"  base_url: {api.base_url}")
    print(f"  api_key: {api.api_key[:10]}...")
    
    # 测试简单请求
    print("\n测试API请求...")
    try:
        messages = [
            {"role": "user", "content": "Hello, how are you?"}
        ]
        
        response = await api.call_minimax(messages)
        print("✓ API请求成功!")
        print(f"响应类型: {type(response)}")
        
        if isinstance(response, dict):
            if "choices" in response:
                content = response["choices"][0]["message"].get("content", "")
                print(f"响应内容: {content[:100]}...")
            elif "error" in response:
                print(f"✗ API错误: {response.get('error', {}).get('message', 'Unknown error')}")
        else:
            print(f"响应内容: {str(response)[:200]}...")
            
    except Exception as e:
        print(f"✗ API请求失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_api())
