from playwright.sync_api import sync_playwright
import time

def test_webapp():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        # 访问前端页面
        print("访问前端页面...")
        page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')
        
        # 截图查看初始状态
        page.screenshot(path='/tmp/initial_state.png', full_page=True)
        print("已截图: /tmp/initial_state.png")
        
        # 输入测试文本
        print("输入测试文本...")
        textarea = page.locator('textarea')
        textarea.fill('holy fucking god')
        
        # 点击处理按钮
        print("点击处理按钮...")
        process_button = page.locator('button:has-text("处理")')
        process_button.click()
        
        # 等待处理完成
        print("等待处理完成...")
        time.sleep(10)
        
        # 截图查看处理后的状态
        page.screenshot(path='/tmp/after_process.png', full_page=True)
        print("已截图: /tmp/after_process.png")
        
        # 查找"开始学习"按钮并点击
        print("查找开始学习按钮...")
        start_learning = page.locator('button:has-text("开始学习")')
        if start_learning.count() > 0:
            start_learning.click()
            time.sleep(2)
            page.screenshot(path='/tmp/after_start_learning.png', full_page=True)
            print("已截图: /tmp/after_start_learning.png")
        
        # 查看单元页面
        print("查看单元页面...")
        time.sleep(2)
        page.screenshot(path='/tmp/units_page.png', full_page=True)
        print("已截图: /tmp/units_page.png")
        
        # 尝试点击第一阶段第一个单元
        print("点击第一阶段第一个单元...")
        phase1_unit = page.locator('text=单元 1').first
        if phase1_unit.count() > 0:
            phase1_unit.click()
            time.sleep(3)
            page.screenshot(path='/tmp/phase1_learning.png', full_page=True)
            print("已截图: /tmp/phase1_learning.png")
        
        browser.close()
        print("测试完成")

if __name__ == "__main__":
    test_webapp()
