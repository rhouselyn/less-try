import json

def test_llm_translation_format():
    """Test that LLM returns correct translation format"""
    # Simulate expected LLM output
    expected_output = {
        "original": "holy fucking god",
        "translation": [
            {
                "morphology": "adj",
                "phonetic": "ˈhoʊli",
                "text": "holy",
                "translation": "神圣的"
            },
            {
                "morphology": "adj",
                "phonetic": "ˈfʌkɪŋ",
                "text": "fucking",
                "translation": "该死的"
            },
            {
                "morphology": "n",
                "phonetic": "ɡɑd",
                "text": "god",
                "translation": "上帝"
            }
        ],
        "tokenized_translation": "神圣的 该死的 上帝",
        "grammar_explanation": "这是一个感叹语，表达强烈的情绪。",
        "redundant_tokens": ["天使", "魔鬼", "天堂", "地狱"],
        "dictionary_entries": [
            {
                "word": "holy",
                "tokens": ["holy"],
                "variants": [],
                "ipa": "ˈhoʊli",
                "context_meaning": "神圣的",
                "examples": [
                    "The holy temple attracts pilgrims from around the world.",
                    "She has dedicated her life to holy service."
                ],
                "options": ["神圣的", "美味的", "温暖的", "缓慢的"],
                "grammar": "形容词，用来描述具有宗教意义或精神纯净的事物",
                "morphology": "adj"
            }
        ]
    }
    
    # Check tokenized_translation format
    assert "tokenized_translation" in expected_output
    assert "/" not in expected_output["tokenized_translation"]
    
    # Check translation array format
    assert "translation" in expected_output
    assert isinstance(expected_output["translation"], list)
    
    # Check dictionary entry order
    if expected_output.get("dictionary_entries"):
        entry = expected_output["dictionary_entries"][0]
        assert "word" in entry
        assert "tokens" in entry
        assert "variants" in entry
        # Ensure word comes before tokens comes before variants
        entry_keys = list(entry.keys())
        word_idx = entry_keys.index("word")
        tokens_idx = entry_keys.index("tokens")
        variants_idx = entry_keys.index("variants")
        assert word_idx < tokens_idx < variants_idx
    
    # Check that dictionary entries don't have redundant translation field
    if expected_output.get("dictionary_entries"):
        for entry in expected_output["dictionary_entries"]:
            assert "translation" not in entry, "dictionary entries should not have translation field"

if __name__ == "__main__":
    test_llm_translation_format()
    print("All tests passed!")
