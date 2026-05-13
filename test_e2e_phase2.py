import sys
sys.path.insert(0, '/workspace/backend')

from storage import Storage
import json
import os
import shutil

print("=" * 60)
print("端到端测试: 模拟用户完成阶段二单元")
print("=" * 60)

storage = Storage()
test_file_id = "test_e2e_phase2"
test_dir = storage.get_file_dir(test_file_id)

# 清理旧测试数据
if test_dir.exists():
    shutil.rmtree(test_dir)

# 设置测试数据
sentences_data = [
    {
        "sentence": f"Test sentence number {i} with enough words to be eligible for exercise.",
        "word_count": 10,
        "translation_result": {
            "translation": [
                {"text": f"word{j}", "translation": f"词{j}"} for j in range(10)
            ],
            "tokenized_translation": "测试翻译"
        }
    }
    for i in range(5)
]
storage.save_pipeline_data(test_file_id, sentences_data)
storage.save_vocab(test_file_id, [{"word": f"word{i}"} for i in range(20)])
storage.save_language_settings(test_file_id, "en", "zh")

# 模拟完整的用户流程
from main import get_phase_units, get_phase_unit_exercise, next_phase_exercise
import asyncio

async def simulate_user_flow():
    print("\n--- 步骤1: 获取阶段二单元列表 ---")
    result = await get_phase_units(test_file_id, 2)
    units = result.get("units", [])
    print(f"  单元数: {len(units)}")
    for u in units:
        print(f"  单元 {u['unit_id']}: exercises_count={u.get('exercises_count')}, completed={u.get('completed')}")
    
    total_exercises = sum(u.get('exercises_count', 0) for u in units)
    print(f"  总题目数: {total_exercises}")
    
    print("\n--- 步骤2: 进入单元0，完成所有题目 ---")
    unit_id = 0
    unit_exercises = units[unit_id].get('exercises_count', 10)
    
    for i in range(unit_exercises):
        # 获取当前题目
        exercise = await get_phase_unit_exercise(test_file_id, 2, unit_id)
        exercise_type = exercise.get('exercise_type', 'unknown')
        exercise_idx = exercise.get('exercise_index_in_unit', '?')
        total_in_unit = exercise.get('total_exercises_in_unit', '?')
        is_last = exercise_idx + 1 >= total_in_unit
        print(f"  题目 {exercise_idx + 1}/{total_in_unit}: {exercise_type} {'[最后一题!]' if is_last else ''}")
        
        # 完成当前题目，进入下一题
        next_res = await next_phase_exercise(test_file_id, 2, unit_id)
        
        if next_res.get('unit_complete'):
            print(f"  ✓ 后端返回 unit_complete=True! (完成第{i+1}题后)")
            break
        elif next_res.get('all_complete'):
            print(f"  ✓ 后端返回 all_complete=True! (完成第{i+1}题后)")
            break
        else:
            new_idx = next_res.get('new_exercise_index', '?')
            print(f"    → 进度推进到 {new_idx}")
    
    print("\n--- 步骤3: 检查完成状态 ---")
    current_progress = storage.load_phase2_progress(test_file_id)
    max_progress = storage.load_phase2_max_progress(test_file_id)
    print(f"  current_exercise_index: {current_progress}")
    print(f"  max_exercise_index: {max_progress}")
    
    result2 = await get_phase_units(test_file_id, 2)
    units2 = result2.get("units", [])
    for u in units2:
        print(f"  单元 {u['unit_id']}: exercises_count={u.get('exercises_count')}, completed={u.get('completed')}")
    
    # 验证单元0已标记完成
    assert units2[0].get('completed') == True, f"单元0应该已完成! completed={units2[0].get('completed')}"
    print("  ✓ 单元0已标记为完成!")
    
    print("\n--- 步骤4: 重新进入已完成单元0（复习） ---")
    exercise = await get_phase_unit_exercise(test_file_id, 2, 0)
    if exercise.get('unit_complete'):
        print("  ✗ 不应返回 unit_complete，应该允许重新进入!")
    else:
        print(f"  ✓ 重新进入成功，返回练习类型: {exercise.get('exercise_type')}")
    
    # 检查max_progress没有减少
    max_after_reentry = storage.load_phase2_max_progress(test_file_id)
    assert max_after_reentry >= max_progress, f"max_progress 不应减少! 之前={max_progress}, 之后={max_after_reentry}"
    print(f"  ✓ max_progress 保持不变: {max_after_reentry}")
    
    # 再次检查完成状态
    result3 = await get_phase_units(test_file_id, 2)
    units3 = result3.get("units", [])
    assert units3[0].get('completed') == True, f"重新进入后单元0应该仍然显示完成!"
    print("  ✓ 重新进入后，单元0仍然标记为完成!")
    
    print("\n--- 步骤5: 测试旧数据兼容性 ---")
    # 模拟旧格式数据（没有max_exercise_index字段）
    progress_path = test_dir / "phase2_progress.json"
    with open(progress_path, 'w', encoding='utf-8') as f:
        json.dump({"current_exercise_index": 15}, f)
    
    max_old = storage.load_phase2_max_progress(test_file_id)
    print(f"  旧格式数据: current=15, max(回退到current)={max_old}")
    assert max_old == 15, f"旧数据应该回退到current_exercise_index! 实际: {max_old}"
    print("  ✓ 旧数据兼容性正确!")

asyncio.run(simulate_user_flow())

print()
print("=" * 60)
print("所有端到端测试通过!")
print("=" * 60)

if test_dir.exists():
    shutil.rmtree(test_dir)
