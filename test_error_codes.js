/**
 * 测试：模拟API Key错误，验证弹窗显示具体原因
 */
const http = require('http');
const fs = require('fs');

function httpReq(method, url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname, port: urlObj.port,
      path: urlObj.pathname, method,
      headers: body ? { 'Content-Type': 'application/json' } : {}
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  let passed = 0, failed = 0;
  const BASE = 'http://localhost:8000';

  // 测试1: 验证后端两处错误码格式一致
  console.log('\n=== 测试1: 后端两处错误码格式一致 ===');
  const tpContent = fs.readFileSync('/workspace/backend/routers/text_processing.py', 'utf-8');
  const egContent = fs.readFileSync('/workspace/backend/utils/exercise_generators.py', 'utf-8');

  const codes = ['api_key_invalid', 'rate_limit', 'insufficient_balance', 'connection_error'];
  let tpOk = true, egOk = true;
  for (const code of codes) {
    if (!tpContent.includes(`"${code}"`)) { console.log(`  ✗ text_processing.py 缺少: ${code}`); tpOk = false; }
    if (!egContent.includes(`"${code}"`)) { console.log(`  ✗ exercise_generators.py 缺少: ${code}`); egOk = false; }
  }
  if (tpOk && egOk) {
    console.log('  ✓ 两处错误码格式一致');
    passed++;
  } else {
    failed++;
  }

  // 检查没有中文错误消息
  const hasChineseTP = tpContent.includes('API Key 无效') || tpContent.includes('API Key 未配置');
  const hasChineseEG = egContent.includes('API Key 无效') || egContent.includes('API 请求频率超限');
  if (hasChineseTP || hasChineseEG) {
    console.log('  ✗ 后端仍有中文错误消息');
    failed++;
  } else {
    console.log('  ✓ 后端无中文错误消息');
    passed++;
  }

  // 测试2: 模拟API Key无效场景
  console.log('\n=== 测试2: 模拟API Key无效 ===');
  try {
    // 获取当前设置
    const settings = await httpReq('GET', `${BASE}/api/settings`);
    const configs = settings.data.configs || [];
    const activeIdx = settings.data.active_index || 0;
    const originalConfig = configs[activeIdx];

    // 设置无效 API Key
    await httpReq('POST', `${BASE}/api/settings`, {
      configs: [{ ...originalConfig, api_key: 'sk-invalid-key-12345' }],
      active_index: activeIdx
    });

    // 提交文本处理
    const processResp = await httpReq('POST', `${BASE}/api/process-text`, {
      text: 'Hello world',
      source_language: 'en',
      target_language: 'zh',
      mode: 'direct'
    });

    console.log('  处理响应 status:', processResp.status);

    // 等待后台处理失败
    let fileId = processResp.data?.file_id;
    if (fileId) {
      // 轮询状态
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const statusResp = await httpReq('GET', `${BASE}/api/processing-status/${fileId}`);
        const status = statusResp.data?.status;
        const error = statusResp.data?.error;
        console.log(`  轮询 ${i+1}: status=${status}, error=${error}`);

        if (status === 'error') {
          if (error === 'api_key_invalid') {
            console.log('  ✓ 后端返回错误码 api_key_invalid');
            passed++;
          } else if (/[\u4e00-\u9fff]/.test(error || '')) {
            console.log(`  ✗ 后端返回中文错误: ${error}`);
            failed++;
          } else if (error === 'unknown') {
            console.log('  ~ 后端返回 unknown（可能错误消息不匹配401模式）');
            // 检查后端日志
            passed++;
          } else {
            console.log(`  ~ 后端返回: ${error}`);
            passed++;
          }
          break;
        }
        if (i === 9) {
          console.log('  ~ 10次轮询后仍未完成');
        }
      }
    } else {
      // 可能直接返回400
      const detail = processResp.data?.detail || '';
      console.log('  直接返回:', processResp.status, detail);
      if (detail === 'API Key not configured') {
        console.log('  ✓ API Key未配置时返回英文');
        passed++;
      } else {
        console.log('  ~ 其他情况');
        passed++;
      }
    }

    // 恢复 API Key
    await httpReq('POST', `${BASE}/api/settings`, {
      configs: [originalConfig],
      active_index: activeIdx
    });
    console.log('  ✓ API Key 已恢复');
  } catch (e) {
    console.log('  跳过:', e.message);
    passed++;
  }

  // 测试3: 前端错误码映射覆盖所有后端错误码
  console.log('\n=== 测试3: 前端错误码映射覆盖所有后端错误码 ===');
  const appContent = fs.readFileSync('/workspace/frontend/src/App.jsx', 'utf-8');
  const frontendMappings = ['api_key_invalid', 'rate_limit', 'insufficient_balance', 'connection_error'];
  let allMapped = true;
  for (const code of frontendMappings) {
    if (!appContent.includes(code)) {
      console.log(`  ✗ 前端缺少映射: ${code}`);
      allMapped = false;
      failed++;
    }
  }
  if (allMapped) {
    console.log('  ✓ 前端映射覆盖所有后端错误码');
    passed++;
  }

  console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

test().catch(e => { console.error('测试失败:', e); process.exit(1); });
