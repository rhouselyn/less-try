// 测试脚本：测试少邻国应用的功能

// 测试步骤：
// 1. 启动后端服务器
// 2. 启动前端服务器
// 3. 访问前端页面
// 4. 输入测试文本 "hi man. what's up"
// 5. 测试阶段一的单词学习
// 6. 测试阶段二的句子练习
// 7. 验证所有功能是否正常工作

const axios = require('axios');
const { exec } = require('child_process');
const fs = require('fs');

// 测试配置
const backendUrl = 'http://localhost:8000';
const frontendUrl = 'http://localhost:3006';

// 测试文本
const testText = 'hi man. what\'s up';

// 启动后端服务器
function startBackend() {
  return new Promise((resolve, reject) => {
    console.log('启动后端服务器...');
    const process = exec('cd /workspace/backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload', {
      detached: true,
      stdio: 'ignore'
    });
    
    process.on('error', (error) => {
      reject(error);
    });
    
    // 等待服务器启动
    setTimeout(() => {
      resolve(process.pid);
    }, 3000);
  });
}

// 启动前端服务器
function startFrontend() {
  return new Promise((resolve, reject) => {
    console.log('启动前端服务器...');
    const process = exec('cd /workspace/frontend && npm run dev', {
      detached: true,
      stdio: 'ignore'
    });
    
    process.on('error', (error) => {
      reject(error);
    });
    
    // 等待服务器启动
    setTimeout(() => {
      resolve(process.pid);
    }, 3000);
  });
}

// 测试处理文本
async function testProcessText() {
  console.log('测试处理文本...');
  try {
    const response = await axios.post(`${backendUrl}/api/process-text`, {
      text: testText,
      source_language: 'en',
      target_language: 'zh'
    });
    console.log('处理文本成功，文件ID:', response.data.file_id);
    return response.data.file_id;
  } catch (error) {
    console.error('处理文本失败:', error.message);
    throw error;
  }
}

// 测试获取学习进度
async function testGetLearningProgress(fileId) {
  console.log('测试获取学习进度...');
  try {
    const response = await axios.get(`${backendUrl}/api/learn/${fileId}/progress`);
    console.log('获取学习进度成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('获取学习进度失败:', error.message);
    throw error;
  }
}

// 测试获取阶段单元
async function testGetPhaseUnits(fileId) {
  console.log('测试获取阶段单元...');
  try {
    const [phase1Response, phase2Response] = await Promise.all([
      axios.get(`${backendUrl}/api/learn/${fileId}/progress`),
      axios.get(`${backendUrl}/api/${fileId}/phase/2/units`)
    ]);
    console.log('获取阶段1单元成功:', phase1Response.data);
    console.log('获取阶段2单元成功:', phase2Response.data);
    return { phase1: phase1Response.data, phase2: phase2Response.data };
  } catch (error) {
    console.error('获取阶段单元失败:', error.message);
    throw error;
  }
}

// 测试主函数
async function main() {
  try {
    // 启动服务器
    const backendPid = await startBackend();
    const frontendPid = await startFrontend();
    
    console.log('服务器启动成功，后端PID:', backendPid, '前端PID:', frontendPid);
    
    // 等待服务器完全启动
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 测试处理文本
    const fileId = await testProcessText();
    
    // 等待处理完成
    console.log('等待文本处理完成...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 测试获取学习进度
    await testGetLearningProgress(fileId);
    
    // 测试获取阶段单元
    await testGetPhaseUnits(fileId);
    
    console.log('\n测试完成！请访问前端页面 http://localhost:3006 进行手动测试。');
    console.log('测试步骤：');
    console.log('1. 点击"开始学习"按钮');
    console.log('2. 检查阶段一的单元是否显示单词数量');
    console.log('3. 完成阶段一的学习，检查是否显示打勾');
    console.log('4. 进入阶段二的学习，完成所有练习');
    console.log('5. 检查阶段二结束后是否显示结束提示和"完成"按钮');
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

// 运行测试
main();
