import sys
sys.path.insert(0, '/data/user/skills/webapp-testing')

from playwright.sync_api import sync_playwright

def test_learning_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        print("=== 打开浏览器访问学习页面 ===")
        page.goto('http://localhost:5173')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/1_initial.png', full_page=True)
        
        # 找到并点击学习文件
        print("点击学习文件...")
        page.wait_for_timeout(2000)
        
        # 截图看看当前页面
        page.screenshot(path='/tmp/2_page.png', full_page=True)
        content = page.content()
        
        # 查找学习卡片
        cards = page.locator('[class*="card"]').all()
        print(f"找到 {len(cards)} 个卡片")
        
        if cards:
            print("点击第一个卡片")
            cards[0].click()
            page.wait_for_timeout(3000)
            page.screenshot(path='/tmp/3_after_click.png', full_page=True)
        
        # 检查阶段一单元是否打勾
        print("检查阶段一单元打勾状态...")
        completed_units = page.locator('[class*="completed"]').count()
        print(f"完成的单元数量: {completed_units}")
        
        # 检查页面内容
        content = page.content()
        if "completed" in content.lower() or "✓" in content:
            print("✓ 找到完成标记")
        else:
            print("✗ 没有找到完成标记")
        
        browser.close()
        print("测试完成!")

if __name__ == "__main__":
    test_learning_flow()
