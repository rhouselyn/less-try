from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})
    page.goto('http://localhost:3000')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    page.screenshot(path='/workspace/test_screenshot.png', full_page=True)
    print("Screenshot saved")
    content = page.content()
    has_sidebar = '学习记录' in content or 'Learning History' in content
    print(f"Has sidebar: {has_sidebar}")
    sidebar_visible = page.locator('text=学习记录').count() > 0 or page.locator('text=Learning History').count() > 0
    print(f"Sidebar visible: {sidebar_visible}")
    no_history = page.locator('text=暂无学习记录').count() > 0 or page.locator('text=No learning history yet').count() > 0
    print(f"No history message: {no_history}")
    browser.close()
