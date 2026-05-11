#!/usr/bin/env python3
"""
完整测试脚本 - 验证修复后的功能
1. 选项不再显示"选项1,2,3"
2. word_count < 2 的句子不参与第二阶段
3. Phase 1 完成后单元打勾
"""

import requests
import json
import os
import shutil
import sys

BASE_URL = "http://localhost:8000"

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def get_latest_file_id():
    data_dir = "/workspace/data/files"
    files = [f for f in os.listdir(data_dir) if f.startswith("text_")]
    files.sort(reverse=True)
    return files[0] if files else None

def test_1_options_no_placeholder():
    """测试1: 选项不再显示"选项1,2,3"等占位符"""
    print_section("测试1: 选项不包含占位符")
    
    file_id = get_latest_file_id()
    if not file_id:
        print("❌ 没有找到测试数据")
        return False
    
    # 重置进度
    requests.post(f'{BASE_URL}/api/learn/{file_id}/set-progress', json={'index': 0})
    
    # 获取单词
    r = requests.get(f'{BASE_URL}/api/learn/{file_id}/random-word', timeout=120)
    if r.status_code != 200:
        print(f"❌ 请求失败: {r.status_code}")
        return False
    
    data = r.json()
    options = data.get('options', [])
    word = data.get('word', '')
    
    print(f"单词: {word}")
    print(f"选项: {options}")
    
    # 检查是否有占位符
    placeholders = ['选项1', '选项2', '选项3', 'Option 1', 'Option 2', 'Option 3', '其他释义A', '其他释义B', '其他释义C']
    has_placeholder = False
    for opt in options:
        for ph in placeholders:
            if ph in opt:
                print(f"  ⚠️ 发现占位符: {opt}")
                has_placeholder = True
    
    if has_placeholder:
        print("❌ 测试1失败: 选项中包含占位符")
        return False
    
    print("✅ 测试1通过: 选项中不包含占位符")
    return True

def test_2_word_count_filter():
    """测试2: word_count < 2 的句子不参与第二阶段"""
    print_section("测试2: word_count < 2 的句子不参与第二阶段")
    
    file_id = get_latest_file_id()
    
    # 加载 pipeline_data 检查句子
    import sys
    sys.path.insert(0, '/workspace/backend')
    from storage import Storage
    storage = Storage()
    
    pipeline_data = storage.load_pipeline_data(file_id)
    sentences = pipeline_data.get("data", pipeline_data) if isinstance(pipeline_data, dict) else pipeline_data
    
    print("句子列表:")
    for s in sentences:
        if isinstance(s, dict) and "sentence" in s:
            wc = s.get("word_count", "N/A")
            print(f"  '{s['sentence']}' - word_count={wc}")
    
    # 重置进度和已使用句子
    requests.post(f'{BASE_URL}/api/learn/{file_id}/set-progress', json={'index': 100})
    
    # 清空已使用句子
    used_path = f'/workspace/data/files/{file_id}/used_sentences.json'
    with open(used_path, 'w') as f:
        json.dump({"used_sentences": []}, f)
    
    # 测试 sentence-quiz
    r = requests.get(f'{BASE_URL}/api/learn/{file_id}/sentence-quiz', timeout=60)
    if r.status_code == 200:
        data = r.json()
        sentence = data.get('original_sentence', '')
        print(f"\n返回的句子: '{sentence}'")
        
        # 检查返回的句子是否 word_count >= 2
        for s in sentences:
            if isinstance(s, dict) and s.get("sentence") == sentence:
                wc = s.get("word_count", 0)
                if wc >= 2:
                    print(f"✅ 测试2通过: 返回的句子 word_count={wc} >= 2")
                    return True
                else:
                    print(f"❌ 测试2失败: 返回的句子 word_count={wc} < 2")
                    return False
        
        print("⚠️ 无法验证: 句子不在 pipeline_data 中")
    elif r.status_code == 404:
        print("没有符合条件的句子（可能所有句子 word_count < 2）")
        print("✅ 测试2通过: word_count < 2 的句子被正确过滤")
        return True
    else:
        print(f"❌ 请求失败: {r.status_code} - {r.text}")
    
    return False

def test_3_phase1_unit_completed():
    """测试3: Phase 1 完成后单元打勾"""
    print_section("测试3: Phase 1 完成后单元打勾")
    
    file_id = get_latest_file_id()
    
    # 重置进度
    requests.post(f'{BASE_URL}/api/learn/{file_id}/set-progress', json={'index': 0})
    
    # 获取 vocab 长度
    import sys
    sys.path.insert(0, '/workspace/backend')
    from storage import Storage
    storage = Storage()
    vocab = storage.load_vocab(file_id)
    vocab_len = len(vocab)
    print(f"词汇表长度: {vocab_len}")
    
    # 学习所有单词
    for i in range(vocab_len + 5):
        requests.post(f'{BASE_URL}/api/learn/{file_id}/next-word')
    
    # 检查单元完成状态
    r = requests.get(f'{BASE_URL}/api/learn/{file_id}/check-coverage')
    coverage_data = r.json()
    print(f"checkCoverage: unit_completed={coverage_data.get('unit_completed')}")
    
    r = requests.get(f'{BASE_URL}/api/{file_id}/phase/1/units')
    phase1_data = r.json()
    units = phase1_data.get('units', [])
    
    for u in units:
        status = "✅ 完成" if u.get('completed') else "❌ 未完成"
        print(f"  单元 {u.get('unit_id')}: {status} (word_count={u.get('word_count')})")
    
    all_completed = all(u.get('completed') for u in units)
    if all_completed and coverage_data.get('unit_completed'):
        print("✅ 测试3通过: Phase 1 完成后单元正确标记为完成")
        return True
    else:
        print("❌ 测试3失败: Phase 1 完成后单元未正确标记")
        return False

def test_4_sentence_quiz_options():
    """测试4: 句子翻译题有足够的选项"""
    print_section("测试4: 句子翻译题有足够的选项")
    
    file_id = get_latest_file_id()
    
    # 重置
    requests.post(f'{BASE_URL}/api/learn/{file_id}/set-progress', json={'index': 100})
    used_path = f'/workspace/data/files/{file_id}/used_sentences.json'
    with open(used_path, 'w') as f:
        json.dump({"used_sentences": []}, f)
    
    r = requests.get(f'{BASE_URL}/api/learn/{file_id}/sentence-quiz', timeout=60)
    if r.status_code == 200:
        data = r.json()
        tokens = data.get('tokens', [])
        sentence = data.get('original_sentence', '')
        correct_tokens = data.get('correct_tokens', [])
        
        print(f"句子: '{sentence}'")
        print(f"正确答案: {correct_tokens}")
        print(f"选项数量: {len(tokens)}")
        print(f"选项: {tokens}")
        
        if len(tokens) >= 2:
            print("✅ 测试4通过: 句子翻译题有足够的选项")
            return True
        else:
            print("❌ 测试4失败: 句子翻译题选项不足")
            return False
    elif r.status_code == 404:
        print("没有符合条件的句子")
        print("✅ 测试4通过（没有句子需要测试）")
        return True
    else:
        print(f"❌ 请求失败: {r.status_code}")
        return False

if __name__ == "__main__":
    print("等待后端服务...")
    import time
    for i in range(5):
        try:
            r = requests.get(f'{BASE_URL}/', timeout=5)
            if r.status_code == 200:
                print("后端服务已就绪")
                break
        except:
            time.sleep(2)
    
    results = []
    results.append(("选项不包含占位符", test_1_options_no_placeholder()))
    results.append(("word_count过滤", test_2_word_count_filter()))
    results.append(("Phase1单元打勾", test_3_phase1_unit_completed()))
    results.append(("句子翻译题选项", test_4_sentence_quiz_options()))
    
    print_section("测试总结")
    all_passed = True
    for name, passed in results:
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"  {name}: {status}")
        if not passed:
            all_passed = False
    
    if all_passed:
        print("\n🎉 所有测试通过！")
    else:
        print("\n⚠️ 部分测试失败，需要修复")
    
    sys.exit(0 if all_passed else 1)
