#!/usr/bin/env python3
"""
测试 Phase 1 完成后单元打勾标记
"""

import sys
sys.path.insert(0, '/data/user/skills/webapp-testing/scripts')

from playwright.sync_api import sync_playwright
import time

BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"

def reset_test_data():
    """重置测试数据"""
    import requests
    import os

    data_dir = "/workspace/data/files"
    files = [f for f in os.listdir(data_dir) if f.startswith("text_")]
    if not files:
        return None

    files.sort(reverse=True)
    file_id = files[0]

    # 重置学习进度和已使用句子
    import requests
    requests.post(f"{BACKEND_URL}/api/learn/{file_id}/set-progress", json={"index": 0})
    storage_path = f"/workspace/data/files/{file_id}/used_sentences.json"
    with open(storage_path, 'w') as f:
        f.write('[]')

    print(f"已重置测试数据，file_id: {file_id}")
    return file_id

def test_phase1_unit_checkmark():
    """测试阶段一完成后单元打勾"""
    file_id = reset_test_data()
    if not file_id:
        print("没有找到测试数据")
        return

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 捕获控制台日志
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        print("\n--- 步骤 1: 进入学习页面 ---")
        page.goto(f"{FRONTEND_URL}/")
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/test_01_loading.png', full_page=True)

        # 输入文本开始学习
        print("\n--- 步骤 2: 输入学习内容 ---")
        text_input = page.locator('textarea')
        text_input.fill('hi man. what\'s up')

        # 点击处理按钮
        process_button = page.locator('button:has-text("生成学习资料")')
        if process_button.count() == 0:
            process_button = page.locator('button:has-text("处理")')
        process_button.click()

        print("等待处理完成...")
        time.sleep(10)  # 等待处理完成

        # 等待跳转到学习页面
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/test_02_learning.png', full_page=True)

        print("\n--- 步骤 3: 学习单词直到完成单元 ---")
        # 学习所有单词
        max_clicks = 20
        for i in range(max_clicks):
            try:
                # 查找学习相关的按钮
                next_button = page.locator('button:has-text("下一个"), button:has-text("next"), button:has-text("继续")')
                if next_button.count() > 0:
                    next_button.first.click()
                    print(f"点击下一个 {i+1}")
                    time.sleep(1)
                else:
                    print("没有找到下一个按钮")
                    page.screenshot(path=f'/tmp/test_step_{i}.png', full_page=True)
                    break

                # 检查是否进入句子练习
                sentence_quiz = page.locator('text=句子')
                if sentence_quiz.count() > 0:
                    print("进入句子练习")
                    page.screenshot(path=f'/tmp/test_sentence_quiz_{i}.png', full_page=True)
                    break

                # 检查是否返回单元列表
                all_units = page.locator('text=单元')
                if all_units.count() > 0:
                    print("返回单元列表")
                    page.screenshot(path='/tmp/test_all_units.png', full_page=True)
                    break

            except Exception as e:
                print(f"点击出错: {e}")
                page.screenshot(path=f'/tmp/test_error_{i}.png', full_page=True)
                break

        # 检查单元是否打勾
        print("\n--- 步骤 4: 检查单元打勾状态 ---")
        page.screenshot(path='/tmp/test_final.png', full_page=True)

        # 查找勾选图标（已完成状态）
        completed_units = page.locator('[class*="completed"], [class*="check"], svg[class*="check"]')
        print(f"找到 {completed_units.count()} 个可能表示完成的元素")

        # 打印控制台日志
        print("\n--- 控制台日志 ---")
        for log in console_logs[-20:]:
            print(log)

        browser.close()
        print("\n测试完成!")

if __name__ == "__main__":
    test_phase1_unit_checkmark()
