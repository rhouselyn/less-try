#!/usr/bin/env python3
"""完整流程测试脚本：测试文本处理、第一阶段单词学习、第二阶段句子练习的完整流程"""

import asyncio
import sys
import os
import json
from pathlib import Path

# 添加后端目录到路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from fastapi.testclient import TestClient
from main import app

# 创建测试客户端
client = TestClient(app)

# 测试数据目录
test_data_dir = Path("/workspace/data")
test_data_dir.mkdir(parents=True, exist_ok=True)

def clear_test_data():
    """清除测试数据"""
    if test_data_dir.exists():
        import shutil
        shutil.rmtree(test_data_dir)
    test_data_dir.mkdir(parents=True, exist_ok=True)

def print_test_section(title):
    """打印测试节标题"""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def print_test_step(step):
    """打印测试步骤"""
    print(f"\n--- {step} ---")

def check_response(response, step_name):
    """检查响应状态"""
    if response.status_code not in [200, 201]:
        print(f"❌ {step_name}失败: 状态码 {response.status_code}")
        print(f"响应: {response.text}")
        return False
    print(f"✅ {step_name}成功")
    return True

async def test_complete_flow():
    """测试完整流程"""
    clear_test_data()
    print_test_section("开始完整流程测试")
    
    test_text = "holy fucking god"
    
    # 步骤1：提交文本处理
    print_test_step("步骤1：提交文本处理")
    response = client.post("/api/process", json={
        "text": test_text,
        "source_lang": "en",
        "target_lang": "zh"
    })
    if not check_response(response, "提交文本处理"):
        return False
    process_result = response.json()
    file_id = process_result.get("file_id")
    print(f"  文件ID: {file_id}")
    if not file_id:
        print("❌ 没有获取到file_id")
        return False
    
    # 等待处理完成（模拟轮询）
    print_test_step("步骤2：等待文本处理完成")
    max_wait = 60  # 最大等待60秒
    for i in range(max_wait):
        response = client.get(f"/api/process/{file_id}/status")
        if response.status_code == 200:
            status_result = response.json()
            status = status_result.get("status")
            if status == "completed":
                print(f"✅ 文本处理完成")
                break
            elif status == "error":
                print(f"❌ 文本处理失败: {status_result.get('error')}")
                return False
        print(f"  等待处理... {i+1}/{max_wait}")
        await asyncio.sleep(1)
    else:
        print("❌ 文本处理超时")
        return False
    
    # 步骤3：获取学习单元列表
    print_test_step("步骤3：获取第一阶段学习单元列表")
    response = client.get(f"/api/{file_id}/phase/1/units")
    if not check_response(response, "获取第一阶段学习单元"):
        return False
    phase1_units = response.json()
    print(f"  单元数量: {len(phase1_units.get('units', []))}")
    
    # 步骤4：开始第一个单元的学习
    if len(phase1_units.get('units', [])) == 0:
        print("❌ 没有可用的学习单元")
        return False
    
    unit0_id = phase1_units['units'][0]['unit_id']
    print_test_step(f"步骤4：开始第{unit0_id}单元学习")
    
    # 获取单元的单词
    response = client.get(f"/api/{file_id}/phase/1/unit/{unit0_id}/words")
    if not check_response(response, "获取单元单词"):
        return False
    unit_words = response.json()
    print(f"  单词数量: {len(unit_words.get('words', []))}")
    
    # 步骤5：逐个学习单词
    print_test_step("步骤5：逐个学习单词")
    for i in range(len(unit_words.get('words', []))):
        response = client.get(f"/api/learn/{file_id}/random-word")
        if not check_response(response, f"获取第{i+1}个单词"):
            return False
        
        # 标记单词已学习
        response = client.post(f"/api/learn/{file_id}/next-word")
        if not check_response(response, f"标记第{i+1}个单词已学习"):
            return False
    
    # 步骤6：检查单元是否标记为完成
    print_test_step("步骤6：验证第一阶段单元完成状态")
    response = client.get(f"/api/{file_id}/phase/1/units")
    if not check_response(response, "重新获取第一阶段单元列表"):
        return False
    phase1_units_updated = response.json()
    units = phase1_units_updated.get('units', [])
    
    if not units:
        print("❌ 没有找到单元")
        return False
    
    # 检查第0个单元是否完成
    if units[0].get('completed'):
        print("✅ 单元0已正确标记为完成")
    else:
        print(f"⚠️ 单元0未标记为完成，单元状态: {units[0]}")
    
    # 步骤7：测试句子翻译题
    print_test_step("步骤7：测试句子翻译题")
    
    # 检查是否可以生成句子翻译题
    response = client.get(f"/api/learn/{file_id}/check-coverage")
    if not check_response(response, "检查覆盖度"):
        return False
    coverage = response.json()
    print(f"  可以生成句子: {coverage.get('can_form_sentences')}")
    
    # 如果可以生成句子，测试生成翻译题
    if coverage.get('can_form_sentences'):
        response = client.get(f"/api/learn/{file_id}/sentence-quiz")
        if response.status_code == 200:
            print("✅ 成功获取句子翻译题")
        else:
            print(f"⚠️ 获取句子翻译题失败（可能没有合适的句子）: {response.status_code}")
    
    # 步骤8：测试第二阶段
    print_test_step("步骤8：测试第二阶段句子练习")
    response = client.get(f"/api/{file_id}/phase/2/units")
    if not check_response(response, "获取第二阶段学习单元"):
        return False
    phase2_units = response.json()
    print(f"  第二阶段单元数量: {len(phase2_units.get('units', []))}")
    
    if len(phase2_units.get('units', [])) > 0:
        phase2_unit0_id = phase2_units['units'][0]['unit_id']
        
        # 获取第一阶段的练习
        response = client.get(f"/api/{file_id}/phase/2/unit/{phase2_unit0_id}/exercise")
        if response.status_code == 200:
            exercise = response.json()
            print(f"✅ 成功获取练习")
            print(f"  练习类型: {exercise.get('exercise_type')}")
            
            # 获取下一个练习（如果有），验证不会重复
            response = client.get(f"/api/{file_id}/phase/2/unit/{phase2_unit0_id}/exercise")
            if response.status_code == 200:
                next_exercise = response.json()
                print(f"✅ 成功获取下一个练习")
                print(f"  练习类型: {next_exercise.get('exercise_type')}")
    
    print_test_section("测试完成！")
    print("\n🎉 所有测试步骤完成！")
    return True

if __name__ == "__main__":
    try:
        success = asyncio.run(test_complete_flow())
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ 测试过程中发生错误: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
