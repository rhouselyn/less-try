#!/usr/bin/env python3
"""
直接测试 Phase 1 完成后单元打勾的流程
使用已有的测试数据
"""

import sys
sys.path.insert(0, '/data/user/skills/webapp-testing/scripts')

from playwright.sync_api import sync_playwright
import time

BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"

def test_existing_data():
    """测试已有的数据"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 捕获控制台日志
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        print("\n--- 步骤 1: 直接访问学习页面 ---")
        page.goto(f"{FRONTEND_URL}/")
        page.wait_for_load_state('networkidle')

        # 由于已经处理过，应该可以直接看到学习界面
        # 让我们检查当前页面的状态
        print("\n--- 步骤 2: 检查当前页面元素 ---")

        # 打印所有按钮
        print('Buttons:')
        for btn in page.locator('button').all():
            print(f'  - {btn.text_content()}')

        # 打印页面标题
        print(f'\nPage title: {page.title()}')

        # 查找包含"阶段"的元素
        phase_elements = page.locator('text=阶段')
        print(f'\n找到 {phase_elements.count()} 个包含"阶段"的元素')

        # 查找包含"单元"的元素
        unit_elements = page.locator('text=单元')
        print(f'找到 {unit_elements.count()} 个包含"单元"的元素')

        page.screenshot(path='/tmp/direct_test.png', full_page=True)

        # 打印控制台日志
        print("\n--- 控制台日志 ---")
        for log in console_logs[:30]:
            print(log)

        browser.close()

def test_api_status():
    """测试 API 状态"""
    import requests
    import os

    data_dir = "/workspace/data/files"
    files = [f for f in os.listdir(data_dir) if f.startswith("text_")]
    if not files:
        print("没有找到测试数据")
        return

    files.sort(reverse=True)
    file_id = files[0]
    print(f"\n使用文件ID: {file_id}")

    # 检查 API 状态
    print("\n--- API 状态检查 ---")

    # 1. checkCoverage
    response = requests.get(f"{BACKEND_URL}/api/learn/{file_id}/check-coverage")
    print(f"checkCoverage: {response.json()}")

    # 2. 阶段一单元
    response = requests.get(f"{BACKEND_URL}/api/{file_id}/phase/1/units")
    print(f"阶段一单元: {response.json()}")

    # 3. 句子翻译题
    response = requests.get(f"{BACKEND_URL}/api/learn/{file_id}/sentence-quiz")
    if response.status_code == 200:
        data = response.json()
        print(f"句子翻译题: sentence={data.get('original_sentence')}, unit_completed={data.get('unit_completed')}")
    else:
        print(f"句子翻译题: {response.status_code} - {response.text}")

if __name__ == "__main__":
    print("=" * 60)
    print("  测试 Phase 1 完成后单元打勾")
    print("=" * 60)

    test_api_status()
    test_existing_data()

    print("\n" + "=" * 60)
    print("  测试完成")
    print("=" * 60)
