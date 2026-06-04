#!/usr/bin/env python3
"""Extended test: Test the cached language scenario (switch back and forth)."""

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

        page.on("request", on_request)
        page.on("response", on_response)

        # ===== PHASE 1: Initial load (Chinese) =====
        print("\n===== PHASE 1: Initial load =====")
        page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        time.sleep(2)
        page.screenshot(path=f"{SCREENSHOT_DIR}/p1_01_initial.png")
        
        initial_text = page.inner_text("body")
        print(f"Initial text (first 300): {initial_text[:300]}")

        # ===== PHASE 2: Switch to Japanese (first time) =====
        print("\n===== PHASE 2: Switch to Japanese (first time) =====")
        
        # Open settings
        page.locator('button:has(svg.lucide-settings)').first.click()
        time.sleep(1)
        
        # Open language dropdown
        lang_btn = page.locator('div.relative button:has(svg.lucide-chevron-down)').last
        lang_btn.click()
        time.sleep(0.5)
        
        # Select Japanese
        page.locator('button:has-text("日本語")').first.click()
        time.sleep(0.5)
        
        # Save
        page.locator('button:has-text("保存")').first.click()
        time.sleep(2)
        
        # Wait for translation
        print("Waiting for translate_ui/ja response...")
        start = time.time()
        while time.time() - start < 120:
            if any(r for r in translate_responses if '/ja' in r['url']):
                print(f"Got ja response after {time.time()-start:.1f}s")
                break
            time.sleep(1)
        
        time.sleep(3)  # Wait for UI to update
        page.screenshot(path=f"{SCREENSHOT_DIR}/p2_01_after_ja.png")
        
        after_ja_text = page.inner_text("body")
        print(f"After JA switch (first 300): {after_ja_text[:300]}")
        
        # Check if Japanese
        ja_check_1 = page.evaluate("""() => {
            const body = document.body.innerText;
            return {
                hasHiragana: /[\\u3040-\\u309F]/.test(body),
                hasKatakana: /[\\u30A0-\\u30FF]/.test(body),
                hasDirectInput: body.includes('直接入力'),
                hasAutoTranslate: body.includes('自動翻訳'),
            };
        }""")
        print(f"Japanese check after first switch: {ja_check_1}")

        # ===== PHASE 3: Switch back to Chinese =====
        print("\n===== PHASE 3: Switch back to Chinese =====")
        
        # Open settings
        page.locator('button:has(svg.lucide-settings)').first.click()
        time.sleep(1)
        
        # Open language dropdown
        lang_btn = page.locator('div.relative button:has(svg.lucide-chevron-down)').last
        lang_btn.click()
        time.sleep(0.5)
        
        # Select Chinese
        page.locator('button:has-text("简体中文")').first.click()
        time.sleep(0.5)
        
        # Save
        page.locator('button:has-text("保存")').first.click()
        time.sleep(2)
        
        page.screenshot(path=f"{SCREENSHOT_DIR}/p3_01_after_zh.png")
        
        after_zh_text = page.inner_text("body")
        print(f"After ZH switch (first 300): {after_zh_text[:300]}")
        
        zh_check = page.evaluate("""() => {
            const body = document.body.innerText;
            return {
                hasDirectInput: body.includes('直接输入'),
                hasAutoTranslate: body.includes('自动翻译'),
            };
        }""")
        print(f"Chinese check after switch back: {zh_check}")

        # ===== PHASE 4: Switch to Japanese again (should be cached) =====
        print("\n===== PHASE 4: Switch to Japanese again (cached) =====")
        
        # Clear network tracking
        translate_requests.clear()
        translate_responses.clear()
        
        # Open settings
        page.locator('button:has(svg.lucide-settings)').first.click()
        time.sleep(1)
        
        # Open language dropdown
        lang_btn = page.locator('div.relative button:has(svg.lucide-chevron-down)').last
        lang_btn.click()
        time.sleep(0.5)
        
        # Select Japanese
        page.locator('button:has-text("日本語")').first.click()
        time.sleep(0.5)
        
        # Save
        page.locator('button:has-text("保存")').first.click()
        time.sleep(3)  # Should be instant if cached
        
        page.screenshot(path=f"{SCREENSHOT_DIR}/p4_01_after_ja_cached.png")
        
        after_ja_cached_text = page.inner_text("body")
        print(f"After JA cached switch (first 300): {after_ja_cached_text[:300]}")
        
        # Check if Japanese
        ja_check_2 = page.evaluate("""() => {
            const body = document.body.innerText;
            return {
                hasHiragana: /[\\u3040-\\u309F]/.test(body),
                hasKatakana: /[\\u30A0-\\u30FF]/.test(body),
                hasDirectInput: body.includes('直接入力'),
                hasAutoTranslate: body.includes('自動翻訳'),
            };
        }""")
        print(f"Japanese check after cached switch: {ja_check_2}")
        
        # Check if a new API request was made
        print(f"New translate_ui requests after cached switch: {len(translate_requests)}")
        if translate_requests:
            print("  (A new API request was made - language was NOT cached in loadedLangs)")
        else:
            print("  (No new API request - language WAS cached in loadedLangs)")

        # ===== PHASE 5: Switch to French (another new language) =====
        print("\n===== PHASE 5: Switch to French (another new language) =====")
        
        translate_requests.clear()
        translate_responses.clear()
        
        # Open settings
        page.locator('button:has(svg.lucide-settings)').first.click()
        time.sleep(1)
        
        # Open language dropdown
        lang_btn = page.locator('div.relative button:has(svg.lucide-chevron-down)').last
        lang_btn.click()
        time.sleep(0.5)
        
        # Select French
        page.locator('button:has-text("Français")').first.click()
        time.sleep(0.5)
        
        # Save
        page.locator('button:has-text("保存")').first.click()
        time.sleep(2)
        
        # Wait for translation
        print("Waiting for translate_ui/fr response...")
        start = time.time()
        while time.time() - start < 120:
            if any(r for r in translate_responses if '/fr' in r['url']):
                print(f"Got fr response after {time.time()-start:.1f}s")
                break
            time.sleep(1)
        
        time.sleep(3)
        page.screenshot(path=f"{SCREENSHOT_DIR}/p5_01_after_fr.png")
        
        after_fr_text = page.inner_text("body")
        print(f"After FR switch (first 300): {after_fr_text[:300]}")
        
        fr_check = page.evaluate("""() => {
            const body = document.body.innerText;
            return {
                hasFrench: /[àâéèêëîïôùûüÿç]/i.test(body),
                hasDirectInput: body.includes('Saisie directe') || body.includes('直接入力') || body.includes('直接输入'),
                tagline: body.includes('langue') || body.includes('言語学習') || body.includes('语言学习'),
            };
        }""")
        print(f"French check after switch: {fr_check}")

        # ===== FINAL ANALYSIS =====
        print("\n" + "=" * 60)
        print("=== FINAL ANALYSIS ===")
        print("=" * 60)
        
        print(f"\nPhase 1 (Initial - Chinese): 直接输入={initial_text.includes('直接输入')}, 自动翻译={initial_text.includes('自动翻译')}")
        print(f"Phase 2 (First JA switch): hasHiragana={ja_check_1['hasHiragana']}, 直接入力={ja_check_1['hasDirectInput']}")
        print(f"Phase 3 (Back to ZH): 直接输入={zh_check['hasDirectInput']}, 自动翻译={zh_check['hasAutoTranslate']}")
        print(f"Phase 4 (Cached JA switch): hasHiragana={ja_check_2['hasHiragana']}, 直接入力={ja_check_2['hasDirectInput']}")
        print(f"Phase 5 (FR switch): hasFrench={fr_check['hasFrench']}")
        
        # Bug analysis
        bugs_found = []
        
        if not ja_check_1['hasDirectInput']:
            bugs_found.append("Phase 2: UI did NOT update to Japanese after first switch (no refresh)")
        
        if not zh_check['hasDirectInput']:
            bugs_found.append("Phase 3: UI did NOT update back to Chinese after switch back")
        
        if not ja_check_2['hasDirectInput']:
            bugs_found.append("Phase 4: UI did NOT update to Japanese after cached switch (THIS IS THE REPORTED BUG)")
        
        if not fr_check['hasFrench']:
            bugs_found.append("Phase 5: UI did NOT update to French after switch")
        
        if bugs_found:
            print("\n*** BUGS FOUND ***")
            for bug in bugs_found:
                print(f"  - {bug}")
        else:
            print("\n*** NO BUGS FOUND ***")
            print("All language switches updated the UI correctly without page refresh.")
            print("The reported bug could not be reproduced in this test.")

        browser.close()
        print("\nTest complete!")

if __name__ == "__main__":
    import os
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    main()
