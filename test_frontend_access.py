from playwright.sync_api import sync_playwright
import time

def test_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print("Navigating to http://localhost:3000...")
        try:
            page.goto('http://localhost:3000', timeout=10000)
            page.wait_for_load_state('networkidle', timeout=10000)
            print("✅ Frontend loaded successfully!")
            
            # Check if the main elements are present
            title = page.title()
            print(f"Page title: {title}")
            
            # Check for key elements
            header = page.locator('text=少邻国')
            if header.count() > 0:
                print("✅ App header found!")
            
            input_box = page.locator('textarea')
            if input_box.count() > 0:
                print("✅ Input box found!")
            
            generate_btn = page.locator('button:has-text("生成")')
            if generate_btn.count() > 0:
                print("✅ Generate button found!")
            
            page.screenshot(path='/tmp/frontend_test.png', full_page=True)
            print("✅ Screenshot saved to /tmp/frontend_test.png")
            
            print("\n" + "="*50)
            print("Frontend test PASSED!")
            print("="*50)
            
        except Exception as e:
            print(f"❌ Frontend test FAILED: {e}")
            
        browser.close()

if __name__ == "__main__":
    test_frontend()
