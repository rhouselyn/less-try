#!/usr/bin/env python3
"""
通过浏览器自动化测试 word_count >= 2 的逻辑
"""

from playwright.sync_api import sync_playwright
import time
import requests

FRONTEND_URL = "http://localhost:3001"
BACKEND_URL = "http://localhost:8000"

def reset_data():
    """重置测试数据"""
    import os
    import json
    
    # 删除旧数据
    data_dir = "/workspace/data/files"
    if os.path.exists(data_dir):
        for f in os.listdir(data_dir):
            if f.startswith("text_"):
                import shutil
                shutil.rmtree(f"{data_dir}/{f}")
                print(f"删除旧数据: {f}")

def test_phase2_word_count_filter():
    """测试第二阶段 word_count >= 2 的过滤逻辑"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # 捕获控制台日志
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        
        print("\n=== 步骤 1: 打开学习页面 ===")
        page.goto(FRONTEND_URL)
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/phase2_test_01.png')
        
        print("\n=== 步骤 2: 输入测试文本 ===")
        # 输入包含单词数不同的句子
        text_input = page.locator('textarea')
        text_input.fill("hi man. what's up. hello world. good morning everyone.")
        
        print("\n=== 步骤 3: 点击处理按钮 ===")
        process_btn = page.locator('button:has-text("生成学习资料")')
        process_btn.click()
        
        print("等待处理完成...")
        # 等待处理完成，最多120秒
        for i in range(60):
            time.sleep(2)
            # 检查是否有错误信息
            error_text = page.locator('text=/错误|error|失败/i')
            if error_text.count() > 0:
                print(f"出现错误: {error_text.first.text_content()}")
                page.screenshot(path='/tmp/phase2_test_error.png')
                break
            
            # 检查是否进入学习界面
            learn_btn = page.locator('button:has-text("下一个"), button:has-text("认识它"), button:has-text("继续")')
            if learn_btn.count() > 0:
                print("处理完成，进入学习界面")
                page.screenshot(path='/tmp/phase2_test_02_learning.png')
                break
            
            print(f"等待中... ({i*2}秒)")
        
        print("\n=== 步骤 4: 学习完单词 ===")
        # 学习所有单词
        for i in range(20):
            try:
                # 尝试各种按钮
                buttons = [
                    page.locator('button:has-text("认识它")'),
                    page.locator('button:has-text("下一个")'),
                    page.locator('button:has-text("继续")'),
                    page.locator('button:has-text("next")'),
                ]
                
                clicked = False
                for btn_locator in buttons:
                    if btn_locator.count() > 0:
                        btn_locator.first.click()
                        clicked = True
                        print(f"点击按钮 {i+1}")
                        break
                
                if not clicked:
                    print("没有找到可点击的按钮")
                    page.screenshot(path=f'/tmp/phase2_test_no_button_{i}.png')
                    break
                
                time.sleep(1)
                
            except Exception as e:
                print(f"点击出错: {e}")
                page.screenshot(path=f'/tmp/phase2_test_click_error_{i}.png')
                break
        
        print("\n=== 步骤 5: 检查第二阶段 ===")
        page.screenshot(path='/tmp/phase2_test_03.png')
        
        # 检查是否出现句子翻译练习
        sentence_elements = page.locator('text=/句子|翻译|填空/i')
        print(f"找到 {sentence_elements.count()} 个与句子相关的元素")
        
        # 获取最新的 file_id
        import os
        data_dir = "/workspace/data/files"
        files = [f for f in os.listdir(data_dir) if f.startswith("text_")]
        if files:
            files.sort(reverse=True)
            file_id = files[0]
            print(f"\n文件ID: {file_id}")
            
            # 检查句子数据
            pipeline_file = f"{data_dir}/{file_id}/pipeline_data.json"
            if os.path.exists(pipeline_file):
                with open(pipeline_file, 'r') as f:
                    sentences = json.load(f)
                print(f"\n句子数据:")
                for s in sentences:
                    print(f"  '{s.get('sentence')}' - word_count: {s.get('word_count')}")
                
                # 检查 eligible 句子
                word_count_2_plus = [s for s in sentences if s.get('word_count', 0) >= 2]
                print(f"\nword_count >= 2 的句子: {len(word_count_2_plus)} 个")
                for s in word_count_2_plus:
                    print(f"  '{s.get('sentence')}'")
        
        # 打印控制台日志
        print("\n=== 控制台日志 ===")
        for log in console_logs[-30:]:
            print(log)
        
        browser.close()
        print("\n测试完成!")

if __name__ == "__main__":
    print("=" * 60)
    print("  测试 word_count >= 2 的过滤逻辑")
    print("=" * 60)
    
    reset_data()
    test_phase2_word_count_filter()
    
    print("=" * 60)
