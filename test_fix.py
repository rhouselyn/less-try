from backend.text_processor import TextProcessor

def test_split_sentences():
    processor = TextProcessor()
    
    test_cases = [
        "hi。b'ro",
        "hi. abandon. bar",
        "Hello world! How are you?",
        "AI models generate responses. And outputs based on complex algorithms."
    ]
    
    print("=== 测试句子分割 ===")
    for test in test_cases:
        sentences = processor.split_sentences(test)
        print(f"\n输入: {repr(test)}")
        print(f"分割结果: {len(sentences)} 个句子")
        for i, s in enumerate(sentences):
            print(f"  句子{i+1}: {repr(s)}")

def test_clean_spaces():
    print("\n=== 测试空格移除 ===")
    test_translations = ["嗨 兄弟", "人 工 智 能", "Hello World!"]
    for t in test_translations:
        clean = t.replace(' ', '')
        print(f"输入: {repr(t)} -> {repr(clean)}")

if __name__ == "__main__":
    test_split_sentences()
    test_clean_spaces()
