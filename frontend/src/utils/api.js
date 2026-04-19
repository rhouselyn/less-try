import axios from 'axios';

// 配置axios超时时间为10分钟
axios.defaults.timeout = 600000;

// base url
const baseUrl = '';

export const api = {
  baseUrl: baseUrl,
  
  // 处理文本
  processText: async (text, sourceLang, targetLang) => {
    const response = await axios.post(`${baseUrl}/api/process-text`, {
      text: text.trim(),
      source_language: sourceLang,
      target_language: targetLang,
    });
    return response.data;
  },

  // 获取处理状态
  getStatus: async (fileId) => {
    const response = await axios.get(`${baseUrl}/api/status/${fileId}`);
    return response.data;
  },

  // 获取词汇表
  getVocab: async (fileId) => {
    const response = await axios.get(`${baseUrl}/api/vocab/${fileId}`);
    return response.data;
  },

  // 获取句子
  getSentences: async (fileId) => {
    const response = await axios.get(`${baseUrl}/api/sentences/${fileId}`);
    return response.data;
  },

  // 获取随机单词
  getRandomWord: async (fileId) => {
    const response = await axios.get(`${baseUrl}/api/learn/${fileId}/random-word`);
    return response.data;
  },

  // 获取下一个单词
  nextWord: async (fileId) => {
    const response = await axios.post(`${baseUrl}/api/learn/${fileId}/next-word`);
    return response.data;
  },

  // 获取单词详情
  getWordDetails: async (fileId, word) => {
    const response = await axios.get(`${baseUrl}/api/word/${fileId}/${word}`);
    return response.data;
  },

  // 获取学习进度和分组信息
  getLearningProgress: async (fileId) => {
    const response = await axios.get(`${baseUrl}/api/learn/${fileId}/progress`);
    return response.data;
  },

  // 获取指定单元的单词
  getUnitWords: async (fileId, unitId) => {
    const response = await axios.get(`${baseUrl}/api/learn/${fileId}/unit/${unitId}`);
    return response.data;
  },

  // 检查已学单词能否组成新句子
  checkCoverage: async (fileId) => {
    const response = await axios.get(`${baseUrl}/api/learn/${fileId}/check-coverage`);
    return response.data;
  },

  // 生成句子翻译题
  generateSentenceQuiz: async (fileId) => {
    const response = await axios.get(`${baseUrl}/api/learn/${fileId}/sentence-quiz`);
    return response.data;
  },

  // 设置学习进度
  setProgress: async (fileId, index) => {
    const response = await axios.post(`${baseUrl}/api/learn/${fileId}/set-progress`, {
      index: index,
    });
    return response.data;
  }
};