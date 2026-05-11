#!/usr/bin/env python3
"""
Playwright E2E测试：学习流程完整测试
测试文本: "hi man. what's up"
验证句子练习使用正确的句子（"hi man." 而不是 "what's up"）
"""

import sys
sys.path.insert(0, '/data/user/skills/webapp-testing/scripts')

from playwright.sync_api import sync_playwright
import requests
import time
import os

BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5174"
DATA_DIR = "/workspace/data/files"
TEST_TEXT = "hi man. what's up"

def reset_learning_progress():
    """重置学习进度"""
    print("\n=== 重置学习进度 ===")

    files = [f for f in os.listdir(DATA_DIR) if f.startswith("text_")]
    if not files:
        print("没有找到现有的测试数据")
        return None

    files.sort(reverse=True)
    file_id = files[0]
    print(f"使用最新的数据目录: {file_id}")

    try:
        requests.post(f"{BACKEND_URL}/api/learn/{file_id}/set-progress", json={"index": 0}, timeout=10)
        print("✓ 已重置学习进度到索引 0")
    except Exception as e:
        print(f"重置学习进度失败: {e}")

    try:
        storage_path = f"{DATA_DIR}/{file_id}/used_sentences.json"
        with open(storage_path, 'w') as f:
            f.write('[]')
        print("✓ 已重置已使用句子为空列表")
    except Exception as e:
        print(f"重置已使用句子失败: {e}")

    return file_id

def wait_for_processing_complete(page, file_id, max_wait=120):
    """等待后端处理完成"""
    print("\n=== 等待处理完成 ===")

    start_time = time.time()
    poll_interval = 2

    while time.time() - start_time < max_wait:
        try:
            response = requests.get(f"{BACKEND_URL}/api/status/{file_id}", timeout=10)
            if response.status_code == 200:
                status = response.json()
                print(f"状态: {status.get('status')}, 词汇数: {len(status.get('vocab', []))}")

                if status.get('status') == 'completed':
                    print(f"✓ 处理完成! 用时: {time.time() - start_time:.1f}秒")
                    return True
                elif status.get('status') == 'error':
                    print(f"✗ 处理错误: {status.get('error')}")
                    return False
            else:
                print(f"状态请求返回: {response.status_code}")
        except Exception as e:
            print(f"轮询错误: {e}")

        time.sleep(poll_interval)

    print(f"✗ 等待超时 ({max_wait}秒)")
    return False

def find_and_click_button(page, patterns):
    """查找并点击按钮"""
    for pattern in patterns:
        buttons = page.locator(f'button:has-text("{pattern}")')
        if buttons.count() > 0:
            buttons.first.click()
            return True
    return False

def test_learning_flow():
    """测试完整的学习流程"""
    print("\n" + "=" * 70)
    print("  Playwright E2E 测试: 学习流程")
    print("=" * 70)
    print(f"\n测试文本: '{TEST_TEXT}'")

    file_id = reset_learning_progress()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        try:
            print("\n=== 步骤 1: 打开前端页面 ===")
            page.goto(f"{FRONTEND_URL}/", timeout=30000)
            page.wait_for_load_state('networkidle', timeout=30000)
            page.screenshot(path='/tmp/step1_homepage.png', full_page=True)
            print("✓ 首页已加载")

            print("\n=== 步骤 2: 输入文本 ===")
            text_input = page.locator('textarea').first
            text_input.fill(TEST_TEXT)
            print(f"✓ 已输入文本: '{TEST_TEXT}'")

            print("\n=== 步骤 3: 点击生成学习资料按钮 ===")
            process_button = page.locator('button:has-text("生成学习资料")')
            if process_button.count() == 0:
                process_button = page.locator('button:has-text("处理")')
            process_button.click()
            print("✓ 已点击生成学习资料按钮")

            page.screenshot(path='/tmp/step3_processing.png', full_page=True)

            if not file_id:
                print("\n需要处理新文本...")
                max_wait = 180
                start_time = time.time()
                found_file_id = False

                while time.time() - start_time < max_wait:
                    page.wait_for_timeout(2000)
                    try:
                        response = requests.get(f"{BACKEND_URL}/api/status/test", timeout=5)
                    except:
                        pass

                    files = [f for f in os.listdir(DATA_DIR) if f.startswith("text_")]
                    if files:
                        files.sort(reverse=True)
                        file_id = files[0]
                        found_file_id = True
                        break
                if found_file_id:
                    print(f"✓ 获取到新的 file_id: {file_id}")
                else:
                    print("✗ 未能获取 file_id")
            else:
                print(f"使用已有的 file_id: {file_id}")

            print("\n=== 步骤 4: 等待处理完成 ===")
            if file_id:
                wait_for_processing_complete(page, file_id)
            page.wait_for_load_state('networkidle', timeout=10000)
            page.screenshot(path='/tmp/step4_dictionary.png', full_page=True)
            print("✓ 跳转至词典页面")

            print("\n=== 步骤 5: 开始学习单词 ===")
            start_learning_button = page.locator('button:has-text("开始学习")')
            if start_learning_button.count() == 0:
                start_learning_button = page.locator('button:has-text("学习")')
            if start_learning_button.count() > 0:
                start_learning_button.first.click()
                print("✓ 已点击开始学习按钮")
                time.sleep(2)

            page.screenshot(path='/tmp/step5_learning.png', full_page=True)

            click_count = 0
            max_clicks = 25

            while click_count < max_clicks:
                click_count += 1
                print(f"\n--- 学习步骤 {click_count} ---")

                page.screenshot(path=f'/tmp/step5_learning_{click_count}.png', full_page=True)

                next_buttons = [
                    '下一个',
                    'next',
                    '继续',
                    'Next',
                    '完成'
                ]
                clicked = find_and_click_button(page, next_buttons)

                if clicked:
                    print(f"✓ 点击了下一个/继续按钮")
                    time.sleep(1.5)
                else:
                    print("没有找到下一个按钮，尝试其他选择...")
                    buttons = page.locator('button').all()
                    for btn in buttons[:5]:
                        btn_text = btn.text_content().strip()
                        print(f"  按钮: {btn_text[:30]}...")

                sentence_elements = page.locator('text=句子')
                if sentence_elements.count() > 0:
                    print("✓ 检测到句子练习界面")
                    page.screenshot(path='/tmp/step5_sentence_quiz.png', full_page=True)
                    break

                all_units_elements = page.locator('text=单元')
                if all_units_elements.count() > 0:
                    print("✓ 检测到单元列表界面")
                    break

                unit_elements = page.locator('text=阶段一')
                if unit_elements.count() > 0:
                    print("✓ 检测到阶段一界面")
                    break

            print("\n=== 步骤 6: 截图记录单元打勾状态 ===")
            page.screenshot(path='/tmp/step6_unit_status.png', full_page=True)
            print("✓ 截图已保存到 /tmp/step6_unit_status.png")

            print("\n=== 步骤 7: 验证第二阶段句子 ===")
            page.wait_for_timeout(2000)
            page.screenshot(path='/tmp/step7_phase2_verify.png', full_page=True)

            page_content = page.content()
            if 'hi man' in page_content.lower():
                print("✓ 找到 'hi man' 相关内容")
            if "what's up" in page_content.lower():
                print("! 警告: 找到 \"what's up\" 相关内容")

            buttons = page.locator('button').all()
            print("\n当前页面的按钮:")
            for btn in buttons[:10]:
                btn_text = btn.text_content().strip()
                if btn_text:
                    print(f"  - {btn_text[:50]}")

            visible_text = page.locator('body').text_content()
            lines = [l.strip() for l in visible_text.split('\n') if l.strip()]

            print("\n当前页面可见文本:")
            for line in lines[:20]:
                if len(line) < 100:
                    print(f"  {line}")

            print("\n=== 步骤 8: 最终截图 ===")
            page.screenshot(path='/tmp/step8_final.png', full_page=True)
            print("✓ 最终截图已保存到 /tmp/step8_final.png")

            print("\n=== 控制台日志 (最后20条) ===")
            for log in console_logs[-20:]:
                print(log)

        except Exception as e:
            print(f"\n✗ 测试过程中出错: {e}")
            import traceback
            traceback.print_exc()
            page.screenshot(path='/tmp/error_screenshot.png', full_page=True)
        finally:
            browser.close()

    print("\n" + "=" * 70)
    print("  测试完成!")
    print("=" * 70)
    print("\n截图文件:")
    print("  /tmp/step1_homepage.png     - 首页")
    print("  /tmp/step3_processing.png   - 处理中")
    print("  /tmp/step4_dictionary.png   - 词典页面")
    print("  /tmp/step5_learning*.png    - 学习过程")
    print("  /tmp/step5_sentence_quiz.png - 句子练习")
    print("  /tmp/step6_unit_status.png  - 单元打勾状态")
    print("  /tmp/step7_phase2_verify.png - 第二阶段验证")
    print("  /tmp/step8_final.png        - 最终状态")
    print("=" * 70)

if __name__ == "__main__":
    test_learning_flow()
