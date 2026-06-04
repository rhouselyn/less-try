import asyncio
from playwright.async_api import async_playwright

async def main():
    console_logs = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        # Capture ALL console messages
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: console_logs.append(f"[PAGE_ERROR] {err}"))
        
        print("=== Step 1: Opening http://localhost:5174 ===")
        try:
            await page.goto("http://localhost:5174", timeout=30000)
            print("Page loaded successfully")
        except Exception as e:
            print(f"Failed to load page: {e}")
            await browser.close()
            return
        
        # Wait for loading overlay to disappear
        print("Waiting for loading overlay to disappear...")
        try:
            overlay = page.locator('div.absolute.inset-0.bg-cream-50\\/80')
            await overlay.wait_for(state="hidden", timeout=30000)
            print("Loading overlay disappeared")
        except:
            print("No loading overlay found, continuing...")
        
        await asyncio.sleep(3)
        await page.screenshot(path="/workspace/test_screenshot_01_initial.png")
        print("Initial screenshot taken")
        
        print("\n=== Step 2: Clicking Settings (gear icon) ===")
        try:
            settings_svg = page.locator('svg.lucide-settings').first
            settings_btn = settings_svg.locator('xpath=ancestor::button').first
            await settings_btn.click(force=True, timeout=10000)
            print("Settings clicked")
        except Exception as e:
            print(f"Settings click failed: {e}")
            # Try JS click
            await page.evaluate('''() => {
                const svg = document.querySelector('svg.lucide-settings');
                if (svg) { const btn = svg.closest('button') || svg; btn.click(); }
            }''')
        
        await asyncio.sleep(2)
        await page.screenshot(path="/workspace/test_screenshot_03_settings_open.png")
        print("Settings panel opened")
        
        print("\n=== Step 3: Finding and clicking the native language selector ===")
        # The language selector is a custom button showing "KO 한국어"
        # Let's find it by looking for the button near "모국어" text
        
        # First, let's examine all buttons more carefully
        all_buttons = await page.query_selector_all('button')
        lang_button = None
        
        for i, btn in enumerate(all_buttons):
            text = await btn.text_content()
            if text and ('한국어' in text or 'KO' in text.strip()[:5]):
                lang_button = btn
                print(f"Found language button #{i}: '{text.strip()}'")
                break
        
        if not lang_button:
            # Try finding by looking for buttons that contain language codes
            print("Trying alternative search for language button...")
            for i, btn in enumerate(all_buttons):
                inner_html = await btn.inner_html()
                text = await btn.text_content()
                visible = await btn.is_visible()
                if visible and text:
                    # Look for buttons with short language-like text
                    stripped = text.strip()
                    if len(stripped) < 30 and any(code in stripped for code in ['KO', 'EN', 'ZH', 'JA', 'SV', 'DE', 'FR', 'ES']):
                        print(f"  Candidate button #{i}: '{stripped}'")
                        if 'KO' in stripped or '한국어' in stripped:
                            lang_button = btn
                            break
        
        if not lang_button:
            print("ERROR: Could not find language selector button!")
            await page.screenshot(path="/workspace/test_screenshot_02_no_lang.png")
            await browser.close()
            return
        
        # Click the language button to open the dropdown
        print("\n=== Step 4: Clicking language selector to open dropdown ===")
        try:
            await lang_button.click(force=True, timeout=10000)
            print("Language button clicked")
        except:
            await page.evaluate('''() => {
                const btns = document.querySelectorAll('button');
                for (const btn of btns) {
                    if (btn.textContent.includes('한국어') || btn.textContent.trim().startsWith('KO')) {
                        btn.click();
                        break;
                    }
                }
            }''')
            print("Language button clicked via JS")
        
        await asyncio.sleep(1)
        await page.screenshot(path="/workspace/test_screenshot_04_lang_dropdown.png")
        print("Language dropdown screenshot taken")
        
        # Print the page text to see the dropdown options
        page_text = await page.inner_text('body')
        print(f"Page text with dropdown open:\n{page_text[:3000]}")
        
        # Also check for listbox/combobox/menu items
        print("\nLooking for dropdown options...")
        
        # Try various selectors for dropdown items
        sv_option = None
        option_selectors = [
            '[role="option"]',
            '[role="listbox"] [role="option"]',
            '[role="menuitem"]',
            '[role="listbox"] *',
            'li',
            '.dropdown-item',
        ]
        
        for selector in option_selectors:
            try:
                items = await page.query_selector_all(selector)
                if items:
                    print(f"Found {len(items)} items with selector: {selector}")
                    for item in items:
                        text = await item.text_content()
                        val = await item.get_attribute("data-value") or await item.get_attribute("value")
                        print(f"  Item: text='{text}', data-value='{val}'")
                        if text and ('svenska' in text.lower() or 'sv' == text.strip().lower() or val == 'sv'):
                            sv_option = item
                            print(f"  -> Found Swedish option!")
                            break
                    if sv_option:
                        break
            except:
                continue
        
        if not sv_option:
            # Try finding by text content
            print("Trying to find Swedish option by text search...")
            try:
                sv_option = page.get_by_text("Svenska", exact=False).first
                if await sv_option.count() == 0:
                    sv_option = None
            except:
                pass
            
            if not sv_option:
                try:
                    sv_option = page.get_by_text("Swedish", exact=False).first
                    if await sv_option.count() == 0:
                        sv_option = None
                except:
                    pass
            
            if not sv_option:
                # Search all elements for sv-related text
                all_elements = await page.query_selector_all('*')
                for el in all_elements:
                    try:
                        text = await el.text_content()
                        if text and ('svenska' in text.lower() or (text.strip().lower() == 'sv')):
                            tag = await el.evaluate('el => el.tagName')
                            print(f"  Found element with Swedish text: <{tag}> '{text.strip()}'")
                            sv_option = el
                            break
                    except:
                        continue
        
        if sv_option:
            print(f"\n=== Step 5: Clicking Swedish option ===")
            try:
                await sv_option.click(force=True, timeout=10000)
                print("Swedish option clicked")
            except Exception as e:
                print(f"Click failed: {e}, trying JS click...")
                await sv_option.evaluate('el => el.click()')
                print("Swedish option clicked via JS")
        else:
            print("ERROR: Could not find Swedish option in dropdown!")
            # Let's try a different approach - use JS to inspect the dropdown
            dropdown_info = await page.evaluate('''() => {
                const results = [];
                // Look for any element that might be a dropdown
                const allEls = document.querySelectorAll('[role="listbox"], [role="menu"], [role="list"], ul, .dropdown, .popover, [data-radix-popper-content-wrapper]');
                for (const el of allEls) {
                    results.push({
                        tag: el.tagName,
                        role: el.getAttribute('role'),
                        class: el.className.substring(0, 100),
                        text: el.textContent.substring(0, 200),
                        children: el.children.length
                    });
                }
                return results;
            }''')
            print(f"Dropdown elements found: {dropdown_info}")
            
            # Try to find and click sv using a more aggressive JS approach
            print("\nTrying aggressive JS approach to find and select Swedish...")
            js_result = await page.evaluate('''() => {
                // Look for any visible element containing sv/Swedish/Svenska
                const allEls = document.querySelectorAll('*');
                const matches = [];
                for (const el of allEls) {
                    const text = el.textContent || '';
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        if (text.trim().toLowerCase() === 'sv' || 
                            text.toLowerCase().includes('svenska') || 
                            text.toLowerCase().includes('swedish')) {
                            matches.push({
                                tag: el.tagName,
                                text: text.substring(0, 50),
                                class: el.className.substring(0, 50) if el.className else '',
                                x: rect.x,
                                y: rect.y,
                                w: rect.width,
                                h: rect.height
                            });
                        }
                    }
                }
                return matches;
            }''')
            print(f"Swedish-related visible elements: {js_result}")
            
            await page.screenshot(path="/workspace/test_screenshot_05_no_sv.png")
        
        await asyncio.sleep(1)
        await page.screenshot(path="/workspace/test_screenshot_05_after_sv.png")
        
        # Now click Save (저장)
        print("\n=== Step 6: Clicking Save ===")
        try:
            save_btn = page.get_by_text("저장", exact=True).first
            if await save_btn.count() > 0:
                await save_btn.click(force=True, timeout=10000)
                print("Save (저장) clicked")
            else:
                raise Exception("Not found")
        except:
            try:
                save_btn = page.locator('button:has-text("저장")').first
                await save_btn.click(force=True, timeout=10000)
                print("Save (저장) clicked via locator")
            except:
                # JS fallback
                await page.evaluate('''() => {
                    const btns = document.querySelectorAll('button');
                    for (const btn of btns) {
                        if (btn.textContent.includes('저장') || btn.textContent.toLowerCase().includes('save')) {
                            btn.click();
                            break;
                        }
                    }
                }''')
                print("Save clicked via JS")
        
        await asyncio.sleep(2)
        await page.screenshot(path="/workspace/test_screenshot_06_after_save.png")
        print("After save screenshot taken")
        
        # Check current i18n logs
        i18n_logs = [l for l in console_logs if '[i18n]' in l.lower()]
        print(f"\ni18n logs after save: {i18n_logs}")
        
        print("\n=== Step 7: Waiting for LLM translation (up to 180 seconds) ===")
        
        translation_complete = False
        translation_failed = False
        for i in range(36):  # 36 * 5s = 180s
            await asyncio.sleep(5)
            
            for log in console_logs:
                if '[i18n] Received translations for: sv' in log:
                    translation_complete = True
                    print(f"  [{(i+1)*5}s] Translation COMPLETE detected!")
                    break
                if '[i18n] Translation failed for: sv' in log:
                    translation_failed = True
                    print(f"  [{(i+1)*5}s] Translation FAILED detected!")
                    break
            
            if translation_complete or translation_failed:
                break
            
            i18n_logs = [l for l in console_logs if '[i18n]' in l.lower()]
            new_i18n = [l for l in i18n_logs if 'sv' in l.lower()]
            if new_i18n:
                print(f"  [{(i+1)*5}s] SV-related i18n logs: {new_i18n}")
            elif i18n_logs:
                print(f"  [{(i+1)*5}s] Latest i18n logs: {i18n_logs[-3:]}")
            else:
                print(f"  [{(i+1)*5}s] No i18n logs yet...")
        
        await page.screenshot(path="/workspace/test_screenshot_07_final.png")
        print("Final screenshot taken")
        
        # Check the UI text
        final_text = await page.inner_text('body')
        print(f"\n=== Final page text ===")
        print(final_text[:3000])
        
        await browser.close()
    
    print("\n" + "="*80)
    print("=== ALL CONSOLE LOGS ===")
    print("="*80)
    for log in console_logs:
        print(log)
    
    print("\n" + "="*80)
    print("=== i18n SPECIFIC LOGS ===")
    print("="*80)
    for log in console_logs:
        if '[i18n]' in log.lower():
            print(log)
    
    print("\n" + "="*80)
    print("=== SUMMARY ===")
    print("="*80)
    has_fetch_sv = any('Fetching translations for: sv' in l for l in console_logs)
    has_received_sv = any('Received translations for: sv' in l for l in console_logs)
    has_failed_sv = any('Translation failed for: sv' in l for l in console_logs)
    has_fetch_any = any('Fetching translations for:' in l for l in console_logs)
    has_received_any = any('Received translations for:' in l for l in console_logs)
    
    print(f"  [i18n] Fetching translations for: sv -> {'FOUND' if has_fetch_sv else 'NOT FOUND'}")
    print(f"  [i18n] Received translations for: sv -> {'FOUND' if has_received_sv else 'NOT FOUND'}")
    print(f"  [i18n] Translation failed for: sv -> {'FOUND' if has_failed_sv else 'NOT FOUND'}")
    print(f"  [i18n] Any fetch logs -> {'YES' if has_fetch_any else 'NO'}")
    print(f"  [i18n] Any received logs -> {'YES' if has_received_any else 'NO'}")

asyncio.run(main())
