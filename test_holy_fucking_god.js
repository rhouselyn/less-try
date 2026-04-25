// 测试脚本 - 使用 "holy fucking god" 作为测试文本
const axios = require('axios');

// 配置axios
axios.defaults.baseURL = 'http://localhost:8000';
axios.defaults.timeout = 600000;

// 测试数据
const testText = 'holy fucking god';
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
    
    // 3. 测试获取词汇表
    console.log('3. 测试获取词汇表...');
    const vocabResponse = await axios.get(`/api/vocab/${fileId}`);
    const vocab = vocabResponse.data.vocab;
    console.log(`词汇表长度: ${vocab.length}`);
    vocab.forEach((word, index) => {
      console.log(`${index + 1}. ${word.word} - ${word.context_meaning}`);
    });
    
    // 4. 测试获取第一阶段学习进度
    console.log('4. 测试获取第一阶段学习进度...');
    const learningProgressResponse = await axios.get(`/api/learn/${fileId}/progress`);
    const learningProgress = learningProgressResponse.data;
    console.log(`第一阶段学习进度: 当前单元 ${learningProgress.current_unit + 1}/${learningProgress.total_units}`);
    learningProgress.units.forEach((unit, index) => {
      console.log(`单元 ${index + 1}: ${unit.word_count} 个单词, 完成: ${unit.completed}`);
    });
    
    // 5. 测试单词学习（模拟学完所有单词）
    console.log('5. 测试单词学习...');
    let currentIndex = 0;
    while (currentIndex < vocab.length) {
      // 模拟学习单词
      const nextWordResponse = await axios.post(`/api/learn/${fileId}/next-word`);
      currentIndex = nextWordResponse.data.new_index;
      console.log(`学习进度: ${currentIndex}/${vocab.length}`);
      
      // 检查学习进度
      const progressResponse = await axios.get(`/api/learn/${fileId}/progress`);
      const progress = progressResponse.data;
      console.log(`当前单元: ${progress.current_unit + 1}, 完成状态: ${progress.units.map(u => u.completed ? '✓' : '✗').join(', ')}`);
    }
    
    // 6. 测试检查覆盖度
    console.log('6. 测试检查覆盖度...');
    const coverageResponse = await axios.get(`/api/learn/${fileId}/check-coverage`);
    const coverage = coverageResponse.data;
    console.log(`覆盖度检查结果: 可以组成句子? ${coverage.can_form_sentences}, 单元完成? ${coverage.unit_completed}`);
    
    // 7. 测试生成句子翻译题
    console.log('7. 测试生成句子翻译题...');
    try {
      const quizResponse = await axios.get(`/api/learn/${fileId}/sentence-quiz`);
      console.log(`翻译题: ${quizResponse.data.original_sentence}`);
      console.log(`正确翻译: ${quizResponse.data.correct_translation}`);
      console.log(`正确tokens: ${quizResponse.data.correct_tokens}`);
    } catch (quizError) {
      if (quizError.response && quizError.response.status === 404 && quizError.response.data.detail === 'No more eligible sentences') {
        console.log('所有句子都已使用，单元已完成');
      } else {
        throw quizError;
      }
    }
    
    // 8. 测试获取阶段一和阶段二的单元列表
    console.log('8. 测试获取阶段一和阶段二的单元列表...');
    const phase1UnitsResponse = await axios.get(`/api/${fileId}/phase/1/units`);
    const phase1Units = phase1UnitsResponse.data.units;
    console.log('阶段一单元:');
    phase1Units.forEach((unit, index) => {
      console.log(`单元 ${index + 1}: ${unit.word_count} 个单词, 完成: ${unit.completed}`);
    });
    
    const phase2UnitsResponse = await axios.get(`/api/${fileId}/phase/2/units`);
    const phase2Units = phase2UnitsResponse.data.units;
    console.log('阶段二单元:');
    phase2Units.forEach((unit, index) => {
      console.log(`单元 ${index + 1}: ${unit.sentences_count} 个句子, 完成: ${unit.completed}`);
    });
    
    // 9. 测试阶段二练习
    console.log('9. 测试阶段二练习...');
    if (phase2Units.length > 0) {
      const unitId = 0;
      try {
        const exerciseResponse = await axios.get(`/api/${fileId}/phase/2/unit/${unitId}`);
        console.log(`练习类型: ${exerciseResponse.data.exercise_type}`);
        console.log(`练习数据:`, exerciseResponse.data.data);
        
        // 测试进入下一个练习
        const nextExerciseResponse = await axios.post(`/api/${fileId}/phase/2/unit/${unitId}/next`);
        console.log(`下一个练习:`, nextExerciseResponse.data);
      } catch (exerciseError) {
        if (exerciseError.response && exerciseError.response.data.unit_complete) {
          console.log('单元已完成');
        } else {
          throw exerciseError;
        }
      }
    }
    
    console.log('测试完成！');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

runTests();
