// 测试脚本
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
    
    // 3. 测试获取第一阶段单元
    console.log('3. 测试获取第一阶段单元...');
    const phase1UnitsResponse = await axios.get(`/api/${fileId}/phase/1/units`);
    const phase1Units = phase1UnitsResponse.data.units;
    console.log(`第一阶段单元数量: ${phase1Units.length}`);
    phase1Units.forEach((unit, index) => {
      console.log(`单元 ${index + 1}: ${unit.sentences_count} 个句子`);
    });
    
    // 4. 测试获取第二阶段单元
    console.log('4. 测试获取第二阶段单元...');
    const phase2UnitsResponse = await axios.get(`/api/${fileId}/phase/2/units`);
    const phase2Units = phase2UnitsResponse.data.units;
    console.log(`第二阶段单元数量: ${phase2Units.length}`);
    phase2Units.forEach((unit, index) => {
      console.log(`单元 ${index + 1}: ${unit.sentences_count} 个句子`);
    });
    
    // 5. 测试第一阶段学习
    console.log('5. 测试第一阶段学习...');
    const learningProgressResponse = await axios.get(`/api/learn/${fileId}/progress`);
    const learningProgress = learningProgressResponse.data;
    console.log(`第一阶段学习进度: 当前单元 ${learningProgress.current_unit + 1}/${learningProgress.total_units}`);
    learningProgress.units.forEach((unit, index) => {
      console.log(`单元 ${index + 1}: ${unit.word_count} 个单词, 完成: ${unit.completed}`);
    });
    
    // 6. 测试第二阶段练习
    console.log('6. 测试第二阶段练习...');
    const phase2UnitExerciseResponse = await axios.get(`/api/${fileId}/phase/2/unit/0`);
    const phase2UnitExercise = phase2UnitExerciseResponse.data;
    console.log(`第二阶段练习类型: ${phase2UnitExercise.exercise_type}`);
    console.log(`练习数据:`, phase2UnitExercise.data);
    
    console.log('测试完成！');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

runTests();
