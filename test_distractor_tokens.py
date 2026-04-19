import asyncio
from backend.nvidia_api import NvidiaAPI

async def test_split_and_translate():
    nvidia_api = NvidiaAPI()
    
    # 测试句子
    test_sentence = "AI models generate responses."
    source_lang = "en"
    target_lang = "zh"
    
    print(f"Testing split_and_translate with sentence: {test_sentence}")
    print(f"Source language: {source_lang}")
    print(f"Target language: {target_lang}")
    print("=" * 60)
    
    try:
        result = await nvidia_api.split_and_translate(test_sentence, source_lang, target_lang)
        
        print("\n=== Response Result ===")
        print(f"Original: {result.get('original', 'N/A')}")
        print(f"Tokenized Translation: {result.get('tokenized_translation', 'N/A')}")
        print(f"Grammar Explanation: {result.get('grammar_explanation', 'N/A')}")
        
        print("\n=== Tokens ===")
        if 'translation' in result:
            for i, token in enumerate(result['translation']):
                print(f"Token {i+1}: {token.get('text', 'N/A')} -> {token.get('translation', 'N/A')} (POS: {token.get('morphology', 'N/A')})")
        
        print("\n=== Distractor Tokens ===")
        if 'distractor_tokens' in result:
            print(f"Distractor tokens: {result['distractor_tokens']}")
            print(f"Number of distractors: {len(result['distractor_tokens'])}")
        else:
            print("No distractor tokens found!")
        
        print("\n=== Test Result ===")
        if 'distractor_tokens' in result and len(result['distractor_tokens']) == 4:
            print("✓ SUCCESS: Distractor tokens generated correctly")
        else:
            print("✗ FAILURE: Distractor tokens not generated correctly")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_split_and_translate())
