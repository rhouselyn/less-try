from playwright.sync_api import sync_playwright

def debug_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print("访问前端页面...")
        page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')
        
        # 获取页面内容
        content = page.content()
        with open('/tmp/page_content.html', 'w') as f:
            f.write(content)
        print("页面内容已保存到 /tmp/page_content.html")
        
        # 查找所有按钮
        buttons = page.locator('button').all()
        print(f"\n找到 {len(buttons)} 个按钮:")
        for i, btn in enumerate(buttons):
            text = btn.text_content()
            print(f"  {i+1}. {text}")
        
        # 查找 textarea
        textareas = page.locator('textarea').all()
        print(f"\n找到 {len(textareas)} 个 textarea")
        
        browser.close()

if __name__ == "__main__":
    debug_page()
