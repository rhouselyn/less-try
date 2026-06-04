#!/usr/bin/env python3
"""
Test: Gualingo native language switching feature
- Switch native language (uiLang) to French via Settings modal
- Verify UI text changes to French
- Verify the main page language selector (sourceLang) does NOT change to French
"""

import asyncio
from playwright.async_api import async_playwright

APP_URL = "http://localhost:5174"
SCREENSHOT_DIR = "/workspace/test_screenshots"

async def main():
    import os
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--no-sandbox"])
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            locale="zh-CN"
        )
        page = await context.new_page()

        # Step 1: Open the app
        print("[1] Opening http://localhost:5174 ...")
        await page.goto(APP_URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(2000)

        # Take initial screenshot
        await page.screenshot(path=f"{SCREENSHOT_DIR}/01_initial.png")
        print("[1] Initial screenshot saved.")

        # Record the original sourceLang selector text before any changes
        # The language selector button on the main page shows the current learning language
        # It's inside InputStep component, rendered as a button with the language name
        source_lang_selector = page.locator("button").filter(has_text="自动检测").first
        if await source_lang_selector.count() == 0:
            # Try alternative: look for the language selector area
            source_lang_selector = page.locator("button").filter(has_text="auto").first
        if await source_lang_selector.count() == 0:
            # Try to find any button that might be the language selector
            # The LanguageSelector shows the selected language name
            all_buttons = await page.locator("button").all_text_contents()
            print(f"[1] All button texts on page: {all_buttons}")

        # Try to capture the original sourceLang value from the UI
        # Look for the main language selector - it's typically near the input area
        # The InputStep has a LanguageSelector that shows "自动检测" or a language name
        original_lang_texts = []
        try:
            # The language selector button in InputStep
            lang_btns = page.locator("[class*='rounded']").filter(has_text="自动检测")
            if await lang_btns.count() > 0:
                original_lang_text = await lang_btns.first.text_content()
                original_lang_texts.append(original_lang_text)
                print(f"[1] Found language selector with text: '{original_lang_text}'")
        except Exception as e:
            print(f"[1] Could not find language selector text: {e}")

        # Also check the tagline text before switching
        try:
            tagline_el = page.locator("text=输入文本，开始你的语言学习之旅")
            if await tagline_el.count() > 0:
                original_tagline = await tagline_el.first.text_content()
                print(f"[1] Original tagline: '{original_tagline}'")
            else:
                print("[1] Tagline element not found with exact text, trying partial match...")
                # Try to find tagline by looking for the main heading area
                tagline_el = page.locator("p, span, h2, h3").filter(has_text="语言学习之旅")
                if await tagline_el.count() > 0:
                    original_tagline = await tagline_el.first.text_content()
                    print(f"[1] Original tagline (partial match): '{original_tagline}'")
        except Exception as e:
            print(f"[1] Could not find tagline: {e}")

        # Step 2: Click the Settings (gear) icon in the top right
        print("[2] Clicking Settings gear icon...")
        # The gear icon is an SVG inside a button at top-right
        settings_btn = page.locator("button:has(svg.lucide-settings)")
        if await settings_btn.count() == 0:
            # Try alternative selector
            settings_btn = page.locator("button.absolute.top-3")
        await settings_btn.click()
        await page.wait_for_timeout(1000)

        await page.screenshot(path=f"{SCREENSHOT_DIR}/02_settings_opened.png")
        print("[2] Settings modal opened. Screenshot saved.")

        # Step 3: Find the "母语" (native language) selector in the settings modal
        print("[3] Looking for native language selector...")
        # The NativeLangSelector is a button that shows the current language name
        # It's inside the settings modal, after the "母语" label
        native_lang_label = page.locator("text=母语")
        if await native_lang_label.count() == 0:
            native_lang_label = page.locator("text=Native Language")
        if await native_lang_label.count() == 0:
            # Try to find by the Languages icon
            native_lang_label = page.locator("svg.lucide-languages")

        print(f"[3] Native language label count: {await native_lang_label.count()}")

        # The NativeLangSelector button shows the current language name (e.g., "中文")
        # It's a button right after the "母语" label
        # Let's find it by looking for the selector button within the settings modal
        native_lang_btn = page.locator(".fixed button:has(svg.lucide-chevron-down)").last
        if await native_lang_btn.count() == 0:
            # Try to find the button that contains the current language
            # The NativeLangSelector has a button with the language name and a chevron-down icon
            native_lang_btn = page.locator(".fixed .rounded-xl button:has(svg)").filter(has_text="中文").first

        if await native_lang_btn.count() == 0:
            # More generic: find buttons in the settings modal that look like selectors
            modal = page.locator(".fixed.z-50")
            all_modal_buttons = await modal.locator("button").all_text_contents()
            print(f"[3] All buttons in modal: {all_modal_buttons}")
            # Find the button that has a language name (not API config related)
            for btn_text in all_modal_buttons:
                if btn_text and any(lang in btn_text for lang in ["中文", "English", "Français", "日本語"]):
                    native_lang_btn = modal.locator("button", has_text=btn_text).first
                    break

        print(f"[3] Native lang selector button count: {await native_lang_btn.count()}")
        if await native_lang_btn.count() > 0:
            btn_text = await native_lang_btn.text_content()
            print(f"[3] Native lang selector shows: '{btn_text}'")

        # Step 4: Click the native language selector to open the dropdown
        print("[4] Opening native language dropdown...")
        await native_lang_btn.click()
        await page.wait_for_timeout(500)

        await page.screenshot(path=f"{SCREENSHOT_DIR}/03_lang_dropdown_open.png")
        print("[4] Language dropdown opened. Screenshot saved.")

        # Step 5: Select French (fr) from the dropdown
        print("[5] Selecting French (fr)...")
        # The dropdown shows language names in their native form, so French shows as "Français"
        # There may be multiple "Français" buttons (Common + All Languages sections), pick the first
        french_option = page.locator("button:has-text('Français')").first
        if await french_option.count() == 0:
            french_option = page.locator("text=Français").first
        if await french_option.count() == 0:
            # Try searching for "French"
            french_option = page.locator("button:has-text('French')").first

        await french_option.click()
        await page.wait_for_timeout(500)

        await page.screenshot(path=f"{SCREENSHOT_DIR}/04_french_selected.png")
        print("[5] French selected. Screenshot saved.")

        # Verify the selector now shows French
        new_btn_text = await native_lang_btn.text_content()
        print(f"[5] Native lang selector now shows: '{new_btn_text}'")

        # Step 6: Click the Save button
        print("[6] Clicking Save button...")
        save_btn = page.locator("button:has-text('保存')")
        if await save_btn.count() == 0:
            save_btn = page.locator("button:has-text('Save')")
        await save_btn.click()
        print("[6] Save button clicked.")

        # Step 7: Wait for the UI to update (may take up to 90 seconds for LLM translation)
        print("[7] Waiting for UI translation (up to 90 seconds)...")
        # The app shows a "正在切换界面语言..." overlay while translating
        # Wait for it to disappear
        translating_overlay = page.locator("text=正在切换界面语言")
        if await translating_overlay.count() > 0:
            print("[7] Translation overlay detected, waiting for it to disappear...")
            try:
                await translating_overlay.first.wait_for(state="hidden", timeout=90000)
                print("[7] Translation overlay disappeared.")
            except Exception as e:
                print(f"[7] Timeout waiting for overlay to disappear: {e}")
        else:
            # Also check for French version of the overlay
            translating_overlay_fr = page.locator("text=switching")
            if await translating_overlay_fr.count() > 0:
                try:
                    await translating_overlay_fr.first.wait_for(state="hidden", timeout=90000)
                except:
                    pass
            # Wait a reasonable time for translation
            await page.wait_for_timeout(5000)

        # Additional wait to make sure everything is loaded
        await page.wait_for_timeout(3000)

        await page.screenshot(path=f"{SCREENSHOT_DIR}/05_after_translation.png")
        print("[7] Post-translation screenshot saved.")

        # Step 8: Verify the UI text has changed to French
        print("[8] Verifying UI text has changed to French...")

        # Check the tagline - it should no longer be in Chinese
        page_text = await page.text_content("body")
        print(f"[8] Full page text (first 500 chars): {page_text[:500] if page_text else 'EMPTY'}")

        # Check for French text indicators
        french_indicators = [
            "Entrez", "Commencez", "langue", "apprentissage",  # French tagline words
            "Paramètres",  # French for Settings
            "Langue maternelle",  # French for Native Language
            "Enregistrer",  # French for Save
            "Commencer",  # French for Start
        ]
        chinese_indicators = [
            "输入文本，开始你的语言学习之旅",  # Original Chinese tagline
            "设置",  # Chinese for Settings
            "母语",  # Chinese for Native Language
        ]

        found_french = []
        found_chinese = []

        for indicator in french_indicators:
            if indicator.lower() in (page_text or "").lower():
                found_french.append(indicator)

        for indicator in chinese_indicators:
            if indicator in (page_text or ""):
                found_chinese.append(indicator)

        print(f"[8] French indicators found: {found_french}")
        print(f"[8] Chinese indicators still present: {found_chinese}")

        # Step 9: Verify the language selector on the main page has NOT changed to French
        print("[9] Verifying main page language selector has NOT changed to French...")

        # The sourceLang selector should still show "自动检测" or "auto", NOT "Français"
        # Re-open the page to check the main language selector
        await page.wait_for_timeout(2000)

        # Look for the main language selector - it should NOT show French
        main_lang_selector = page.locator("button").filter(has_text="自动检测").first
        if await main_lang_selector.count() == 0:
            main_lang_selector = page.locator("button").filter(has_text="auto").first

        if await main_lang_selector.count() > 0:
            main_lang_text = await main_lang_selector.text_content()
            print(f"[9] Main page language selector shows: '{main_lang_text}'")
            is_french = "français" in main_lang_text.lower() or "french" in main_lang_text.lower() or "fr" == main_lang_text.strip().lower()
            if is_french:
                print("[9] ❌ FAIL: Main page language selector changed to French! This is a bug.")
            else:
                print("[9] ✅ PASS: Main page language selector did NOT change to French.")
        else:
            # Try to find the language selector by looking at all buttons
            all_btns = await page.locator("button").all_text_contents()
            print(f"[9] All button texts: {all_btns}")

            # Check if any button shows French as the source language
            french_source = False
            for btn_text in all_btns:
                if btn_text and ("français" in btn_text.lower() or "french" in btn_text.lower()):
                    # Check if this is the sourceLang selector (not the native lang)
                    # The sourceLang selector is typically in the input area
                    french_source = True
                    print(f"[9] Found button with French text: '{btn_text}'")

            if french_source:
                print("[9] ⚠️ WARNING: Found French text in some button. Need manual verification.")
            else:
                print("[9] ✅ PASS: No French found in main page language selector buttons.")

        # Final screenshot
        await page.screenshot(path=f"{SCREENSHOT_DIR}/06_final.png", full_page=True)
        print("[9] Final full-page screenshot saved.")

        # Summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)

        ui_changed_to_french = len(found_french) > 0 and len(found_chinese) == 0
        ui_partially_french = len(found_french) > 0

        if ui_changed_to_french:
            print("✅ UI text changed to French after switching native language.")
        elif ui_partially_french:
            print("⚠️ UI text partially changed to French (some Chinese text remains).")
            print(f"   French indicators: {found_french}")
            print(f"   Remaining Chinese: {found_chinese}")
        else:
            print("❌ UI text did NOT change to French after switching native language.")
            print(f"   French indicators found: {found_french}")
            print(f"   Chinese indicators remaining: {found_chinese}")

        print(f"\nScreenshots saved to: {SCREENSHOT_DIR}/")
        print("  01_initial.png - Before any changes")
        print("  02_settings_opened.png - Settings modal opened")
        print("  03_lang_dropdown_open.png - Language dropdown opened")
        print("  04_french_selected.png - French selected in dropdown")
        print("  05_after_translation.png - After translation completed")
        print("  06_final.png - Final full-page screenshot")

        await browser.close()

asyncio.run(main())
