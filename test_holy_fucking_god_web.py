from playwright.sync_api import sync_playwright
import time

def test_holy_fucking_god():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print("=" * 60)
        print("测试 holy fucking god 完整流程")
        print("=" * 60)
        
        # 1. 访问前端页面
        print("\n1. 访问前端页面...")
        page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/01_initial.png', full_page=True)
        print("   ✓ 页面加载完成")
        
        # 2. 输入文本并处理
        print("\n2. 输入测试文本...")
        textarea = page.locator('textarea')
        textarea.fill('holy fucking god')
        page.screenshot(path='/tmp/02_text_entered.png', full_page=True)
        
        print("\n3. 点击生成学习资料按钮...")
        process_button = page.locator('button:has-text("生成学习资料")')
        process_button.click()
        
        # 等待处理完成
        print("   等待处理完成...")
        max_wait = 30
        waited = 0
        while waited < max_wait:
            time.sleep(2)
            waited += 2
            # 检查是否出现"开始学习"按钮
            start_button = page.locator('button:has-text("开始学习")')
            if start_button.count() > 0 and start_button.is_visible():
                print(f"   ✓ 处理完成 (等待了 {waited} 秒)")
                break
        
        page.screenshot(path='/tmp/03_processed.png', full_page=True)
        
        # 4. 点击开始学习
        print("\n4. 点击开始学习...")
        start_button = page.locator('button:has-text("开始学习")')
        if start_button.count() > 0:
            start_button.click()
            time.sleep(2)
            page.screenshot(path='/tmp/04_units_page.png', full_page=True)
            print("   ✓ 进入单元选择页面")
        
        # 5. 检查第一阶段单元样式
        print("\n5. 检查第一阶段单元样式...")
        phase1_section = page.locator('text=阶段一：单词学习')
        if phase1_section.count() > 0:
            print("   ✓ 找到阶段一")
            # 检查是否有单词表图标
            vocab_button = page.locator('button:has-text("单词表")')
            print(f"   - 单词表按钮数量: {vocab_button.count()}")
        
        # 6. 点击第一阶段第一个单元
        print("\n6. 点击第一阶段第一个单元...")
        unit1 = page.locator('text=单元 1').first
        if unit1.count() > 0:
            unit1.click()
            time.sleep(3)
            page.screenshot(path='/tmp/05_phase1_learning.png', full_page=True)
            print("   ✓ 进入第一阶段学习")
        
        # 7. 完成第一阶段学习（选择正确答案）
        print("\n7. 完成单词学习...")
        # 假设第一个选项是正确的（简化测试）
        for i in range(3):  # 假设有3个单词
            print(f"   单词 {i+1}...")
            # 等待选项出现
            page.wait_for_selector('button[class*="rounded-lg"]', timeout=5000)
            options = page.locator('button[class*="rounded-lg"]').all()
            if len(options) > 0:
                options[0].click()  # 选择第一个选项
                time.sleep(1)
                # 点击下一题
                next_button = page.locator('button:has-text("下一题")')
                if next_button.count() > 0:
                    next_button.click()
                    time.sleep(2)
        
        page.screenshot(path='/tmp/06_phase1_completed.png', full_page=True)
        
        # 8. 检查是否回到单元页面并显示打勾
        print("\n8. 检查单元完成状态...")
        time.sleep(2)
        page.screenshot(path='/tmp/07_check_completion.png', full_page=True)
        
        # 检查是否有打勾标记
        checkmarks = page.locator('text=✓').count()
        print(f"   - 打勾标记数量: {checkmarks}")
        
        # 9. 测试第二阶段
        print("\n9. 测试第二阶段...")
        phase2_unit = page.locator('text=阶段二').locator('..').locator('text=单元 1')
        if phase2_unit.count() > 0:
            phase2_unit.click()
            time.sleep(3)
            page.screenshot(path='/tmp/08_phase2_started.png', full_page=True)
            print("   ✓ 进入第二阶段")
        
        # 10. 返回主界面并重新生成
        print("\n10. 返回主界面重新生成...")
        back_button = page.locator('button:has-text("返回")').first
        if back_button.count() > 0:
            back_button.click()
            time.sleep(1)
        
        # 返回到输入页面
        back_to_input = page.locator('button:has-text("返回")').first
        if back_to_input.count() > 0:
            back_to_input.click()
            time.sleep(1)
        
        page.screenshot(path='/tmp/09_back_to_input.png', full_page=True)
        
        # 重新输入并生成
        print("\n11. 重新生成...")
        textarea = page.locator('textarea')
        textarea.fill('holy fucking god')
        process_button = page.locator('button:has-text("生成学习资料")')
        process_button.click()
        
        # 等待处理完成
        waited = 0
        while waited < max_wait:
            time.sleep(2)
            waited += 2
            start_button = page.locator('button:has-text("开始学习")')
            if start_button.count() > 0 and start_button.is_visible():
                print(f"   ✓ 重新处理完成")
                break
        
        page.screenshot(path='/tmp/10_regenerated.png', full_page=True)
        
        # 12. 再次进入第二阶段测试
        print("\n12. 再次测试第二阶段...")
        start_button = page.locator('button:has-text("开始学习")')
        if start_button.count() > 0:
            start_button.click()
            time.sleep(2)
        
        # 点击第二阶段第一个单元
        phase2_section = page.locator('text=阶段二：句子练习')
        if phase2_section.count() > 0:
            # 找到第二阶段下的单元1
            phase2_container = phase2_section.locator('xpath=../..')
            unit1_in_phase2 = phase2_container.locator('text=单元 1').first
            if unit1_in_phase2.count() > 0:
                unit1_in_phase2.click()
                time.sleep(3)
                page.screenshot(path='/tmp/11_phase2_again.png', full_page=True)
                print("   ✓ 再次进入第二阶段")
                
                # 检查是否有选项生成
                options = page.locator('button[class*="rounded-full"], button[class*="rounded-lg"]').count()
                print(f"   - 选项按钮数量: {options}")
                if options > 0:
                    print("   ✓ 第二阶段选项生成正常")
                else:
                    print("   ✗ 第二阶段选项未生成")
        
        print("\n" + "=" * 60)
        print("测试完成！")
        print("=" * 60)
        
        browser.close()

if __name__ == "__main__":
    test_holy_fucking_god()
