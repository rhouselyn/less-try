#!/usr/bin/env python3
"""Test script to reproduce the Gualingo UI text not updating bug after language switch."""

import time
import json
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = "/workspace/screenshots"
BASE_URL = "http://localhost:5174"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 900},
            locale="zh-CN"
        )
        page = context.new_page()

        # Track network requests for translate_ui
        translate_requests = []
        translate_responses = []

        def on_request(request):
            if "/api/translate_ui" in request.url:
                translate_requests.append({
                    "url": request.url,
                    "method": request.method,
                    "timestamp": time.time()
                })
                print(f"[NETWORK] Request: {request.method} {request.url}")

        def on_response(response):
            if "/api/translate_ui" in response.url:
                try:
                    body = response.text()
                except:
                    body = "<could not read body>"
                translate_responses.append({
                    "url": response.url,
                    "status": response.status,
                    "body": body[:3000],
                    "timestamp": time.time()
                })
                print(f"[NETWORK] Response: {response.status} {response.url}")
                print(f"[NETWORK] Body preview: {body[:500]}")

        page.on("request", on_request)
        page.on("response", on_response)

        # Step 1: Open the page
        print("\n=== Step 1: Opening page ===")
        page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        time.sleep(2)
        page.screenshot(path=f"{SCREENSHOT_DIR}/01_initial_page.png")
        print("Screenshot: 01_initial_page.png")

        # Get initial UI text
        initial_body_text = page.inner_text("body")
        print(f"\nInitial page text (first 500 chars):\n{initial_body_text[:500]}")

        # Step 2: Click Settings gear icon
        print("\n=== Step 2: Clicking Settings ===")
        # The settings button is an absolute positioned button with Settings icon
        settings_btn = page.locator('button:has(svg.lucide-settings)').first
        settings_btn.click()
        time.sleep(1)
        page.screenshot(path=f"{SCREENSHOT_DIR}/02_settings_opened.png")
        print("Screenshot: 02_settings_opened.png")

        # Step 3: Change native language to Japanese
        print("\n=== Step 3: Changing language to Japanese ===")
        # The NativeLangSelector is a custom dropdown
        # First, find and click the language selector button (shows "ZH 简体中文")
        # It's inside the settings modal, under the "母语" label
        
        # Find the language selector button - it contains the current language name and a ChevronDown icon
        lang_selector_btn = page.locator('div.relative button:has(svg.lucide-chevron-down)').last
        lang_selector_btn.click()
        time.sleep(0.5)
        page.screenshot(path=f"{SCREENSHOT_DIR}/03_lang_dropdown_open.png")
        print("Screenshot: 03_lang_dropdown_open.png")

        # Now find and click the Japanese option in the dropdown
        # The dropdown shows language names in their native script
        # Japanese is "日本語" and has value "ja"
        # It's in the "Common" section
        ja_option = page.locator('button:has-text("日本語")').first
        ja_option.click()
        time.sleep(0.5)
        page.screenshot(path=f"{SCREENSHOT_DIR}/04_japanese_selected.png")
        print("Screenshot: 04_japanese_selected.png")

        # Verify the language was selected
        lang_btn_text = lang_selector_btn.inner_text()
        print(f"Language selector now shows: {lang_btn_text}")

        # Step 4: Click Save
        print("\n=== Step 4: Clicking Save ===")
        save_btn = page.locator('button:has-text("保存")').first
        save_btn.click()
        time.sleep(2)
        page.screenshot(path=f"{SCREENSHOT_DIR}/05_after_save.png")
        print("Screenshot: 05_after_save.png")

        # Step 5: Wait for LLM translation (up to 120 seconds)
        print("\n=== Step 5: Waiting for LLM translation (up to 120s) ===")

        # Wait for the translate_ui API response
        start_time = time.time()
        timeout = 120
        got_response = False

        while time.time() - start_time < timeout:
            if translate_responses:
                got_response = True
                print(f"translate_ui response received after {time.time() - start_time:.1f}s")
                break
            
            # Check for loading overlay
            try:
                loading_overlay = page.locator('.backdrop-blur-sm:has(svg.lucide-loader-2)').first
                if loading_overlay.is_visible(timeout=500):
                    print(f"Loading overlay visible at {time.time() - start_time:.1f}s")
            except:
                pass
            
            time.sleep(1)
            elapsed = time.time() - start_time
            if int(elapsed) % 10 == 0:
                print(f"  Still waiting... {elapsed:.0f}s elapsed")

        if not got_response:
            print(f"Timeout waiting for translate_ui response ({timeout}s)")
            # Check if maybe the language was already cached
            if translate_requests:
                print(f"  Requests were made: {len(translate_requests)}")
            else:
                print("  No translate_ui requests were made - language may be cached")

        # Wait a bit more for UI to update
        time.sleep(3)

        # Step 6: Take screenshot after translation
        print("\n=== Step 6: Taking screenshot after translation ===")
        page.screenshot(path=f"{SCREENSHOT_DIR}/06_after_translation.png")
        print("Screenshot: 06_after_translation.png")

        # Step 7: Check if UI text changed to Japanese
        print("\n=== Step 7: Checking UI text ===")
        after_body_text = page.inner_text("body")
        print(f"Page text after translation (first 800 chars):\n{after_body_text[:800]}")

        # Check for Japanese characters
        has_japanese = page.evaluate("""() => {
            const body = document.body.innerText;
            // Check for Japanese-specific characters (Hiragana, Katakana)
            const hiragana = /[\\u3040-\\u309F]/;
            const katakana = /[\\u30A0-\\u30FF]/;
            return {
                hasHiragana: hiragana.test(body),
                hasKatakana: katakana.test(body),
                hasChinese: /[\\u4E00-\\u9FFF]/.test(body),
            };
        }""")
        print(f"Character analysis: {has_japanese}")

        # Check for specific UI elements
        ui_text_check = page.evaluate("""() => {
            const body = document.body.innerText;
            // Chinese mode button texts
            const chineseTexts = ['直接输入', '自动翻译', '自由生成'];
            const found = chineseTexts.filter(t => body.includes(t));
            // Japanese mode button texts (expected)
            const japaneseTexts = ['直接入力', '自動翻訳', '自由生成'];
            const jaFound = japaneseTexts.filter(t => body.includes(t));
            return {
                chineseModeButtonsFound: found,
                chineseModeButtonsCount: found.length,
                japaneseModeButtonsFound: jaFound,
                japaneseModeButtonsCount: jaFound.length,
            };
        }""")
        print(f"UI text check: {ui_text_check}")

        # Step 8: Check React state
        print("\n=== Step 8: Checking React state ===")
        react_state = page.evaluate("""() => {
            const rootEl = document.getElementById('root');
            if (!rootEl) return { error: 'No root element' };

            const fiberKey = Object.keys(rootEl).find(k => k.startsWith('__reactFiber$'));
            
            let result = { fiberKey: fiberKey || null };

            // Check localStorage for language settings
            try {
                const lsKeys = Object.keys(localStorage);
                result.localStorageKeys = lsKeys;
                const relevantKeys = lsKeys.filter(k =>
                    k.includes('lang') || k.includes('trans') || k.includes('native') || k.includes('setting') || k.includes('pref')
                );
                result.relevantLocalStorage = {};
                for (const k of relevantKeys) {
                    result.relevantLocalStorage[k] = localStorage.getItem(k).substring(0, 500);
                }
            } catch(e) {
                result.localStorageError = e.message;
            }

            return result;
        }""")
        print(f"React state info: {json.dumps(react_state, indent=2, ensure_ascii=False)}")

        # Check the actual React component state via internal properties
        react_internal_state = page.evaluate("""() => {
            const rootEl = document.getElementById('root');
            if (!rootEl) return { error: 'No root element' };

            const fiberKey = Object.keys(rootEl).find(k => k.startsWith('__reactFiber$'));
            if (!fiberKey) return { error: 'No React fiber found' };

            let fiber = rootEl[fiberKey];
            let foundStates = {};
            let depth = 0;
            
            // Walk the fiber tree to find the App component's state
            while (fiber && depth < 100) {
                if (fiber.memoizedState) {
                    let stateNode = fiber.memoizedState;
                    let stateIdx = 0;
                    while (stateNode && stateIdx < 30) {
                        const q = stateNode.memoizedState;
                        if (q !== null && q !== undefined) {
                            // Try to detect uiLang and customTranslations
                            if (typeof q === 'string' && (q === 'zh' || q === 'en' || q === 'ja' || q === 'fr' || q === 'ko')) {
                                if (!foundStates.possibleUiLang) {
                                    foundStates.possibleUiLang = q;
                                }
                            }
                            if (typeof q === 'object' && q !== null && !Array.isArray(q)) {
                                const keys = Object.keys(q);
                                if (keys.includes('ja') || keys.includes('fr') || keys.includes('ko')) {
                                    foundStates.possibleCustomTranslations = {
                                        keys: keys,
                                        jaExists: 'ja' in q,
                                        jaPreview: q.ja ? JSON.stringify(q.ja).substring(0, 300) : null,
                                    };
                                }
                            }
                            if (q instanceof Set) {
                                const arr = Array.from(q);
                                if (arr.length > 0 && typeof arr[0] === 'string' && arr[0].length <= 3) {
                                    foundStates.possibleLoadedLangs = arr;
                                }
                            }
                        }
                        stateNode = stateNode.next;
                        stateIdx++;
                    }
                }
                fiber = fiber.return;
                depth++;
            }
            
            return foundStates;
        }""")
        print(f"React internal state: {json.dumps(react_internal_state, indent=2, ensure_ascii=False)}")

        # Step 9: Network request analysis
        print("\n=== Step 9: Network request analysis ===")
        print(f"translate_ui requests count: {len(translate_requests)}")
        for req in translate_requests:
            print(f"  Request: {req['method']} {req['url']}")
        print(f"translate_ui responses count: {len(translate_responses)}")
        for resp in translate_responses:
            print(f"  Response: status={resp['status']}")
            print(f"  Body (first 500 chars): {resp['body'][:500]}")

        # Step 10: Force refresh and compare
        print("\n=== Step 10: Refreshing page to compare ===")
        page.reload(wait_until="networkidle", timeout=30000)
        time.sleep(3)
        page.screenshot(path=f"{SCREENSHOT_DIR}/07_after_refresh.png")
        print("Screenshot: 07_after_refresh.png")

        refreshed_body_text = page.inner_text("body")
        print(f"Page text after refresh (first 800 chars):\n{refreshed_body_text[:800]}")

        # Check for Japanese after refresh
        has_japanese_after_refresh = page.evaluate("""() => {
            const body = document.body.innerText;
            const hiragana = /[\\u3040-\\u309F]/;
            const katakana = /[\\u30A0-\\u30FF]/;
            return {
                hasHiragana: hiragana.test(body),
                hasKatakana: katakana.test(body),
            };
        }""")
        print(f"Character analysis after refresh: {has_japanese_after_refresh}")

        # Check for specific Japanese UI texts after refresh
        ui_text_after_refresh = page.evaluate("""() => {
            const body = document.body.innerText;
            const japaneseTexts = ['直接入力', '自動翻訳', '自由生成'];
            const jaFound = japaneseTexts.filter(t => body.includes(t));
            const chineseTexts = ['直接输入', '自动翻译', '自由生成'];
            const cnFound = chineseTexts.filter(t => body.includes(t));
            return {
                japaneseFound: jaFound,
                chineseFound: cnFound,
            };
        }""")
        print(f"UI text after refresh: {ui_text_after_refresh}")

        # Final comparison
        print("\n" + "=" * 60)
        print("=== FINAL ANALYSIS ===")
        print("=" * 60)
        
        before_change = initial_body_text[:300]
        after_no_refresh = after_body_text[:300]
        after_refresh = refreshed_body_text[:300]
        
        print(f"\n1. Before language change:\n   {before_change}")
        print(f"\n2. After language change (NO refresh):\n   {after_no_refresh}")
        print(f"\n3. After page refresh:\n   {after_refresh}")

        # Determine if the bug exists
        bug_confirmed = False
        
        if after_no_refresh == initial_body_text:
            bug_confirmed = True
            print("\n*** BUG CONFIRMED: UI text did NOT change after language switch without page refresh! ***")
        elif not has_japanese.get("hasHiragana") and not has_japanese.get("hasKatakana"):
            bug_confirmed = True
            print("\n*** BUG CONFIRMED: No Japanese text found after language switch! ***")
        elif ui_text_check.get("chineseModeButtonsCount", 0) > 0 and ui_text_check.get("japaneseModeButtonsCount", 0) == 0:
            bug_confirmed = True
            print("\n*** BUG CONFIRMED: Chinese mode buttons still showing after language switch! ***")
        else:
            print("\nUI text appears to have changed correctly after language switch.")

        if has_japanese_after_refresh.get("hasHiragana") or has_japanese_after_refresh.get("hasKatakana"):
            print("After refresh: Japanese text IS present - the translation was saved but not applied to the UI in real-time.")
        elif ui_text_after_refresh.get("japaneseFound"):
            print("After refresh: Japanese UI text IS present - translation was saved but not applied in real-time.")
        else:
            print("After refresh: Japanese text is NOT present - the translation may not have been saved at all.")

        if bug_confirmed:
            print("\n*** ROOT CAUSE ANALYSIS ***")
            print("The bug is in App.jsx - the useEffect that watches uiLang checks loadedLangs.has(uiLang)")
            print("and returns early if the language was already loaded. However, the real issue is that")
            print("when the language is changed via Settings, the customTranslations state may not be")
            print("properly updated, or the t object computation doesn't trigger a re-render.")

        browser.close()
        print("\nTest complete!")

if __name__ == "__main__":
    import os
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    main()
