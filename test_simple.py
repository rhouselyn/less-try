from playwright.sync_api import sync_playwright
import time

def test_simple():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print("=" * 60)
        print("简单测试 holy fucking god")
        print("=" * 60)
        
        # 1. 访问前端页面
        print("\n1. 访问前端页面...")
        page.goto('http://localhost:3000')
        page.wait_for_load_state('networkidle')
        page.screenshot(path='/tmp/s01_initial.png', full_page=True)
        print("   ✓ 页面加载完成")
        
        # 2. 输入文本并处理
        print("\n2. 输入测试文本并处理...")
        page.locator('textarea').fill('holy fucking god')
        page.screenshot(path='/tmp/s02_text_entered.png', full_page=True)
        
        page.locator('button:has-text("生成学习资料")').click()
        
        # 等待处理完成
        max_wait = 60
        waited = 0
        while waited < max_wait:
            time.sleep(2)
            waited += 2
            start_button = page.locator('button:has-text("开始学习")')
            if start_button.count() > 0 and start_button.is_visible():
                print(f"   ✓ 处理完成 (等待了 {waited} 秒)")
                break
        
        page.screenshot(path='/tmp/s03_processed.png', full_page=True)
        
        # 3. 点击开始学习
        print("\n3. 点击开始学习...")
        page.locator('button:has-text("开始学习")').click()
        time.sleep(2)
        page.screenshot(path='/tmp/s04_units.png', full_page=True)
        print("   ✓ 进入单元选择页面")
        
        # 4. 检查单词表图标是否统一
        print("\n4. 检查第一阶段单词表图标...")
        # 先进入第一阶段 - 点击第一个单元1（属于阶段一）
        page.locator('text=单元 1').first.click()
        
        time.sleep(3)
        page.screenshot(path='/tmp/s05_phase1.png', full_page=True)
        print("   ✓ 进入第一阶段学习")
        
        # 检查是否有 BookOpen 图标 (单词表按钮)
        vocab_button = page.locator('button:has-text("单词表")')
        if vocab_button.count() > 0:
            print("   ✓ 第一阶段有单词表按钮")
            # 获取按钮HTML
            html = vocab_button.first.inner_html()
            if 'BookOpen' in html or 'lucide' in html:
                print("   ✓ 单词表图标是 BookOpen (lucide图标)")
            else:
                print("   ! 单词表图标可能不是 BookOpen")
        
        # 5. 返回到单元页面
        print("\n5. 返回到单元页面...")
        page.locator('button:has-text("返回")').first.click()
        time.sleep(2)
        page.screenshot(path='/tmp/s06_back_to_units.png', full_page=True)
        
        # 6. 进入第二阶段
        print("\n6. 进入第二阶段...")
        # 找到第二阶段下的单元1
        phase2_section = page.locator('text=阶段二：句子练习')
        if phase2_section.count() > 0:
            # 获取父容器然后找单元1
            phase2_container = phase2_section.locator('xpath=../..')
            unit1_in_phase2 = phase2_container.locator('text=单元 1')
            if unit1_in_phase2.count() > 0:
                unit1_in_phase2.first.click()
                time.sleep(3)
                page.screenshot(path='/tmp/s07_phase2.png', full_page=True)
                print("   ✓ 进入第二阶段")
                
                # 检查第二阶段单词表图标
                vocab_button2 = page.locator('button:has-text("单词表")')
                if vocab_button2.count() > 0:
                    print("   ✓ 第二阶段有单词表按钮")
                    html2 = vocab_button2.first.inner_html()
                    if 'BookOpen' in html2 or 'lucide' in html2:
                        print("   ✓ 第二阶段单词表图标是 BookOpen")
                    else:
                        print("   ! 第二阶段单词表图标可能不是 BookOpen")
                
                # 检查是否有选项
                options = page.locator('button[class*="rounded"]').count()
                print(f"   - 页面上的按钮数量: {options}")
        
        # 7. 返回主界面重新生成
        print("\n7. 返回主界面重新生成...")
        # 点击返回直到回到输入页面
        for i in range(3):
            back_btn = page.locator('button:has-text("返回")')
            if back_btn.count() > 0:
                back_btn.first.click()
                time.sleep(1)
            else:
                break
        
        page.screenshot(path='/tmp/s08_back_to_input.png', full_page=True)
        
        # 检查是否在输入页面
        textarea = page.locator('textarea')
        if textarea.count() > 0:
            print("   ✓ 回到输入页面")
            textarea.fill('holy fucking god test')
            page.locator('button:has-text("生成学习资料")').click()
            
            # 等待处理
            waited = 0
            while waited < max_wait:
                time.sleep(2)
                waited += 2
                start_btn = page.locator('button:has-text("开始学习")')
                if start_btn.count() > 0 and start_btn.is_visible():
                    print(f"   ✓ 重新生成完成")
                    break
            
            page.screenshot(path='/tmp/s09_regenerated.png', full_page=True)
            
            # 8. 再次进入第二阶段
            print("\n8. 再次进入第二阶段...")
            page.locator('button:has-text("开始学习")').click()
            time.sleep(2)
            
            phase2_section = page.locator('text=阶段二：句子练习')
            if phase2_section.count() > 0:
                phase2_container = phase2_section.locator('xpath=../..')
                unit1_in_phase2 = phase2_container.locator('text=单元 1')
                if unit1_in_phase2.count() > 0:
                    unit1_in_phase2.first.click()
                    time.sleep(3)
                    page.screenshot(path='/tmp/s10_phase2_again.png', full_page=True)
                    print("   ✓ 再次进入第二阶段")
                    
                    # 检查是否有选项
                    options = page.locator('button[class*="rounded"]').count()
                    print(f"   - 页面上的按钮数量: {options}")
                    if options > 5:  # 有一些按钮是正常的
                        print("   ✓ 第二阶段选项生成正常")
                    else:
                        print("   ✗ 第二阶段选项可能未生成")
        
        print("\n" + "=" * 60)
        print("测试完成！")
        print("=" * 60)
        
        browser.close()

if __name__ == "__main__":
    test_simple()
