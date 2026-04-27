# LLM Output Format Documentation

## 1. Sentence Translation Output Format

### Example JSON Structure

```json
{
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
    },
    {
      "word": "fucking",
      "tokens": ["fucking"],
      "variants": [],
      "ipa": "ˈfʌkɪŋ",
      "context_meaning": "该死的",
      "examples": [
        "What the fucking hell is going on?",
        "This fucking car won't start."
      ],
      "options": ["该死的", "美丽的", "聪明的", "快乐的"],
      "grammar": "形容词，用作加强语气的粗话",
      "morphology": "adj"
    },
    {
      "word": "god",
      "tokens": ["god"],
      "variants": [],
      "ipa": "ɡɑd",
      "context_meaning": "上帝",
      "examples": [
        "God bless you!",
        "Many people believe in God."
      ],
      "options": ["上帝", "猫", "狗", "桌子"],
      "grammar": "名词，指宗教中的至高存在",
      "morphology": "n"
    }
  ]
}
```

### Key Fields Explanation

#### Top-level Fields:
- **original**: 原文文本，完全保留原始格式
- **translation**: 单词级翻译数组，包含每个单词的详细信息
- **tokenized_translation**: 分词后的完整翻译，每个词之间用空格分隔
- **grammar_explanation**: 整个句子的语法解释
- **redundant_tokens**: 用于测验的冗余词（4个）
- **dictionary_entries**: 单词词典条目数组

#### Translation Array Items:
- **text**: 原词/标记（不带标点）
- **translation**: 单词的中文翻译（单个翻译，无 / 分隔）
- **phonetic**: 国际音标
- **morphology**: 词性缩写（n, v, adj等）

#### Dictionary Entries:
**Order**: word → tokens → variants → ipa → context_meaning → examples → options → grammar → morphology

- **word**: 单词本身
- **tokens**: 单词的分词（如果适用）
- **variants**: 词形变化（如过去式、复数等）
- **ipa**: 国际音标
- **context_meaning**: 结合上下文的含义
- **examples**: 两个符合上下文的例句
- **options**: 四个选项（1个正确，3个错误）
- **grammar**: 语法解释
- **morphology**: 词性缩写

## 2. Vocabulary Generation Process

### Step 1: Text Processing
1. 输入文本被分割成句子
2. 每个句子单独发送给LLM进行翻译和分析
3. LLM返回包含翻译、分词和词典条目的完整数据

### Step 2: Dictionary Entry Generation
1. 从LLM返回的dictionary_entries中提取单词信息
2. 去重处理（基于单词小写形式）
3. 按字母顺序排序
4. 为每个词条添加sentence_index字段
5. 移除冗余的translation字段

### Step 3: Storage
- 词典条目存储在 `vocab.json` 文件中
- 句子翻译数据存储在 `pipeline_data.json` 文件中
- 学习进度和其他状态存储在相应的进度文件中

## 3. Phase 2 Exercise Generation

### Exercise Types:
1. **masked_sentence**: 选词填空题
2. **translation_reconstruction**: 根据翻译选原词题

### Process:
1. 每个句子生成两种练习类型
2. 练习类型交替出现
3. 进度系统跟踪每个句子的两种练习完成情况

### Example Flow:
1. 句子1 → 选词填空 → 翻译重构
2. 句子2 → 选词填空 → 翻译重构
3. 以此类推...
