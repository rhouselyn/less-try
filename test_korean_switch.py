#!/usr/bin/env python3
"""
Test: Gualingo Korean (ko) language switching with LLM translation
- Delete any cached ko translation file
- Switch native language to Korean via Settings modal
- Monitor console logs for [i18n] messages
- Wait up to 180 seconds for LLM translation
- Verify UI changed to Korean
"""

import asyncio
import json
import os
from playwright.async_api import async_playwright

APP_URL = "http://localhost:5174"
SCREENSHOT_DIR = "/workspace/test_screenshots_ko"

async def main():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)

    # Delete any cached ko translation file
    ko_cache = "/workspace/config/ui_translations/ko.json"
    if os.path.exists(ko_cache):
        os.remove(ko_cache)
        print(f"[PREP] Deleted cached ko translation: {ko_cache}")
    else:
        print(f"[PREP] No cached ko translation found at {ko_cache}")

    # Also check if there's a ko.json in the frontend
    for root, dirs, files in os.walk("/workspace"):
        for f in files:
            if f == "ko.json":
                fp = os.path.join(root, f)
                print(f"[PREP] Found ko.json at: {fp}")

    console_logs = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            locale="zh-CN"
        )
        page = await context.new_page()

        # Listen for ALL console messages
        page.on("console", lambda msg: console_logs.append({
            "type": msg.type,
            "text": msg.text
        }))

        # Step 1: Open the app
        print("\n[1] Opening http://localhost:5174 ...")
        await page.goto(APP_URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)

        await page.screenshot(path=f"{SCREENSHOT_DIR}/01_initial.png")
        print("[1] Initial screenshot saved.")

        # Step 2: Click the Settings (gear) icon
        print("\n[2] Clicking Settings gear icon...")
        settings_btn = page.locator("button:has(svg.lucide-settings)")
        if await settings_btn.count() == 0:
            settings_btn = page.locator("button.absolute.top-3")
        await settings_btn.click()
        await page.wait_for_timeout(1500)

        await page.screenshot(path=f"{SCREENSHOT_DIR}/02_settings_opened.png")
        print("[2] Settings modal opened. Screenshot saved.")

        # Step 3: Find and click the native language selector
        print("\n[3] Looking for native language selector...")
        # The NativeLangSelector button has a chevron-down icon and shows current language name
        native_lang_btn = page.locator(".fixed button:has(svg.lucide-chevron-down)").last
        btn_count = await native_lang_btn.count()
        print(f"[3] Native lang selector button count: {btn_count}")

        if btn_count == 0:
            # Fallback: find by text content
            all_modal_buttons = await page.locator(".fixed.z-50 button").all_text_contents()
            print(f"[3] All buttons in modal: {all_modal_buttons}")
            for btn_text in all_modal_buttons:
                if btn_text and any(lang in btn_text for lang in ["中文", "English", "한국어", "日本語"]):
                    native_lang_btn = page.locator(".fixed.z-50 button", has_text=btn_text).first
                    break

        if await native_lang_btn.count() > 0:
            btn_text = await native_lang_btn.text_content()
            print(f"[3] Native lang selector shows: '{btn_text}'")

        # Step 4: Click the native language selector to open the dropdown
        print("\n[4] Opening native language dropdown...")
        await native_lang_btn.click()
        await page.wait_for_timeout(800)

        await page.screenshot(path=f"{SCREENSHOT_DIR}/03_lang_dropdown_open.png")
        print("[4] Language dropdown opened. Screenshot saved.")

        # Step 5: Select Korean (ko) - look for "한국어" in the dropdown
        print("\n[5] Selecting Korean (ko) - looking for '한국어'...")
        korean_option = page.locator("button:has-text('한국어')").first
        ko_count = await korean_option.count()
        print(f"[5] Korean option count: {ko_count}")

        if ko_count == 0:
            # Try searching for Korean in the search box
            search_input = page.locator("input[placeholder='Search...']")
            if await search_input.count() > 0:
                await search_input.fill("ko")
                await page.wait_for_timeout(500)
                korean_option = page.locator("button:has-text('한국어')").first
                ko_count = await korean_option.count()
                print(f"[5] After search, Korean option count: {ko_count}")

        if ko_count == 0:
            # Try "Korean" text
            korean_option = page.locator("button:has-text('Korean')").first
            ko_count = await korean_option.count()
            print(f"[5] 'Korean' option count: {ko_count}")

        if ko_count > 0:
            await korean_option.click()
            await page.wait_for_timeout(500)
            print("[5] Korean selected.")
        else:
            # List all available options
            all_dropdown_btns = await page.locator(".absolute.z-50 button").all_text_contents()
            print(f"[5] All dropdown buttons: {all_dropdown_btns}")
            print("[5] ❌ Could not find Korean option!")
            await browser.close()
            return

        await page.screenshot(path=f"{SCREENSHOT_DIR}/04_korean_selected.png")
        print("[5] Korean selected. Screenshot saved.")

        # Verify the selector now shows Korean
        new_btn_text = await native_lang_btn.text_content()
        print(f"[5] Native lang selector now shows: '{new_btn_text}'")

        # Step 6: Click the Save button
        print("\n[6] Clicking Save button...")
        save_btn = page.locator("button:has-text('保存')")
        if await save_btn.count() == 0:
            save_btn = page.locator("button:has-text('Save')")
        await save_btn.click()
        print("[6] Save button clicked.")

        # Step 7: Wait up to 180 seconds for the LLM translation to complete
        print("\n[7] Waiting for LLM translation (up to 180 seconds)...")
        
        # Poll for [i18n] console logs
        start_time = asyncio.get_event_loop().time()
        translation_completed = False
        translation_failed = False
        fetch_detected = False
        
        while (asyncio.get_event_loop().time() - start_time) < 180:
            await page.wait_for_timeout(2000)
            elapsed = asyncio.get_event_loop().time() - start_time
            
            # Check console logs for i18n messages
            i18n_logs = [log for log in console_logs if "[i18n]" in log["text"]]
            
            for log in i18n_logs:
                if "Fetching translations for: ko" in log["text"]:
                    if not fetch_detected:
                        fetch_detected = True
                        print(f"[7] [{elapsed:.0f}s] ✅ Detected: {log['text']}")
                
                if "Received translations for: ko" in log["text"]:
                    if not translation_completed and not translation_failed:
                        translation_completed = True
                        print(f"[7] [{elapsed:.0f}s] ✅ Detected: {log['text']}")
                        # Check lang_code
                        if "lang_code: ko" in log["text"]:
                            print(f"[7] [{elapsed:.0f}s] ✅ lang_code is 'ko' - SUCCESS!")
                        elif "lang_code: null" in log["text"]:
                            print(f"[7] [{elapsed:.0f}s] ❌ lang_code is null - FAILURE!")
                            translation_failed = True
                        elif "lang_code: None" in log["text"]:
                            print(f"[7] [{elapsed:.0f}s] ❌ lang_code is None - FAILURE!")
                            translation_failed = True
                        else:
                            print(f"[7] [{elapsed:.0f}s] ℹ️ lang_code info: {log['text']}")
                
                if "Translation failed for: ko" in log["text"]:
                    if not translation_failed:
                        translation_failed = True
                        print(f"[7] [{elapsed:.0f}s] ❌ Detected: {log['text']}")
                
                if "Failed to fetch translations for: ko" in log["text"]:
                    if not translation_failed:
                        translation_failed = True
                        print(f"[7] [{elapsed:.0f}s] ❌ Detected: {log['text']}")
            
            if translation_completed or translation_failed:
                # Wait a bit more for UI to update
                await page.wait_for_timeout(3000)
                break
            
            if int(elapsed) % 15 == 0 and elapsed > 0:
                print(f"[7] [{elapsed:.0f}s] Still waiting for translation...")
        
        elapsed = asyncio.get_event_loop().time() - start_time
        if not translation_completed and not translation_failed:
            print(f"[7] [{elapsed:.0f}s] ⏰ TIMEOUT: No translation response received within 180 seconds!")

        # Step 8: Take screenshot of final state
        print("\n[8] Taking final screenshot...")
        await page.screenshot(path=f"{SCREENSHOT_DIR}/05_final_state.png", full_page=True)
        print("[8] Final screenshot saved.")

        # Step 9: Check the UI for Korean text
        print("\n[9] Checking UI for Korean text...")
        page_text = await page.text_content("body")
        
        korean_indicators = [
            "시작", "학습", "언어", "설정", "입력",  # Common Korean words
            "배우", "번역", "단어",  # More Korean words
        ]
        chinese_indicators = [
            "输入文本，开始你的语言学习之旅",  # Original Chinese tagline
            "开始学习",  # Chinese for Start Learning
        ]
        
        found_korean = []
        found_chinese = []
        
        for indicator in korean_indicators:
            if indicator in (page_text or ""):
                found_korean.append(indicator)
        
        for indicator in chinese_indicators:
            if indicator in (page_text or ""):
                found_chinese.append(indicator)
        
        print(f"[9] Korean indicators found: {found_korean}")
        print(f"[9] Chinese indicators still present: {found_chinese}")
        
        # Print first 500 chars of page text
        if page_text:
            print(f"[9] Page text (first 500 chars): {page_text[:500]}")

        # Print ALL console logs
        print("\n" + "="*80)
        print("ALL CONSOLE LOGS")
        print("="*80)
        for i, log in enumerate(console_logs):
            print(f"  [{i}] ({log['type']}) {log['text']}")
        
        # Print [i18n] specific logs
        print("\n" + "="*80)
        print("[i18n] SPECIFIC LOGS")
        print("="*80)
        i18n_logs = [log for log in console_logs if "[i18n]" in log["text"]]
        if i18n_logs:
            for i, log in enumerate(i18n_logs):
                print(f"  [{i}] ({log['type']}) {log['text']}")
        else:
            print("  No [i18n] logs found!")

        # Summary
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        print(f"\nFetch detected: {'✅ YES' if fetch_detected else '❌ NO'}")
        print(f"Translation completed: {'✅ YES' if translation_completed else '❌ NO'}")
        print(f"Translation failed: {'❌ YES' if translation_failed else '✅ NO'}")
        print(f"Korean text in UI: {'✅ YES' if found_korean else '❌ NO'} ({found_korean})")
        print(f"Chinese text remains: {'⚠️ YES' if found_chinese else '✅ NO'} ({found_chinese})")
        
        if translation_completed and not translation_failed and found_korean:
            print("\n🎉 OVERALL: SUCCESS - Korean language switching works!")
        elif translation_completed and not translation_failed and not found_korean:
            print("\n⚠️ OVERALL: PARTIAL - Translation API succeeded but UI may not show Korean")
        elif translation_failed:
            print("\n❌ OVERALL: FAILURE - LLM translation failed")
        elif not fetch_detected:
            print("\n❌ OVERALL: FAILURE - No [i18n] fetch was triggered")
        else:
            print("\n❌ OVERALL: FAILURE - Translation did not complete")

        # Check if ko.json was created
        if os.path.exists(ko_cache):
            print(f"\n✅ Cache file created: {ko_cache}")
            with open(ko_cache, 'r') as f:
                ko_data = json.load(f)
                print(f"   Keys count: {len(ko_data)}")
                if '_lang_code' in ko_data:
                    print(f"   _lang_code: {ko_data['_lang_code']}")
                # Print a few sample translations
                sample_keys = list(ko_data.keys())[:5]
                for k in sample_keys:
                    if not k.startswith('_'):
                        print(f"   {k}: {ko_data[k]}")
        else:
            print(f"\n❌ Cache file NOT created: {ko_cache}")

        print(f"\nScreenshots saved to: {SCREENSHOT_DIR}/")

        await browser.close()

asyncio.run(main())
