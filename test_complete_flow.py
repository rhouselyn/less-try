"""
完整学习流程测试脚本
测试 hi man. what's up 的学习流程
"""
import sys
sys.path.insert(0, '/workspace/backend')

from storage import Storage
import json
import requests

BASE_URL = "http://localhost:8000/api"
FILE_ID = "text_20260510_093047_005"

storage = Storage()

def reset_progress():
    """重置所有进度"""
    storage.save_phase_progress(FILE_ID, 1, 0, 0, 0)
    storage.save_phase_progress(FILE_ID, 2, 0, 0, 0)
    storage.save_used_sentences(FILE_ID, [])
    print("✓ 进度已重置\n")

def test_phase1():
    """测试阶段一"""
    print("=" * 50)
    print("测试阶段一")
    print("=" * 50)

    # 获取阶段一单元状态
    response = requests.get(f"{BASE_URL}/{FILE_ID}/phase/1/units")
    units = response.json()
    print(f"阶段一单元状态: {json.dumps(units, ensure_ascii=False)}")

    # 获取阶段一练习
    response = requests.get(f"{BASE_URL}/{FILE_ID}/phase/1/unit/0")
    exercise = response.json()
    print(f"阶段一练习: {json.dumps(exercise, ensure_ascii=False)}")
    print()

def test_phase2():
    """测试阶段二"""
    print("=" * 50)
    print("测试阶段二")
    print("=" * 50)

    # 获取阶段二单元状态
    response = requests.get(f"{BASE_URL}/{FILE_ID}/phase/2/units")
    units = response.json()
    print(f"阶段二单元状态: {json.dumps(units, ensure_ascii=False)}")

    # 获取第一个练习 (masked_sentence)
    response = requests.get(f"{BASE_URL}/{FILE_ID}/phase/2/unit/0")
    exercise = response.json()
    print(f"练习类型: {exercise.get('exercise_type')}")
    print(f"选项: {exercise.get('data', {}).get('options', [])}")
    print(f"答案词: {exercise.get('data', {}).get('answer_words', [])}")
    print()

    # 切换到下一个练习 (translation_reconstruction)
    response = requests.post(f"{BASE_URL}/{FILE_ID}/phase/2/unit/0/next")
    result = response.json()
    print(f"切换练习: {json.dumps(result, ensure_ascii=False)}")

    # 获取第二个练习
    response = requests.get(f"{BASE_URL}/{FILE_ID}/phase/2/unit/0")
    exercise = response.json()
    print(f"练习类型: {exercise.get('exercise_type')}")
    print(f"选项: {exercise.get('data', {}).get('options', [])}")
    print()

def test_sentence_learning():
    """测试句子学习"""
    print("=" * 50)
    print("测试句子学习")
    print("=" * 50)

    # 获取已学单词
    vocab = storage.load_vocab(FILE_ID)
    current_index = storage.load_learning_progress(FILE_ID)
    learned_words = [w["word"] for w in vocab[:current_index + 1]]
    print(f"已学单词: {learned_words}")

    # 测试sentence-quiz
    try:
        response = requests.get(f"{BASE_URL}/learn/{FILE_ID}/sentence-quiz")
        quiz = response.json()
        print(f"句子练习: {json.dumps(quiz, ensure_ascii=False)}")
    except Exception as e:
        print(f"sentence-quiz API: {e}")
    print()

def main():
    print("\n" + "=" * 60)
    print("完整学习流程测试 - hi man. what's up")
    print("=" * 60 + "\n")

    reset_progress()
    test_phase1()
    test_phase2()
    test_sentence_learning()

    print("=" * 50)
    print("测试完成!")
    print("=" * 50)

if __name__ == "__main__":
    main()
