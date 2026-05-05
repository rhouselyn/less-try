from playwright.sync_api import sync_playwright
import time

def test_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Navigate to the app
        page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/step1_home.png', full_page=True)
        print("Step 1: Home page loaded")
        
        # Find the text input and enter "holy fucking god"
        text_input = page.locator('textarea, input[type="text"]').first
        if text_input:
            text_input.fill('holy fucking god')
            print("Step 2: Entered text 'holy fucking god'")
            page.screenshot(path='/tmp/step2_text_entered.png', full_page=True)
        
        # Find and click the submit/generate button
        submit_btn = page.locator('button:has-text("生成"), button:has-text("提交"), button:has-text("开始")').first
        if submit_btn:
            submit_btn.click()
            print("Step 3: Clicked submit button")
            page.wait_for_timeout(3000)
            page.screenshot(path='/tmp/step3_submitted.png', full_page=True)
        
        # Wait for processing to complete
        page.wait_for_timeout(10000)
        page.screenshot(path='/tmp/step4_after_processing.png', full_page=True)
        print("Step 4: Processing completed")
        
        # Get page content for analysis
        content = page.content()
        with open('/tmp/page_content.html', 'w') as f:
            f.write(content)
        print("Page content saved to /tmp/page_content.html")
        
        # Find all buttons on the page
        buttons = page.locator('button').all()
        print(f"\nFound {len(buttons)} buttons:")
        for i, btn in enumerate(buttons):
            try:
                text = btn.inner_text()
                print(f"  Button {i}: {text[:50]}")
            except:
                pass
        
        # Find all links
        links = page.locator('a').all()
        print(f"\nFound {len(links)} links:")
        for i, link in enumerate(links):
            try:
                text = link.inner_text()
                href = link.get_attribute('href')
                print(f"  Link {i}: {text[:30]} -> {href}")
            except:
                pass
        
        browser.close()
        print("\nTest completed!")

if __name__ == "__main__":
    test_flow()
