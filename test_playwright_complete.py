from playwright.sync_api import sync_playwright
import time

def test_complete_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Navigate to the app
        page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/test_step1_home.png', full_page=True)
        print("Step 1: Home page loaded")
        
        # Find the text input and enter "holy fucking god"
        text_input = page.locator('textarea').first
        if text_input:
            text_input.fill('holy fucking god')
            print("Step 2: Entered text 'holy fucking god'")
            page.screenshot(path='/tmp/test_step2_text_entered.png', full_page=True)
        
        # Find and click the submit/generate button
        submit_btn = page.locator('button:has-text("生成")').first
        if submit_btn:
            submit_btn.click()
            print("Step 3: Clicked submit button")
            page.wait_for_timeout(3000)
            page.screenshot(path='/tmp/test_step3_submitted.png', full_page=True)
        
        # Wait for processing to complete
        print("Step 4: Waiting for processing to complete...")
        max_wait = 120  # 2 minutes max
        start_time = time.time()
        while time.time() - start_time < max_wait:
            page.wait_for_timeout(2000)
            # Check if the "开始学习" button is visible
            start_learning_btn = page.locator('button:has-text("开始学习")')
            if start_learning_btn.count() > 0:
                print("Step 5: Processing completed, '开始学习' button found")
                break
        
        page.screenshot(path='/tmp/test_step4_after_processing.png', full_page=True)
        
        # Click "开始学习" button
        start_learning_btn = page.locator('button:has-text("开始学习")').first
        if start_learning_btn:
            start_learning_btn.click()
            print("Step 5: Clicked '开始学习' button")
            page.wait_for_timeout(3000)
            page.screenshot(path='/tmp/test_step5_learning_page.png', full_page=True)
        
        # Check if we're on the units page
        units_header = page.locator('text=学习单元')
        if units_header.count() > 0:
            print("Step 6: On the units page")
            
            # Check if phase 1 units are displayed
            phase1_header = page.locator('text=阶段一：单词学习')
            if phase1_header.count() > 0:
                print("Step 7: Phase 1 units displayed")
            
            # Check if phase 2 units are displayed
            phase2_header = page.locator('text=阶段二：句子练习')
            if phase2_header.count() > 0:
                print("Step 8: Phase 2 units displayed")
            
            # Check for vocab list button
            vocab_list_btn = page.locator('button:has-text("单词表")')
            if vocab_list_btn.count() > 0:
                print("Step 9: Vocab list button found")
            else:
                print("Step 9: Vocab list button NOT found - this is an issue!")
        
        page.screenshot(path='/tmp/test_step6_units_page.png', full_page=True)
        
        # Click on phase 1 unit 1
        phase1_unit1 = page.locator('button:has-text("单元 1")').first
        if phase1_unit1:
            phase1_unit1.click()
            print("Step 10: Clicked on Phase 1 Unit 1")
            page.wait_for_timeout(3000)
            page.screenshot(path='/tmp/test_step7_phase1_unit1.png', full_page=True)
        
        # Answer the question (click first option)
        first_option = page.locator('button').filter(has_text='神圣的').first
        if first_option.count() > 0:
            first_option.click()
            print("Step 11: Clicked first option")
            page.wait_for_timeout(1000)
            page.screenshot(path='/tmp/test_step8_answered.png', full_page=True)
        
        # Click next button if visible
        next_btn = page.locator('button:has-text("下一题")')
        if next_btn.count() > 0:
            next_btn.click()
            print("Step 12: Clicked next button")
            page.wait_for_timeout(2000)
            page.screenshot(path='/tmp/test_step9_next.png', full_page=True)
        
        # Go back to units page
        back_btn = page.locator('button:has-text("返回")').first
        if back_btn:
            back_btn.click()
            print("Step 13: Clicked back button")
            page.wait_for_timeout(2000)
            page.screenshot(path='/tmp/test_step10_back.png', full_page=True)
        
        # Check if unit is marked as completed
        page.screenshot(path='/tmp/test_step11_final.png', full_page=True)
        
        # Get page content for analysis
        content = page.content()
        with open('/tmp/test_page_content.html', 'w') as f:
            f.write(content)
        
        print("\n" + "="*50)
        print("Test completed! Screenshots saved to /tmp/")
        print("="*50)
        
        browser.close()

if __name__ == "__main__":
    test_complete_flow()
