import asyncio
from playwright.async_api import async_playwright

CONSOLE_LOGS = []

async def handle_console(msg):
    entry = f"[{msg.type}] {msg.text}"
    CONSOLE_LOGS.append(entry)
    print(f"CONSOLE: {entry}")

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1400, "height": 900},
            locale="zh-CN"
        )
        page = await context.new_page()

        # Listen for all console messages
        page.on("console", handle_console)
        page.on("pageerror", lambda err: CONSOLE_LOGS.append(f"[PAGE_ERROR] {err}") or print(f"PAGE_ERROR: {err}"))
        page.on("requestfailed", lambda req: CONSOLE_LOGS.append(f"[REQUEST_FAILED] {req.url} - {req.failure}") or print(f"REQUEST_FAILED: {req.url}"))

        print("=" * 60)
        print("STEP 1: Opening page at http://localhost:5174")
        print("=" * 60)
        await page.goto("http://localhost:5174", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(3000)

        await page.screenshot(path="/workspace/screenshot_01_initial.png")
        print("Screenshot: screenshot_01_initial.png")

        # Capture initial state
        initial_text = await page.evaluate("""() => {
            return document.body.innerText.substring(0, 800);
        }""")
        print(f"Initial page text:\n{initial_text[:500]}")

        # ============================================================
        # STEP 2: Click Settings gear icon
        # ============================================================
        print("\n" + "=" * 60)
        print("STEP 2: Click Settings gear icon")
        print("=" * 60)

        # The settings icon is an SVG with class lucide-settings inside a button
        settings_btn = page.locator('button:has(svg.lucide-settings)').first
        await settings_btn.click(timeout=5000)
        print("Clicked settings gear icon")
        await page.wait_for_timeout(1500)

        await page.screenshot(path="/workspace/screenshot_02_settings_open.png")
        print("Screenshot: screenshot_02_settings_open.png")

        # Verify settings modal is open
        settings_content = await page.evaluate("""() => {
            const modal = document.querySelector('[class*="fixed inset-0"]');
            return modal ? modal.innerText.substring(0, 500) : 'No modal found';
        }""")
        print(f"Settings modal content:\n{settings_content[:500]}")

        # ============================================================
        # STEP 3: Change native language to Japanese (ja)
        # ============================================================
        print("\n" + "=" * 60)
        print("STEP 3: Change native language to Japanese (ja)")
        print("=" * 60)

        # The NativeLangSelector is a custom button with class "w-full flex items-center gap-2 px-3 py-2 rounded-xl border"
        # It shows the current language native name (e.g., "Polski" for pl, "日本語" for ja)
        # We need to click it to open the dropdown, then click the Japanese option

        # First, find and click the language selector button
        # It's inside the settings modal, has a ChevronDown icon
        lang_selector_btn = page.locator('button:has(svg.lucide-chevron-down)').last
        await lang_selector_btn.click(timeout=5000)
        print("Clicked language selector dropdown")
        await page.wait_for_timeout(500)

        await page.screenshot(path="/workspace/screenshot_03_lang_dropdown_open.png")
        print("Screenshot: screenshot_03_lang_dropdown_open.png")

        # Now find and click Japanese (日本語) option in the dropdown
        # The dropdown shows language native names
        ja_option = page.locator('button:has-text("日本語")').first
        await ja_option.click(timeout=5000)
        print("Selected Japanese (日本語) from dropdown")
        await page.wait_for_timeout(500)

        await page.screenshot(path="/workspace/screenshot_04_ja_selected.png")
        print("Screenshot: screenshot_04_ja_selected.png")

        # Verify the selector now shows Japanese
        lang_btn_text = await page.evaluate("""() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
                if (btn.querySelector('svg.lucide-chevron-down')) {
                    return btn.innerText;
                }
            }
            return 'Not found';
        }""")
        print(f"Language selector now shows: {lang_btn_text}")

        # ============================================================
        # STEP 4: Click Save button
        # ============================================================
        print("\n" + "=" * 60)
        print("STEP 4: Click Save button")
        print("=" * 60)

        # The save button has class "btn-primary" and text varies by language
        # It could be "保存", "Save", "Zapisz", etc.
        save_btn = page.locator('button.btn-primary').last
        await save_btn.click(timeout=5000)
        print("Clicked save button (btn-primary)")
        await page.wait_for_timeout(2000)

        await page.screenshot(path="/workspace/screenshot_05_after_save.png")
        print("Screenshot: screenshot_05_after_save.png")

        # ============================================================
        # STEP 5: Wait for Japanese translation to load (up to 120s)
        # ============================================================
        print("\n" + "=" * 60)
        print("STEP 5: Waiting for Japanese translation (up to 120s)")
        print("=" * 60)

        i18n_fetch_ja = False
        i18n_received_ja = False
        i18n_error_ja = False
        wait_start = asyncio.get_event_loop().time()

        while (asyncio.get_event_loop().time() - wait_start) < 120:
            await page.wait_for_timeout(2000)
            elapsed = asyncio.get_event_loop().time() - wait_start

            for log in CONSOLE_LOGS:
                if '[i18n] Fetching translations for: ja' in log:
                    i18n_fetch_ja = True
                if '[i18n] Received translations for: ja' in log:
                    i18n_received_ja = True
                if '[i18n] Failed to fetch translations for: ja' in log:
                    i18n_error_ja = True

            if i18n_received_ja or i18n_error_ja:
                print(f"  Translation result after {elapsed:.0f}s! fetch={i18n_fetch_ja}, received={i18n_received_ja}, error={i18n_error_ja}")
                break

            if int(elapsed) % 10 == 0 and elapsed > 5:
                current_text = await page.evaluate("() => document.body.innerText.substring(0, 300)")
                print(f"  {elapsed:.0f}s elapsed. Current UI text: {current_text[:200]}")

        await page.screenshot(path="/workspace/screenshot_06_after_ja_translation.png")
        print("Screenshot: screenshot_06_after_ja_translation.png")

        # ============================================================
        # STEP 6: Check sidebar state after switching to Japanese
        # ============================================================
        print("\n" + "=" * 60)
        print("STEP 6: Check sidebar state after switching to Japanese")
        print("=" * 60)

        # Get the sidebar/left panel text
        sidebar_text = await page.evaluate("""() => {
            // Try to find the sidebar element
            const sidebar = document.querySelector('[class*="sidebar"], [class*="Sidebar"], aside, nav');
            if (sidebar) return sidebar.innerText;
            // Fallback: get the left portion of the page
            return document.body.innerText.substring(0, 500);
        }""")
        print(f"Sidebar text after ja switch:\n{sidebar_text[:500]}")

        # Check for Chinese-only characters in sidebar (bug indicator)
        chinese_check = await page.evaluate("""() => {
            const sidebar = document.querySelector('[class*="sidebar"], [class*="Sidebar"], aside, nav');
            const text = sidebar ? sidebar.innerText : document.body.innerText.substring(0, 500);
            const chineseOnlyWords = ['学习', '设置', '课程', '词汇', '语法', '练习', '进度', '首页', '母语', '输入文本', '开始学习'];
            const found = chineseOnlyWords.filter(w => text.includes(w));
            return { hasChinese: found.length > 0, foundWords: found };
        }""")
        print(f"Chinese text in sidebar (BUG if true): {chinese_check}")

        # Get full page text to see what language the UI is in
        full_page_text = await page.evaluate("() => document.body.innerText.substring(0, 1000)")
        print(f"Full page text (first 500 chars):\n{full_page_text[:500]}")

        # ============================================================
        # STEP 7: Switch back to Chinese (zh)
        # ============================================================
        print("\n" + "=" * 60)
        print("STEP 7: Switch back to Chinese (zh)")
        print("=" * 60)

        # Open settings again
        settings_btn2 = page.locator('button:has(svg.lucide-settings)').first
        await settings_btn2.click(timeout=5000)
        print("Clicked settings gear icon again")
        await page.wait_for_timeout(1500)

        # Click language selector dropdown
        lang_selector_btn2 = page.locator('button:has(svg.lucide-chevron-down)').last
        await lang_selector_btn2.click(timeout=5000)
        print("Clicked language selector dropdown again")
        await page.wait_for_timeout(500)

        # Select Chinese (中文)
        zh_option = page.locator('button:has-text("中文")').first
        await zh_option.click(timeout=5000)
        print("Selected Chinese (中文) from dropdown")
        await page.wait_for_timeout(500)

        await page.screenshot(path="/workspace/screenshot_07_zh_selected.png")
        print("Screenshot: screenshot_07_zh_selected.png")

        # Click save
        save_btn2 = page.locator('button.btn-primary').last
        await save_btn2.click(timeout=5000)
        print("Clicked save button again")
        await page.wait_for_timeout(2000)

        # Wait for Chinese translation
        i18n_received_zh = False
        wait_start2 = asyncio.get_event_loop().time()
        while (asyncio.get_event_loop().time() - wait_start2) < 60:
            await page.wait_for_timeout(2000)
            for log in CONSOLE_LOGS:
                if '[i18n] Received translations for: zh' in log:
                    i18n_received_zh = True
            if i18n_received_zh:
                print(f"  Chinese translation received after {asyncio.get_event_loop().time() - wait_start2:.0f}s")
                break

        await page.wait_for_timeout(2000)
        await page.screenshot(path="/workspace/screenshot_08_back_to_zh.png")
        print("Screenshot: screenshot_08_back_to_zh.png")

        # Check final state
        final_text = await page.evaluate("() => document.body.innerText.substring(0, 500)")
        print(f"Final page text after switching back to Chinese:\n{final_text[:500]}")

        # Check if Chinese text is present
        has_chinese_final = await page.evaluate("""() => {
            const text = document.body.innerText.substring(0, 500);
            const chineseWords = ['学习', '设置', '课程', '词汇', '母语', '输入'];
            return chineseWords.filter(w => text.includes(w));
        }""")
        print(f"Chinese words found in final state: {has_chinese_final}")

        # ============================================================
        # FINAL SUMMARY
        # ============================================================
        print("\n" + "=" * 60)
        print("FINAL SUMMARY")
        print("=" * 60)

        print("\n--- [i18n] prefixed logs ---")
        i18n_logs = [log for log in CONSOLE_LOGS if '[i18n]' in log]
        for log in i18n_logs:
            print(f"  {log}")
        if not i18n_logs:
            print("  (NONE FOUND - this is a problem!)")

        print("\n--- Error logs ---")
        error_logs = [log for log in CONSOLE_LOGS if 'error' in log.lower() or 'PAGE_ERROR' in log or 'REQUEST_FAILED' in log]
        for log in error_logs:
            print(f"  {log}")
        if not error_logs:
            print("  (No errors)")

        print("\n--- ALL console logs ---")
        for log in CONSOLE_LOGS:
            print(f"  {log}")

        print("\n--- KEY CHECKS ---")
        print(f"  [i18n] Fetching translations for: ja → {'FOUND ✓' if i18n_fetch_ja else 'NOT FOUND ✗'}")
        print(f"  [i18n] Received translations for: ja → {'FOUND ✓' if i18n_received_ja else 'NOT FOUND ✗'}")
        print(f"  [i18n] Failed for: ja → {'FOUND ✗' if i18n_error_ja else 'Not found (good)'}")
        print(f"  Sidebar has Chinese during ja mode → {'YES (BUG!) ✗' if chinese_check.get('hasChinese') else 'NO (correct) ✓'}")
        if chinese_check.get('foundWords'):
            print(f"    Chinese words found: {chinese_check['foundWords']}")
        print(f"  Chinese translation received after switch back → {'YES ✓' if i18n_received_zh else 'NOT FOUND ✗'}")
        print(f"  Chinese words in final UI → {has_chinese_final if has_chinese_final else 'None found'}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
