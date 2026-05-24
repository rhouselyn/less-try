import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from text_processor import TextProcessor, BACKUP_VOCAB_BY_LANG, is_punctuation_only, PUNCTUATION_CHARS, is_source_lang_text

tp = TextProcessor()


class TestTokenizeSentenceLanguageAgnostic:
    def test_english_space_separated(self):
        result = tp.tokenize_sentence("Hello world", language="en")
        assert result == ["Hello", "world"]

    def test_french_space_separated(self):
        result = tp.tokenize_sentence("Bonjour le monde", language="fr")
        assert result == ["Bonjour", "le", "monde"]

    def test_korean_space_separated(self):
        result = tp.tokenize_sentence("안녕하세요 만나서 반갑습니다", language="ko")
        assert "안녕하세요" in result
        assert "만나서" in result
        assert "반갑습니다" in result
        assert len(result) == 3

    def test_japanese_no_space(self):
        result = tp.tokenize_sentence("こんにちは世界", language="ja")
        assert len(result) >= 2
        assert "こんにちは世界" not in result

    def test_chinese_no_space(self):
        result = tp.tokenize_sentence("你好世界", language="zh")
        assert len(result) >= 2
        assert "你好世界" not in result

    def test_thai_no_space(self):
        result = tp.tokenize_sentence("สวัสดีครับ", language="th")
        assert len(result) >= 1
        assert any("ส" in t for t in result)

    def test_vietnamese_space_separated(self):
        result = tp.tokenize_sentence("Xin chào thế giới", language="vi")
        assert len(result) >= 3
        assert "Xin" in result
        assert "chào" in result

    def test_arabic_right_to_left(self):
        result = tp.tokenize_sentence("مرحبا بالعالم", language="ar")
        assert len(result) >= 2

    def test_hindi_devanagari(self):
        result = tp.tokenize_sentence("नमस्ते दुनिया", language="hi")
        assert len(result) >= 2
        assert "नमस्ते" in result

    def test_turkish_space_separated(self):
        result = tp.tokenize_sentence("Merhaba dünya", language="tr")
        assert result == ["Merhaba", "dünya"]

    def test_russian_cyrillic(self):
        result = tp.tokenize_sentence("Привет мир", language="ru")
        assert result == ["Привет", "мир"]

    def test_georgian_script(self):
        result = tp.tokenize_sentence("გამარჯობა სამყარო", language="ka")
        assert len(result) >= 2

    def test_tamil_dravidian(self):
        result = tp.tokenize_sentence("வணக்கம் உலகம்", language="ta")
        assert len(result) >= 2

    def test_bengali(self):
        result = tp.tokenize_sentence("নমস্কার বিশ্ব", language="bn")
        assert len(result) >= 2

    def test_persian_right_to_left(self):
        result = tp.tokenize_sentence("سلام دنیا", language="fa")
        assert len(result) >= 2

    def test_khmer_no_space(self):
        result = tp.tokenize_sentence("សួស្តីពិភពលោក", language="km")
        assert len(result) >= 1

    def test_lao_no_space(self):
        result = tp.tokenize_sentence("ສະບາຍດີ", language="lo")
        assert len(result) >= 1

    def test_myanmar_no_space(self):
        result = tp.tokenize_sentence("မင်္ဂလာပါ", language="my")
        assert len(result) >= 1


class TestExtractWordsLanguageAgnostic:
    def test_english(self):
        result = tp.extract_words("The bright sun shines.", language="en")
        assert "bright" in result
        assert "sun" in result

    def test_korean(self):
        result = tp.extract_words("안녕하세요 만나서 반갑습니다", language="ko")
        assert "안녕하세요" in result
        assert "만나서" in result

    def test_japanese(self):
        result = tp.extract_words("こんにちは世界", language="ja")
        assert len(result) >= 2

    def test_chinese(self):
        result = tp.extract_words("你好世界", language="zh")
        assert len(result) >= 2

    def test_thai(self):
        result = tp.extract_words("สวัสดีครับ สบายดีไหม", language="th")
        assert len(result) >= 1

    def test_vietnamese(self):
        result = tp.extract_words("Xin chào thế giới", language="vi")
        assert "chào" in result

    def test_arabic(self):
        result = tp.extract_words("مرحبا بالعالم", language="ar")
        assert len(result) >= 2

    def test_hindi(self):
        result = tp.extract_words("नमस्ते दुनिया", language="hi")
        assert "नमस्ते" in result

    def test_russian(self):
        result = tp.extract_words("Привет мир", language="ru")
        assert "Привет" in result

    def test_turkish(self):
        result = tp.extract_words("Merhaba dünya", language="tr")
        assert "Merhaba" in result


class TestBackupVocabCoverage:
    def test_common_languages_have_backup_vocab(self):
        for lang in ["en", "zh", "es", "de", "fr", "ja", "ko"]:
            assert lang in BACKUP_VOCAB_BY_LANG, f"Missing backup vocab for {lang}"

    def test_get_fallback_distractors_unknown_lang_uses_en(self):
        result = tp.get_fallback_distractors(3, source_lang="th")
        assert len(result) == 3
        assert all(isinstance(w, str) for w in result)

    def test_get_fallback_distractors_korean(self):
        result = tp.get_fallback_distractors(3, source_lang="ko")
        assert len(result) == 3


class TestValidateAndCompleteTranslation:
    def test_no_false_substring_match(self):
        translation_result = {
            "translation": [
                {"text": "안녕", "translation": "平安", "phonetic": "", "morphology": ""},
                {"text": "하세요", "translation": "做", "phonetic": "", "morphology": ""},
            ]
        }
        result = tp.validate_and_complete_translation(
            "안녕하세요", translation_result, source_lang="ko"
        )
        texts = [t["text"] for t in result["translation"]]
        assert "안녕하세요" in texts

    def test_english_preserves_existing(self):
        translation_result = {
            "translation": [
                {"text": "Hello", "translation": "你好", "phonetic": "/həˈloʊ/", "morphology": ""},
                {"text": "world", "translation": "世界", "phonetic": "/wɜːrld/", "morphology": ""},
            ]
        }
        result = tp.validate_and_complete_translation(
            "Hello world", translation_result, source_lang="en"
        )
        assert len(result["translation"]) == 2
        assert result["translation"][0]["text"] == "Hello"


class TestSplitSentences:
    def test_cjk_punctuation(self):
        result = tp.split_sentences("你好。世界！再见？")
        assert len(result) == 3

    def test_latin_punctuation(self):
        result = tp.split_sentences("Hello. World! Goodbye?")
        assert len(result) == 3

    def test_mixed_punctuation(self):
        result = tp.split_sentences("Hello. 你好。")
        assert len(result) == 2

    def test_thai_no_sentence_end(self):
        result = tp.split_sentences("สวัสดี")
        assert len(result) == 1

    def test_arabic_period(self):
        result = tp.split_sentences("مرحبا. بالعالم")
        assert len(result) == 2


class TestMaskedSentenceLanguageAgnostic:
    def test_korean_masked_sentence(self):
        vocab = [{"word": "안녕하세요"}, {"word": "만나서"}, {"word": "반갑습니다"}]
        result = tp.generate_masked_sentence(
            "안녕하세요 만나서 반갑습니다",
            vocab,
            translation_tokens=["안녕하세요", "만나서", "반갑습니다"],
            source_lang="ko",
        )
        assert "___" in result["masked_sentence"]
        assert len(result["answer_words"]) >= 1

    def test_japanese_masked_sentence(self):
        vocab = [{"word": "こんにちは"}, {"word": "世界"}]
        result = tp.generate_masked_sentence(
            "こんにちは世界",
            vocab,
            translation_tokens=["こんにちは", "世界"],
            source_lang="ja",
        )
        assert "___" in result["masked_sentence"]

    def test_thai_masked_sentence(self):
        vocab = [{"word": "สวัสดี"}, {"word": "ครับ"}]
        result = tp.generate_masked_sentence(
            "สวัสดีครับ",
            vocab,
            translation_tokens=["สวัสดี", "ครับ"],
            source_lang="th",
        )
        assert "___" in result["masked_sentence"]


class TestPunctuationCharsAllLanguages:
    def test_arabic_question_mark(self):
        assert is_punctuation_only('؟')

    def test_arabic_comma(self):
        assert is_punctuation_only('،')

    def test_hindi_danda(self):
        assert is_punctuation_only('।')

    def test_hindi_double_danda(self):
        assert is_punctuation_only('॥')

    def test_myanmar_period(self):
        assert is_punctuation_only('။')

    def test_myanmar_comma(self):
        assert is_punctuation_only('၊')

    def test_khmer_period(self):
        assert is_punctuation_only('។')

    def test_khmer_end(self):
        assert is_punctuation_only('៕')

    def test_armenian_period(self):
        assert is_punctuation_only('։')

    def test_armenian_exclamation(self):
        assert is_punctuation_only('՜')

    def test_armenian_question(self):
        assert is_punctuation_only('՞')

    def test_ethiopic_period(self):
        assert is_punctuation_only('።')

    def test_tibetan_period(self):
        assert is_punctuation_only('།')

    def test_latin_punctuation(self):
        assert is_punctuation_only('.,;:!?')

    def test_cjk_punctuation(self):
        assert is_punctuation_only('，。！？：；、')

    def test_mixed_punctuation_only(self):
        assert is_punctuation_only('。！')

    def test_word_is_not_punctuation(self):
        assert not is_punctuation_only('hello')
        assert not is_punctuation_only('你好')
        assert not is_punctuation_only('مرحبا')

    def test_mixed_word_and_punct_is_not_punctuation_only(self):
        assert not is_punctuation_only('hello!')
        assert not is_punctuation_only('你好。')


class TestProcessTranslationPunctuationFilter:
    @pytest.mark.asyncio
    async def test_arabic_punctuation_filtered(self):
        class MockAPI:
            async def process_text_with_dictionary(self, text, source_lang, target_lang, context=None):
                return {
                    "translation": [
                        {"text": "مرحبا", "translation": "hello", "phonetic": "", "morphology": ""},
                        {"text": "؟", "translation": "", "phonetic": "", "morphology": ""},
                    ]
                }
        result = await tp.process_translation("مرحبا؟", "ar", "en", MockAPI())
        texts = [t["text"] for t in result["translation"]]
        assert "؟" not in texts
        assert "مرحبا" in texts

    @pytest.mark.asyncio
    async def test_hindi_danda_filtered(self):
        class MockAPI:
            async def process_text_with_dictionary(self, text, source_lang, target_lang, context=None):
                return {
                    "translation": [
                        {"text": "नमस्ते", "translation": "hello", "phonetic": "", "morphology": ""},
                        {"text": "।", "translation": "", "phonetic": "", "morphology": ""},
                    ]
                }
        result = await tp.process_translation("नमस्ते।", "hi", "en", MockAPI())
        texts = [t["text"] for t in result["translation"]]
        assert "।" not in texts
        assert "नमस्ते" in texts

    @pytest.mark.asyncio
    async def test_cjk_punctuation_filtered(self):
        class MockAPI:
            async def process_text_with_dictionary(self, text, source_lang, target_lang, context=None):
                return {
                    "translation": [
                        {"text": "你好", "translation": "hello", "phonetic": "", "morphology": ""},
                        {"text": "。", "translation": "", "phonetic": "", "morphology": ""},
                    ]
                }
        result = await tp.process_translation("你好。", "zh", "en", MockAPI())
        texts = [t["text"] for t in result["translation"]]
        assert "。" not in texts
        assert "你好" in texts


class TestIsSourceLangTextLanguageAgnostic:
    def test_arabic_text_for_arabic_source(self):
        assert is_source_lang_text("مرحبا", source_lang="ar")

    def test_arabic_text_for_english_source_rejected(self):
        assert not is_source_lang_text("مرحبا", source_lang="en")

    def test_hindi_text_for_hindi_source(self):
        assert is_source_lang_text("नमस्ते", source_lang="hi")

    def test_hindi_text_for_english_source_rejected(self):
        assert not is_source_lang_text("नमस्ते", source_lang="en")

    def test_korean_text_for_korean_source(self):
        assert is_source_lang_text("안녕하세요", source_lang="ko")

    def test_korean_text_for_english_source_rejected(self):
        assert not is_source_lang_text("안녕하세요", source_lang="en")

    def test_thai_text_for_thai_source(self):
        assert is_source_lang_text("สวัสดี", source_lang="th")

    def test_thai_text_for_english_source_rejected(self):
        assert not is_source_lang_text("สวัสดี", source_lang="en")

    def test_georgian_text_for_georgian_source(self):
        assert is_source_lang_text("გამარჯობა", source_lang="ka")

    def test_georgian_text_for_english_source_rejected(self):
        assert not is_source_lang_text("გამარჯობა", source_lang="en")

    def test_armenian_text_for_armenian_source(self):
        assert is_source_lang_text("Բարև", source_lang="hy")

    def test_armenian_text_for_english_source_rejected(self):
        assert not is_source_lang_text("Բարև", source_lang="en")

    def test_cjk_text_for_japanese_source(self):
        assert is_source_lang_text("こんにちは", source_lang="ja")

    def test_english_text_for_english_source(self):
        assert is_source_lang_text("hello", source_lang="en")

    def test_long_phrase_rejected(self):
        assert not is_source_lang_text("this is a very long phrase", source_lang="en")

    def test_russian_text_for_russian_source(self):
        assert is_source_lang_text("Привет", source_lang="ru")

    def test_russian_text_for_english_source_rejected(self):
        assert not is_source_lang_text("Привет", source_lang="en")


class TestMaskedSentencePunctuationStripping:
    def test_arabic_punctuation_stripped_from_word(self):
        vocab = [{"word": "مرحبا"}]
        result = tp.generate_masked_sentence(
            "مرحبا بالعالم",
            vocab,
            translation_tokens=["مرحبا", "بالعالم"],
            source_lang="ar",
        )
        for aw in result["answer_words"]:
            assert aw.strip() == aw

    def test_hindi_danda_stripped_from_word(self):
        vocab = [{"word": "नमस्ते"}]
        result = tp.generate_masked_sentence(
            "नमस्ते दुनिया",
            vocab,
            translation_tokens=["नमस्ते", "दुनिया"],
            source_lang="hi",
        )
        for aw in result["answer_words"]:
            assert '।' not in aw


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
