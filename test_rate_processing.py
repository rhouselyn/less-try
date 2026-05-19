import asyncio
import aiohttp
import time
import json
import os
import shutil

BASE_URL = "http://localhost:8000"

async def test_rate_processing():
    async with aiohttp.ClientSession() as session:
        print("=" * 60)
        print("测试：多短句速率处理 + 退出重入续生成")
        print("=" * 60)

        print("\n[1] 提交文本（5个短句）...")
        test_text = "Hello world. Good morning. How are you. Nice day. See you later."
        async with session.post(f"{BASE_URL}/api/process-text", json={
            "text": test_text,
            "source_language": "en",
            "target_language": "zh"
        }) as resp:
            if resp.status != 200:
                print(f"  ❌ 提交失败: {resp.status}")
                text = await resp.text()
                print(f"  响应: {text[:200]}")
                return
            data = await resp.json()
            file_id = data.get("file_id")
            print(f"  ✅ 提交成功, file_id: {file_id}")

        print("\n[2] 等待句子翻译处理，监控速率...")
        app_settings = None
        async with session.get(f"{BASE_URL}/api/app-settings") as resp:
            app_settings = await resp.json()
        rpm = app_settings.get("rpm", 20)
        expected_interval = 60.0 / rpm
        print(f"  RPM={rpm}, 预期间隔={expected_interval:.1f}s/句")

        start_time = time.time()
        prev_sentence_count = 0
        sentence_times = []
        total_sentences = 0

        for check in range(60):
            await asyncio.sleep(1)
            pipeline_path = f"/workspace/data/files/{file_id}/pipeline_data.json"
            if not os.path.exists(pipeline_path):
                continue

            with open(pipeline_path) as f:
                pipeline_data = json.load(f)
            sentences = pipeline_data.get("data", [])
            total_sentences = len(sentences)
            completed = sum(1 for s in sentences if s.get("translation_result"))
            elapsed = time.time() - start_time

            if completed > prev_sentence_count:
                for _ in range(completed - prev_sentence_count):
                    sentence_times.append(elapsed)
                prev_sentence_count = completed
                print(f"  [{elapsed:.1f}s] 句子翻译: {completed}/{total_sentences}")

            if completed >= total_sentences and total_sentences > 0:
                print(f"  ✅ 所有句子翻译完成! 耗时: {elapsed:.1f}s")
                break

        if len(sentence_times) >= 2:
            intervals = [sentence_times[i] - sentence_times[i-1] for i in range(1, len(sentence_times))]
            avg_interval = sum(intervals) / len(intervals) if intervals else 0
            print(f"  句子翻译完成时刻: {[f'{t:.1f}s' for t in sentence_times]}")
            print(f"  句子翻译间隔: {[f'{i:.1f}s' for i in intervals]}")
            print(f"  平均间隔: {avg_interval:.1f}s (预期: {expected_interval:.1f}s)")
            if avg_interval <= expected_interval * 2:
                print(f"  ✅ 速率基本符合预期（并发处理，间隔应接近RPM限制）")
            else:
                print(f"  ⚠️ 速率偏慢")

        print("\n[3] 清除部分单词缓存以测试生成/暂停/继续...")
        word_cache_dir = f"/workspace/data/files/{file_id}/word_cache"
        if os.path.exists(word_cache_dir):
            cache_files = os.listdir(word_cache_dir)
            print(f"  当前缓存: {len(cache_files)} 个单词")
            keep_count = max(1, len(cache_files) // 3)
            for f in cache_files[keep_count:]:
                os.remove(os.path.join(word_cache_dir, f))
            print(f"  保留 {keep_count} 个缓存，删除 {len(cache_files) - keep_count} 个")

        print("\n[4] 启动单词详情生成...")
        async with session.post(f"{BASE_URL}/api/learn/{file_id}/start-word-gen") as resp:
            result = await resp.json()
            print(f"  启动结果: {result}")

        print("\n[5] 监控单词生成速率（每3秒一个）...")
        word_start = time.time()
        prev_cached = 0
        word_times = []
        first_new_word_time = None

        for check in range(30):
            await asyncio.sleep(2)
            if not os.path.exists(word_cache_dir):
                continue
            cached_count = len(os.listdir(word_cache_dir))
            elapsed = time.time() - word_start

            if cached_count > prev_cached:
                if first_new_word_time is None:
                    first_new_word_time = elapsed
                for _ in range(cached_count - prev_cached):
                    word_times.append(elapsed)
                prev_cached = cached_count
                print(f"  [{elapsed:.1f}s] 已缓存: {cached_count} 个单词")

            if check == 8 and cached_count > 0:
                print(f"\n[6] 测试暂停：停止单词生成（在 {cached_count} 个缓存时）...")
                async with session.post(f"{BASE_URL}/api/learn/{file_id}/stop-word-gen") as resp:
                    stop_result = await resp.json()
                    print(f"  停止结果: {stop_result}")
                break

        if len(word_times) >= 2:
            word_intervals = [word_times[i] - word_times[i-1] for i in range(1, len(word_times))]
            avg_word_interval = sum(word_intervals) / len(word_intervals) if word_intervals else 0
            print(f"  单词生成时刻: {[f'{t:.1f}s' for t in word_times]}")
            print(f"  单词生成间隔: {[f'{i:.1f}s' for i in word_intervals]}")
            print(f"  平均间隔: {avg_word_interval:.1f}s (预期: 3.0s)")
            if avg_word_interval <= 5.0:
                print(f"  ✅ 单词生成速率符合预期（每3秒启动一个新任务）")
            else:
                print(f"  ⚠️ 单词生成速率偏慢")

        await asyncio.sleep(5)
        paused_count = len(os.listdir(word_cache_dir)) if os.path.exists(word_cache_dir) else 0
        print(f"  暂停5秒后缓存数: {paused_count} (应该和停止时一样)")

        print("\n[7] 测试继续：重新启动单词生成...")
        async with session.post(f"{BASE_URL}/api/learn/{file_id}/start-word-gen") as resp:
            result = await resp.json()
            print(f"  重新启动结果: {result}")

        resume_start = time.time()
        resume_times = []
        prev_resume_count = paused_count

        for check in range(20):
            await asyncio.sleep(2)
            if not os.path.exists(word_cache_dir):
                continue
            cached_count = len(os.listdir(word_cache_dir))
            elapsed = time.time() - resume_start

            if cached_count > prev_resume_count:
                for _ in range(cached_count - prev_resume_count):
                    resume_times.append(elapsed)
                prev_resume_count = cached_count
                print(f"  [{elapsed:.1f}s] 已缓存: {cached_count} 个单词 (新增: {cached_count - paused_count})")

            vocab_data = None
            async with session.get(f"{BASE_URL}/api/vocab/{file_id}") as resp:
                if resp.status == 200:
                    vocab_data = await resp.json()
            total_vocab = len(vocab_data.get("vocab", []))

            if cached_count >= total_vocab and total_vocab > 0:
                print(f"  ✅ 继续生成后所有单词完成!")
                break

        if resume_times:
            print(f"  ✅ 继续生成成功! 新增 {len(resume_times)} 个单词")
            if len(resume_times) >= 2:
                resume_intervals = [resume_times[i] - resume_times[i-1] for i in range(1, len(resume_times))]
                print(f"  继续生成间隔: {[f'{i:.1f}s' for i in resume_intervals]}")
        else:
            print(f"  ⚠️ 继续生成未产生新单词")

        print("\n[8] 测试优先级：对未生成的单词插队...")
        vocab_data = None
        async with session.get(f"{BASE_URL}/api/vocab/{file_id}") as resp:
            if resp.status == 200:
                vocab_data = await resp.json()
        vocab = vocab_data.get("vocab", [])

        uncached_word = None
        for v in vocab:
            word = v.get("word", "")
            cache_path = os.path.join(word_cache_dir, f"{word}.json") if os.path.exists(word_cache_dir) else ""
            if not os.path.exists(cache_path):
                uncached_word = word
                break

        if uncached_word:
            print(f"  对 '{uncached_word}' 发送优先生成请求...")
            async with session.post(f"{BASE_URL}/api/learn/{file_id}/priority-word-gen", json={"word": uncached_word}) as resp:
                result = await resp.json()
                print(f"  优先请求结果: {result}")

            for _ in range(10):
                await asyncio.sleep(2)
                cache_path = os.path.join(word_cache_dir, f"{uncached_word}.json") if os.path.exists(word_cache_dir) else ""
                if os.path.exists(cache_path):
                    with open(cache_path) as f:
                        detail = json.load(f)
                    meaning = detail.get("enriched_meaning", detail.get("meaning", "N/A"))
                    print(f"  ✅ 优先生成成功! 释义: {meaning[:50]}")
                    break
            else:
                print(f"  ⚠️ 优先生成超时")
        else:
            print(f"  所有单词已缓存，跳过优先级测试")

        print("\n" + "=" * 60)
        print("测试完成!")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_rate_processing())
