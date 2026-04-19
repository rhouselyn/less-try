# 学习阶段修复计划

## 问题分析

用户反馈了以下问题：
1. **音标显示不全**：可能是字体支持问题
2. **单词卡片缺少内容**：缺少LLM生成的例句、其他词性的单词以及辅助记忆文字
3. **交互行为问题**：希望点击句子/单词后再次点击能隐藏详情，而不是使用关闭按钮
4. **工具Schema问题**：需要使用用户提供的单个词enrich_vocab_entry风格的schema

## 修复步骤

### 1. 修复音标显示问题
- 检查并确保IPA字体正确加载
- 验证字体是否支持所有需要的音标符号
- 调整CSS确保字体正确应用

### 2. 完善单词卡片内容
- 确保后端使用用户提供的tool JSON schema生成单词信息
- 检查后端API是否正确生成所有必要字段（例句、变体、记忆提示）
- 确保前端正确渲染这些字段
- 验证数据从后端到前端的传递是否完整

### 3. 实现点击切换显示/隐藏功能
- 修改句子和单词的点击事件处理
- 移除关闭按钮，实现点击元素本身来切换显示状态
- 确保交互逻辑正确且用户体验流畅

### 4. 工具Schema更新
- 确保后端使用用户提供的单个词enrich_vocab_entry风格的schema
- 验证API响应包含所有必要字段

## 文件修改计划

### 前端文件
- `/workspace/frontend/src/App.jsx`：
  - 修改单词卡片渲染逻辑，确保显示所有LLM生成的内容
  - 实现点击句子/单词切换显示/隐藏功能
  - 移除关闭按钮

- `/workspace/frontend/src/index.css`：
  - 确保IPA字体正确加载和应用
  - 可能需要添加其他IPA字体作为备选

### 后端文件
- `/workspace/backend/nvidia_api.py`：
  - 确保使用用户提供的tool JSON schema
  - 验证Claude Haiku 4.5调用是否生成所有必要字段

- `/workspace/backend/main.py`：
  - 确保API响应包含所有必要字段
  - 验证数据传递是否完整

## 测试步骤
1. 启动前端和后端服务
2. 输入测试文本并生成学习材料
3. 检查单词表中的音标显示
4. 点击单词查看单词卡片，验证是否包含例句、变体和记忆提示
5. 测试点击句子和单词的显示/隐藏功能
6. 进入学习模式，测试随机单词学习功能
7. 验证API响应是否包含所有必要字段

## 预期结果
- 音标完整显示
- 单词卡片包含所有LLM生成的内容（例句、变体、记忆提示）
- 点击句子/单词可切换显示/隐藏状态
- 学习功能正常运行
- 后端使用正确的tool JSON schema

## 风险与应对
- **字体问题**：如果Noto Sans IPA不足以支持所有音标，添加其他IPA字体作为备选
- **数据缺失**：如果后端未生成某些字段，检查API调用和prompt设计
- **交互逻辑**：确保点击切换逻辑不影响其他功能
- **Schema问题**：确保后端使用正确的tool JSON schema

## 验证方法
- 手动测试所有功能点
- 检查浏览器控制台是否有错误
- 验证API响应是否包含所有必要字段
- 检查网络请求和响应

## 工具Schema

用户提供的tool JSON schema：

```json
{
  "type": "object",
  "properties": {
    "word": { "type": "string" },
    "enriched_meaning": {
      "type": "string",
      "description": "结合上下文的精确释义"
    },
    "ipa": {
      "type": "string"
    },
    "variants_detail": {
      "type": "array",
      "description": "词形变化 + 类型说明",
      "items": {
        "type": "object",
        "properties": {
          "form": { "type": "string" },
          "type": { "type": "string" }
        }
      }
    },
    "examples": {
      "type": "array",
      "description": "两个与原文语义一致的例句",
      "items": {
        "type": "object",
        "properties": {
          "sentence": { "type": "string" },
          "translation": { "type": "string" }
        }
      },
      "minItems": 2,
      "maxItems": 2
    },
    "memory_hint": {
      "type": "string",
      "description": "记忆辅助（联想/对比母语）"
    },
    "multiple_choice": {
      "type": "object",
      "properties": {
        "question": {
          "type": "string",
          "description": "题干（可为空，默认就是词）"
        },
        "correct_answer": {
          "type": "string"
        },
        "options": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "text": { "type": "string" },
              "is_correct": { "type": "boolean" }
            }
          },
          "minItems": 4,
          "maxItems": 4
        }
      }
    }
  },
  "required": [
    "word",
    "enriched_meaning",
    "ipa",
    "examples",
    "multiple_choice"
  ]
}
```