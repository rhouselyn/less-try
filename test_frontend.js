const axios = require('axios');

// 配置axios超时时间为10分钟
axios.defaults.timeout = 600000;

async function test_frontend_flow(text) {
    console.log(`测试文本: '${text}'`);
    
    try {
        // 模拟前端的处理请求
        const response = await axios.post('http://localhost:8000/api/process-text', {
            text: text.trim(),
            source_language: 'en',
            target_language: 'zh'
        });
        
        console.log('API响应:', response.data);
        if (response.data && response.data.file_id) {
            const fileId = response.data.file_id;
            console.log('获取到文件ID:', fileId);
            
            // 模拟前端的轮询检查
            let pollCount = 0;
            const maxPolls = 300; // 10分钟
            
            while (pollCount < maxPolls) {
                pollCount++;
                console.log(`第${pollCount}次轮询，文件ID: ${fileId}`);
                
                try {
                    const statusResponse = await axios.get(`http://localhost:8000/api/status/${fileId}`);
                    const status = statusResponse.data;
                    console.log('状态响应:', status);
                    
                    if (status.status === 'completed') {
                        console.log('处理完成，词汇表长度:', status.vocab.length);
                        return true;
                    } else if (status.status === 'error') {
                        console.error('处理错误:', status.error);
                        return false;
                    } else if (pollCount >= maxPolls) {
                        console.error('轮询超时');
                        return false;
                    } else {
                        // 继续轮询，与前端相同的间隔
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } catch (error) {
                    console.error('轮询错误:', error);
                    if (pollCount >= maxPolls) {
                        console.error('网络错误');
                        return false;
                    } else {
                        // 继续轮询
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
        } else {
            throw new Error('无效的API响应');
        }
    } catch (error) {
        console.error('处理文本错误:', error);
        return false;
    }
}

async function main() {
    // 测试两个文本
    const text1 = "AI models generate responses, and outputs based on complex .";
    const text2 = "AI models generate responses. and outputs based on complex .";
    
    console.log("测试文本1:");
    const result1 = await test_frontend_flow(text1);
    console.log(`文本1处理结果: ${result1 ? '成功' : '失败'}`);
    console.log("\n" + "=".repeat(50) + "\n");
    
    console.log("测试文本2:");
    const result2 = await test_frontend_flow(text2);
    console.log(`文本2处理结果: ${result2 ? '成功' : '失败'}`);
}

main();