// 测试脚本 - 测试阶段二题目重复和阶段一翻译题没有题目的问题
const axios = require('axios');

// 配置axios
axios.defaults.baseURL = 'http://localhost:8000';
axios.defaults.timeout = 600000;

// 测试数据
const testText = 'Hi man. What\'s up?';
const sourceLang = 'en';
const targetLang = 'zh';

async function runTests() {
  console.log('开始测试...');
  
  try {
    // 1. 测试处理文本
    console.log('1. 测试处理文本...');
    const processResponse = await axios.post('/api/process-text', {
      text: testText,
      source_language: sourceLang,
      target_language: targetLang
    });
    
    const fileId = processResponse.data.file_id;
    console.log(`获取到文件ID: ${fileId}`);
    
    // 2. 等待处理完成
    console.log('2. 等待处理完成...');
    let status = { status: 'processing' };
    while (status.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      status = await axios.get(`/api/status/${fileId}`);
      status = status.data;
      console.log(`处理状态: ${status.status}, 进度: ${status.progress}%`);
    }
    
    if (status.status === 'error') {
      throw new Error(`处理失败: ${status.error}`);
    }
    
    console.log('处理完成！');
    
    // 3. 测试阶段二的练习生成
    console.log('3. 测试阶段二的练习生成...');
    const phase2Unit0Response = await axios.get(`/api/${fileId}/phase/2/unit/0`);
    console.log('阶段二单元0练习:', phase2Unit0Response.data);
    
    // 4. 测试阶段二的下一个练习
    console.log('4. 测试阶段二的下一个练习...');
    const nextExerciseResponse = await axios.post(`/api/${fileId}/phase/2/unit/0/next`);
    console.log('下一个练习:', nextExerciseResponse.data);
    
    // 5. 测试阶段一的翻译题生成
    console.log('5. 测试阶段一的翻译题生成...');
    const sentenceQuizResponse = await axios.get(`/api/learn/${fileId}/sentence-quiz`);
    console.log('翻译题数据:', sentenceQuizResponse.data);
    console.log('原始句子:', sentenceQuizResponse.data.original_sentence);
    console.log('正确翻译:', sentenceQuizResponse.data.correct_translation);
    console.log('正确tokens:', sentenceQuizResponse.data.correct_tokens);
    console.log('所有tokens:', sentenceQuizResponse.data.tokens);
    
    console.log('测试完成！');
  } catch (error) {
    console.error('测试失败:', error);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

runTests();
