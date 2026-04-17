from text_processor import TextProcessor

processor = TextProcessor()

# 测试英文文本
text1 = "Hello world. How are you? I'm fine!"
sentences1 = processor.split_sentences(text1)
print("英文文本分句结果:")
for i, sentence in enumerate(sentences1):
    print(f"{i+1}: {sentence}")

# 测试中文文本
text2 = "你好世界。你好吗？我很好！"
sentences2 = processor.split_sentences(text2)
print("\n中文文本分句结果:")
for i, sentence in enumerate(sentences2):
    print(f"{i+1}: {sentence}")

# 测试词汇提取
words = processor.extract_words_from_sentences(sentences1)
print("\n词汇提取结果:")
print(words)
