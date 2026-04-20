import asyncio
from nvidia_api import NvidiaAPI

async def test_process_text_with_dictionary():
    nvidia_api = NvidiaAPI()
    
    # 测试英文到中文的翻译
    result = await nvidia_api.process_text_with_dictionary(
        "hi bro",
        "en",
        "zh"
    )
    
    print("=== Test Result ===")
    print(f"Original: {result.get('original')}")
    print(f"Tokenized Translation: {result.get('tokenized_translation')}")
    print(f"Dictionary Entries: {len(result.get('dictionary_entries', []))}")
    for entry in result.get('dictionary_entries', []):
        print(f"Word: {entry.get('word')}, Translation: {entry.get('translation')}")
    print("===================")

if __name__ == "__main__":
    asyncio.run(test_process_text_with_dictionary())
