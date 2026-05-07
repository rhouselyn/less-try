import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from text_processor import TextProcessor
from storage import Storage

def test_masked_sentence():
    """测试蒙版填空练习生成"""
    text_processor = TextProcessor()
    storage = Storage()
    file_id = "text_20260422_072122_331"
    
    # 加载数据
    vocab = storage.load_vocab(file_id)
    sentences = storage.load_pipeline_data(file_id)
    
    print("=== 测试蒙版填空练习生成 ===")
    
    # 测试每一个句子
    for i, sentence_data in enumerate(sentences):
        print(f"\n--- 句子 {i+1}: {sentence_data['sentence']} ---")
        
        # 获取翻译tokens
        translation_tokens = []
        if 'translation_result' in sentence_data and 'translation' in sentence_data['translation_result']:
            for token in sentence_data['translation_result']['translation']:
                if isinstance(token, dict) and 'text' in token:
                    translation_tokens.append(token['text'])
        
        print(f"翻译tokens: {translation_tokens}")
        
        # 生成蒙版练习
        masked_exercise = text_processor.generate_masked_sentence(
            sentence_data['sentence'],
            vocab,
            translation_tokens,
            sentences  # 传递所有句子用于获取干扰词
        )
        
        if masked_exercise:
            print(f"蒙版后的句子: {masked_exercise['masked_sentence']}")
            print(f"答案单词: {masked_exercise['answer_words']}")
            print(f"所有选项: {masked_exercise['options']}")
            
            # 检查干扰词是否来自其他句子或词库
            answer_lower = [w.lower() for w in masked_exercise['answer_words']]
            distractors = [o for o in masked_exercise['options'] if o.lower() not in answer_lower]
            
            print(f"干扰词: {distractors}")
            
            # 检查是否有干扰词来自当前句子
            current_sentence_lower = sentence_data['sentence'].lower()
            has_current_sentence_words = False
            for d in distractors:
                if d.lower() in current_sentence_lower:
                    # 检查一下这个干扰词是否来自词汇表中的其他单词
                    from_vocab = False
                    for word in vocab:
                        if word['word'].lower() == d.lower():
                            from_vocab = True
                            break
                    if not from_vocab:
                        has_current_sentence_words = True
                        print(f"⚠️  发现可能来自当前句子的干扰词: {d}")
            
            if not has_current_sentence_words:
                print("✅ 干扰词检查通过！没有使用当前句子的单词！")
            else:
                print("❌ 干扰词检查失败！")
        else:
            print("⚠️  没有生成蒙版练习")
    
    print("\n=== 测试完成 ===")

if __name__ == "__main__":
    test_masked_sentence()
