import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from storage import Storage

def test_check_coverage():
    """测试覆盖度检查逻辑"""
    storage = Storage()
    file_id = "text_20260422_072122_331"
    
    # 加载数据
    vocab = storage.load_vocab(file_id)
    sentences = storage.load_pipeline_data(file_id)
    
    print("=== 词汇表 ===")
    for i, word in enumerate(vocab):
        print(f"{i+1}. {word['word']}")
        if 'tokens' in word:
            print(f"   tokens: {word['tokens']}")
    
    print("\n=== 句子 ===")
    for i, sent_data in enumerate(sentences):
        print(f"{i+1}. {sent_data['sentence']}")
        if 'translation_result' in sent_data and 'translation' in sent_data['translation_result']:
            print(f"   tokens: {[t['text'] for t in sent_data['translation_result']['translation']]}")
    
    # 模拟学习进度
    print("\n=== 测试覆盖度检查 ===")
    
    # 测试学习了2个单词的情况
    current_index = 2
    learned_words = vocab[:current_index]
    learned_word_set = set(word["word"].lower() for word in learned_words)
    print(f"\n已学单词: {[w['word'] for w in learned_words]}")
    
    # 检查句子
    can_form = False
    for sentence_data in sentences:
        if "sentence" in sentence_data:
            sentence = sentence_data["sentence"]
            print(f"\n检查句子: {sentence}")
            
            # 获取该句子的LLM tokens
            sentence_tokens = []
            if "translation_result" in sentence_data and "translation" in sentence_data["translation_result"]:
                for token in sentence_data["translation_result"]["translation"]:
                    if isinstance(token, dict) and "text" in token:
                        sentence_tokens.append(token["text"].lower())
            print(f"句子的LLM tokens: {sentence_tokens}")
            
            # 新的匹配逻辑：检查已学单词的tokens是否与句子的tokens有重叠
            matched_count = 0
            matched_tokens = []
            
            for learned_word in learned_words:
                # 获取已学单词的所有tokens
                learned_word_tokens = []
                if 'tokens' in learned_word:
                    learned_word_tokens = [t.lower() for t in learned_word['tokens']]
                else:
                    learned_word_tokens = [learned_word["word"].lower()]
                
                print(f"检查已学单词: {learned_word['word']}, 其tokens: {learned_word_tokens}")
                
                # 检查这些tokens是否在句子的tokens中
                for lt in learned_word_tokens:
                    for st in sentence_tokens:
                        if lt in st or st in lt:
                            matched_count += 1
                            matched_tokens.append((lt, st))
                            print(f"  匹配成功: {lt} <-> {st}")
                            if matched_count >= 2:
                                can_form = True
                                break
                    if can_form:
                        break
                if can_form:
                    break
            
            if can_form:
                print(f"\n可以生成句子！匹配的token对: {matched_tokens}")
                break
    
    print(f"\n最终结果: can_form={can_form}")
    return can_form

if __name__ == "__main__":
    test_check_coverage()
