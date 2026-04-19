import asyncio
from backend.nvidia_api import NvidiaAPI

async def test_distractor_tokens():
    nvidia_api = NvidiaAPI()
    
    # 测试句子
    test_sentence = "AI models generate responses."
    source_lang = "en"
    target_lang = "zh"
    
    print(f"测试句子: {test_sentence}")
    print(f"源语言: {source_lang}")
    print(f"目标语言: {target_lang}")
    print("=" * 50)
    
    try:
        result = await nvidia_api.split_and_translate(test_sentence, source_lang, target_lang)
        
        print("翻译结果:")
        print(f"原始句子: {result.get('original', 'N/A')}")
        print(f"翻译: {result.get('tokenized_translation', 'N/A')}")
        print("\n分词结果:")
        for token in result.get('translation', []):
            print(f"  {token.get('text')} -> {token.get('translation')} ({token.get('morphology')})")
        
        print("\n冗余tokens:")
        distractor_tokens = result.get('distractor_tokens', [])
        if distractor_tokens:
            for i, token in enumerate(distractor_tokens):
                print(f"  {i+1}. {token}")
        else:
            print("  未生成冗余tokens")
        
        print("\n语法解释:")
        print(result.get('grammar_explanation', 'N/A'))
        
    except Exception as e:
        print(f"测试失败: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_distractor_tokens())
