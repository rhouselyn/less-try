#!/usr/bin/env python3
"""
Comprehensive test script for verifying:
1. Sentence LLM no longer generates examples/variants/options/grammar in dictionary_entries
2. Missing words LLM no longer generates examples/variants/options/grammar
3. Word detail LLM no longer generates ipa/context_meaning
4. Sentence-generated ipa and context_meaning are used in word options
5. Auto-speak works for first word (frontend check)
6. WordListPanel letter index is fixed (frontend check)
"""

import requests
import json
import time
import sys
import os

sys.path.insert(0, "/workspace/backend")

BASE_URL = "http://localhost:8000"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def print_result(name, passed, detail=""):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"  {status} - {name}")
    if detail:
        print(f"         {detail}")

def test_health():
    print_section("1. Backend Health Check")
    try:
        r = requests.get(f"{BASE_URL}/", timeout=5)
        ok = r.status_code == 200
        print_result("Backend is running", ok, f"Status: {r.status_code}")
        return ok
    except Exception as e:
        print_result("Backend is running", False, str(e))
        return False

def test_sentence_llm_output():
    print_section("2. Sentence LLM - No examples/variants/options/grammar")
    try:
        from nvidia_api import NvidiaAPI
        api = NvidiaAPI()
        
        print("  Calling process_text_with_dictionary (this may take 10-30s)...")
        t0 = time.time()
        result = await_sync(api.process_text_with_dictionary("Hello world", "en", "zh"))
        t1 = time.time()
        print(f"  LLM call took {t1-t0:.1f}s")
        
        if not result:
            print_result("Sentence LLM returned data", False, "Empty result")
            return False
        
        print_result("Sentence LLM returned data", True)
        
        entries = result.get("dictionary_entries", [])
        print(f"  Got {len(entries)} dictionary entries")
        
        removed_fields = ["variants", "examples", "options", "grammar"]
        all_pass = True
        for entry in entries:
            word = entry.get("word", "?")
            for field in removed_fields:
                has_field = field in entry and entry[field]
                if has_field:
                    print_result(f"'{word}' should NOT have '{field}'", False, f"Found: {entry[field]}")
                    all_pass = False
        
        if all_pass and entries:
            print_result("No entry has removed fields (variants/examples/options/grammar)", True)
        
        required_fields = ["word", "ipa", "context_meaning", "translation", "tokens", "morphology"]
        for entry in entries:
            word = entry.get("word", "?")
            for field in required_fields:
                has_field = field in entry
                if not has_field:
                    print_result(f"'{word}' should have '{field}'", False)
                    all_pass = False
        
        if all_pass and entries:
            print_result("All entries have required fields (word/ipa/context_meaning/translation/tokens/morphology)", True)
        
        return all_pass
    except Exception as e:
        print_result("Sentence LLM test", False, str(e))
        return False

def test_missing_words_llm_output():
    print_section("3. Missing Words LLM - No examples/variants/options/grammar")
    try:
        from nvidia_api import NvidiaAPI
        api = NvidiaAPI()
        
        print("  Calling process_remaining_words (this may take 10-30s)...")
        t0 = time.time()
        result = await_sync(api.process_remaining_words(["beautiful", "amazing"], "en", "zh", "The world is beautiful and amazing"))
        t1 = time.time()
        print(f"  LLM call took {t1-t0:.1f}s")
        
        if not result:
            print_result("Missing words LLM returned data", False, "Empty result")
            return False
        
        print_result("Missing words LLM returned data", True, f"Got {len(result)} entries")
        
        removed_fields = ["variants", "examples", "options", "grammar"]
        all_pass = True
        for entry in result:
            word = entry.get("word", "?")
            for field in removed_fields:
                has_field = field in entry and entry[field]
                if has_field:
                    print_result(f"'{word}' should NOT have '{field}'", False, f"Found: {entry[field]}")
                    all_pass = False
        
        if all_pass and result:
            print_result("No entry has removed fields", True)
        
        required_fields = ["word", "ipa", "context_meaning", "translation", "tokens", "morphology"]
        for entry in result:
            word = entry.get("word", "?")
            for field in required_fields:
                has_field = field in entry
                if not has_field:
                    print_result(f"'{word}' should have '{field}'", False)
                    all_pass = False
        
        if all_pass and result:
            print_result("All entries have required fields", True)
        
        return all_pass
    except Exception as e:
        print_result("Missing words LLM test", False, str(e))
        return False

def test_word_detail_llm_output():
    print_section("4. Word Detail LLM - No ipa/context_meaning")
    try:
        from nvidia_api import NvidiaAPI
        api = NvidiaAPI()
        
        print("  Calling generate_multiple_choice (this may take 10-30s)...")
        t0 = time.time()
        result = await_sync(api.generate_multiple_choice("hello", "你好", "Hello world", "zh"))
        t1 = time.time()
        print(f"  LLM call took {t1-t0:.1f}s")
        
        if not result:
            print_result("Word detail LLM returned data", False, "Empty result")
            return False
        
        print_result("Word detail LLM returned data", True)
        
        all_pass = True
        
        has_ipa = "ipa" in result and result["ipa"]
        print_result("Should NOT generate ipa", not has_ipa, f"ipa field: {result.get('ipa', '(absent)')}")
        if has_ipa:
            all_pass = False
        
        has_ctx = "context_meaning" in result and result["context_meaning"]
        print_result("Should NOT generate context_meaning", not has_ctx, f"context_meaning field: {result.get('context_meaning', '(absent)')}")
        if has_ctx:
            all_pass = False
        
        required_fields = ["word", "enriched_meaning", "examples", "multiple_choice"]
        for field in required_fields:
            has_field = field in result
            if not has_field:
                print_result(f"Should have '{field}'", False)
                all_pass = False
        
        if all_pass:
            print_result("Has required fields (word/enriched_meaning/examples/multiple_choice)", True)
        
        mc = result.get("multiple_choice", {})
        if mc:
            has_options = "options" in mc and len(mc["options"]) == 4
            print_result("multiple_choice has 4 options", has_options, f"Options count: {len(mc.get('options', []))}")
            if not has_options:
                all_pass = False
        
        return all_pass
    except Exception as e:
        print_result("Word detail LLM test", False, str(e))
        return False

def test_api_word_uses_sentence_ipa():
    print_section("5. API: Word options use sentence-generated ipa/context_meaning")
    try:
        data_dir = "/workspace/data/files"
        if not os.path.exists(data_dir):
            print_result("Data directory exists", False, f"Not found: {data_dir}")
            return False
        
        files = [f for f in os.listdir(data_dir) if f.startswith("text_")]
        if not files:
            print_result("Has processed files", False, "No files found")
            return False
        
        files.sort(reverse=True)
        file_id = files[0]
        print(f"  Using file: {file_id}")
        
        vocab_r = requests.get(f"{BASE_URL}/api/vocab/{file_id}", timeout=10)
        if vocab_r.status_code != 200:
            print_result("Can load vocab", False, f"Status: {vocab_r.status_code}")
            return False
        
        vocab_data = vocab_r.json()
        words = vocab_data.get("words", vocab_data.get("vocab", []))
        if not words:
            print_result("Vocab has words", False, "Empty vocab")
            return False
        
        print_result("Vocab has words", True, f"{len(words)} words")
        
        sample_word = None
        for w in words:
            if w.get("ipa"):
                sample_word = w
                break
        
        if sample_word:
            print(f"  Sample word: {sample_word.get('word')} ipa={sample_word.get('ipa')}")
            has_sentence_ipa = bool(sample_word.get("ipa"))
            print_result("Word has ipa from sentence LLM", has_sentence_ipa)
        else:
            print_result("Found word with ipa", False, "No words have ipa yet")
        
        word_r = requests.get(f"{BASE_URL}/api/learn/{file_id}/random-word", timeout=30)
        if word_r.status_code != 200:
            print_result("Can get random word", False, f"Status: {word_r.status_code}")
            return False
        
        word_data = word_r.json()
        print(f"  Random word: {word_data.get('word')}")
        print(f"  ipa: {word_data.get('ipa')}")
        print(f"  context_meaning: {word_data.get('context_meaning')}")
        print(f"  enriched_meaning: {word_data.get('enriched_meaning')}")
        
        has_ipa = bool(word_data.get("ipa"))
        has_ctx = bool(word_data.get("context_meaning"))
        has_options = bool(word_data.get("options"))
        has_enriched = bool(word_data.get("enriched_meaning"))
        
        print_result("Word has ipa (from sentence LLM)", has_ipa)
        print_result("Word has context_meaning (from sentence LLM)", has_ctx)
        print_result("Word has options (from word detail LLM)", has_options)
        print_result("Word has enriched_meaning (from word detail LLM)", has_enriched)
        
        return has_ipa and has_ctx and has_options and has_enriched
    except Exception as e:
        print_result("API word test", False, str(e))
        return False

def test_frontend_components():
    print_section("6. Frontend Component Checks")
    all_pass = True
    
    learning_step_path = "/workspace/frontend/src/components/LearningStep.jsx"
    with open(learning_step_path, 'r') as f:
        content = f.read()
    
    has_use_ref = "useRef" in content and "lastSpokenWord" in content
    print_result("LearningStep: No useRef for lastSpokenWord (bug fix)", not has_use_ref)
    if has_use_ref:
        all_pass = False
    
    has_simple_effect = "learningData?.word && !skipListening" in content
    print_result("LearningStep: Simple useEffect for auto-speak", has_simple_effect)
    if not has_simple_effect:
        all_pass = False
    
    wordlist_path = "/workspace/frontend/src/components/WordListPanel.jsx"
    with open(wordlist_path, 'r') as f:
        content = f.read()
    
    letter_index_no_overflow = 'shrink-0 overflow-y-auto' not in content.split('letterIndex')[0] if 'letterIndex' in content else True
    print_result("WordListPanel: Letter index has no overflow-y-auto", letter_index_no_overflow)
    
    letter_index_shrink = 'shrink-0' in content
    print_result("WordListPanel: Letter index has shrink-0", letter_index_shrink)
    
    word_list_scroll = 'flex-1 min-w-0 overflow-y-auto' in content
    print_result("WordListPanel: Word list has overflow-y-auto", word_list_scroll)
    
    return all_pass

def test_backend_code_consistency():
    print_section("7. Backend Code Consistency")
    all_pass = True
    
    nvidia_path = "/workspace/backend/nvidia_api.py"
    with open(nvidia_path, 'r') as f:
        nvidia_content = f.read()
    
    main_path = "/workspace/backend/main.py"
    with open(main_path, 'r') as f:
        main_content = f.read()
    
    mc_sections = nvidia_content.split('generate_multiple_choice')
    mc_section = mc_sections[1] if len(mc_sections) > 1 else ""
    mc_until_next_async = mc_section.split('async def')[0] if 'async def' in mc_section else mc_section
    
    has_ctx_in_mc = '"context_meaning"' in mc_until_next_async
    print_result("nvidia_api.py: generate_multiple_choice has no 'context_meaning' in tool def", not has_ctx_in_mc)
    if has_ctx_in_mc:
        all_pass = False
    
    has_ipa_in_mc = '"ipa"' in mc_until_next_async
    print_result("nvidia_api.py: generate_multiple_choice has no 'ipa' in tool def", not has_ipa_in_mc)
    if has_ipa_in_mc:
        all_pass = False
    
    has_ctx_in_mc_prompt = "context_meaning" in mc_until_next_async
    print_result("nvidia_api.py: generate_multiple_choice prompt has no context_meaning", not has_ctx_in_mc_prompt)
    if has_ctx_in_mc_prompt:
        all_pass = False
    
    has_ipa_in_mc_prompt = "国际音标" in mc_until_next_async
    print_result("nvidia_api.py: generate_multiple_choice prompt has no ipa generation", not has_ipa_in_mc_prompt)
    if has_ipa_in_mc_prompt:
        all_pass = False
    
    sentence_sections = nvidia_content.split('process_text_with_dictionary')
    sentence_section = sentence_sections[1] if len(sentence_sections) > 1 else ""
    sentence_until_next = sentence_section.split('async def')[0] if 'async def' in sentence_section else sentence_section
    
    has_variants_in_sentence = '"variants"' in sentence_until_next
    print_result("nvidia_api.py: process_text_with_dictionary has no variants", not has_variants_in_sentence)
    if has_variants_in_sentence:
        all_pass = False
    
    has_examples_in_sentence = '"examples"' in sentence_until_next
    print_result("nvidia_api.py: process_text_with_dictionary has no examples", not has_examples_in_sentence)
    if has_examples_in_sentence:
        all_pass = False
    
    has_options_in_sentence = '"options"' in sentence_until_next
    print_result("nvidia_api.py: process_text_with_dictionary has no options", not has_options_in_sentence)
    if has_options_in_sentence:
        all_pass = False
    
    has_grammar_in_sentence = '"grammar"' in sentence_until_next
    print_result("nvidia_api.py: process_text_with_dictionary has no grammar", not has_grammar_in_sentence)
    if has_grammar_in_sentence:
        all_pass = False
    
    remaining_sections = nvidia_content.split('process_remaining_words')
    remaining_section = remaining_sections[1] if len(remaining_sections) > 1 else ""
    remaining_until_next = remaining_section.split('async def')[0] if 'async def' in remaining_section else remaining_section
    
    has_variants_in_remaining = '"variants"' in remaining_until_next
    print_result("nvidia_api.py: process_remaining_words has no variants", not has_variants_in_remaining)
    if has_variants_in_remaining:
        all_pass = False
    
    has_examples_in_remaining = '"examples"' in remaining_until_next
    print_result("nvidia_api.py: process_remaining_words has no examples", not has_examples_in_remaining)
    if has_examples_in_remaining:
        all_pass = False
    
    uses_sentence_ipa = 'word_entry.get("ipa"' in main_content or 'random_word.get("ipa"' in main_content or 'word_data.get("ipa"' in main_content
    print_result("main.py: Uses sentence-generated ipa (word_entry/random_word/word_data)", uses_sentence_ipa)
    
    no_options_result_ipa = 'options_result.get("ipa"' not in main_content
    print_result("main.py: No options_result.get('ipa') calls", no_options_result_ipa)
    if not no_options_result_ipa:
        all_pass = False
    
    return all_pass

def await_sync(coro):
    import asyncio
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop and loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            future = pool.submit(asyncio.run, coro)
            return future.result()
    else:
        return asyncio.run(coro)

def main():
    print("\n" + "="*60)
    print("  LessLingo Comprehensive Test Suite")
    print("  Testing: LLM output, API endpoints, frontend components")
    print("="*60)
    
    results = {}
    
    results["health"] = test_health()
    
    if not results["health"]:
        print("\n❌ Backend is not running. Start it first with: cd /workspace/backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000")
        sys.exit(1)
    
    results["sentence_llm"] = test_sentence_llm_output()
    results["missing_words_llm"] = test_missing_words_llm_output()
    results["word_detail_llm"] = test_word_detail_llm_output()
    results["api_word"] = test_api_word_uses_sentence_ipa()
    results["frontend"] = test_frontend_components()
    results["backend_code"] = test_backend_code_consistency()
    
    print_section("Summary")
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    for name, result in results.items():
        status = "✅" if result else "❌"
        print(f"  {status} {name}")
    
    print(f"\n  Total: {passed}/{total} passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
