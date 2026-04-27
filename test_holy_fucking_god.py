import asyncio
import aiohttp
import json
import time

BASE_URL = "http://localhost:8000"

async def test_holy_fucking_god():
    """测试 'holy fucking god' 文本的完整流程"""
    print("=" * 60)
    print("开始测试 'holy fucking god'")
    print("=" * 60)
    
    async with aiohttp.ClientSession() as session:
        # 1. 处理文本
        print("\n1. 处理文本...")
        test_text = "holy fucking god"
        file_id = f"test_{int(time.time())}"
        
        async with session.post(
            f"{BASE_URL}/api/process",
            json={
                "file_id": file_id,
                "text": test_text,
                "source_lang": "English",
                "target_lang": "Chinese"
            }
        ) as response:
            result = await response.json()
            print(f"处理请求已发送: {result}")
            
            # 等待处理完成
            print("\n2. 等待处理完成...")
            max_wait = 60  # 最多等待60秒
            for i in range(max_wait):
                async with session.get(f"{BASE_URL}/api/{file_id}/status") as status_response:
                    status = await status_response.json()
                    print(f"  状态: {status.get('status')}, 进度: {status.get('progress', 0)}%")
                    
                    if status.get('status') == 'completed':
                        print("处理完成！")
                        break
                    elif status.get('status') == 'error':
                        print("处理出错！")
                        return False
                    
                    await asyncio.sleep(1)
            else:
                print("等待超时！")
                return False
        
        # 3. 检查生成的内容
        print("\n3. 检查生成的内容...")
        async with session.get(f"{BASE_URL}/api/{file_id}/vocabulary") as vocab_response:
            vocab = await vocab_response.json()
            print(f"词汇表数量: {len(vocab)}")
            for i, word in enumerate(vocab[:3]):  # 只显示前3个
                print(f"  {i+1}. {word.get('word')}: {word.get('context_meaning', '')}")
        
        async with session.get(f"{BASE_URL}/api/{file_id}/sentences") as sentences_response:
            sentences = await sentences_response.json()
            print(f"\n句子翻译数量: {len(sentences)}")
            for i, sent in enumerate(sentences[:3]):  # 只显示前3个
                print(f"  {i+1}. {sent.get('sentence', '')[:50]}...")
        
        # 4. 检查阶段单元
        print("\n4. 检查阶段单元...")
        
        # 阶段一
        print("\n  阶段一单元:")
        async with session.get(f"{BASE_URL}/api/{file_id}/phase/1/units") as phase1_response:
            phase1 = await phase1_response.json()
            print(f"    当前单元: {phase1.get('current_unit', 0)}")
            for i, unit in enumerate(phase1.get('units', [])):
                print(f"    单元 {i+1}: {unit.get('word_count')}个词, 完成: {unit.get('completed')}")
        
        # 阶段二
        print("\n  阶段二单元:")
        async with session.get(f"{BASE_URL}/api/{file_id}/phase/2/units") as phase2_response:
            phase2 = await phase2_response.json()
            print(f"    当前单元: {phase2.get('current_unit', 0)}")
            for i, unit in enumerate(phase2.get('units', [])):
                print(f"    单元 {i+1}: {unit.get('sentences_count')}个句, 完成: {unit.get('completed')}")
        
        # 5. 测试阶段二练习
        print("\n5. 测试阶段二练习...")
        if phase2.get('units'):
            unit_id = 0
            print(f"\n  获取单元 {unit_id + 1} 的练习:")
            
            async with session.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/{unit_id}") as exercise_response:
                exercise = await exercise_response.json()
                print(f"  练习类型: {exercise.get('exercise_type', 'unknown')}")
                print(f"  练习索引: {exercise.get('exercise_index', 0)}")
                
                if exercise.get('exercise_type') == 'masked_sentence':
                    data = exercise.get('data', {})
                    print(f"  原文: {data.get('original_sentence', '')[:50]}...")
                    print(f"  填空: {data.get('masked_sentence', '')}")
                    print(f"  答案: {data.get('answer_words', [])}")
                
                # 测试下一个练习
                print("\n  测试下一个练习:")
                async with session.post(f"{BASE_URL}/api/{file_id}/phase/2/unit/{unit_id}/next") as next_response:
                    next_result = await next_response.json()
                    print(f"  下一步结果: {next_result}")
                    
                    # 获取下一个练习
                    async with session.get(f"{BASE_URL}/api/{file_id}/phase/2/unit/{unit_id}") as exercise2_response:
                        exercise2 = await exercise2_response.json()
                        print(f"  下一个练习类型: {exercise2.get('exercise_type', 'unknown')}")
                        print(f"  练习索引: {exercise2.get('exercise_index', 0)}")
        
        print("\n" + "=" * 60)
        print("测试完成！")
        print("=" * 60)
        
        return True

if __name__ == "__main__":
    asyncio.run(test_holy_fucking_god())
