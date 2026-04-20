import sys
import os

# 添加backend目录到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from nvidia_api import NvidiaAPI

async def test_generate_multiple_choice():
    print("=== 测试 generate_multiple_choice 方法 ===")
    
    nvidia_api = NvidiaAPI()
    
    # 测试用例：word='bro', correct_meaning='兄弟', context='hi bro', target_lang='zh'
    word = "bro"
    correct_meaning = "兄弟"
    context = "hi bro"
    target_lang = "zh"
    
    print(f"测试参数:")
    print(f"word: {word}")
    print(f"correct_meaning: {correct_meaning}")
    print(f"context: {context}")
    print(f"target_lang: {target_lang}")
    
    try:
        result = await nvidia_api.generate_multiple_choice(
            word,
            correct_meaning,
            context,
            target_lang
        )
        
        print("\n返回结果:")
        print(f"类型: {type(result)}")
        print(f"键: {list(result.keys())}")
        print(f"multiple_choice 键: {list(result.get('multiple_choice', {}).keys())}")
        if 'multiple_choice' in result and 'options' in result['multiple_choice']:
            print(f"选项数量: {len(result['multiple_choice']['options'])}")
            for i, opt in enumerate(result['multiple_choice']['options']):
                print(f"选项 {i+1}: {opt.get('text')}, is_correct: {opt.get('is_correct')}")
        else:
            print("没有 multiple_choice.options 字段")
        
        print(f"memory_hint: {result.get('memory_hint', '无')}")
        
    except Exception as e:
        print(f"错误: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_generate_multiple_choice())
