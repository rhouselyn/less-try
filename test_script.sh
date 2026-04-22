#!/bin/bash

# 测试脚本：测试少邻国应用的功能

# 测试步骤：
# 1. 启动后端服务器
# 2. 启动前端服务器
# 3. 访问前端页面
# 4. 输入测试文本 "hi man. what's up"
# 5. 测试阶段一的单词学习
# 6. 测试阶段二的句子练习
# 7. 验证所有功能是否正常工作

# 测试配置
BACKEND_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:3006"

# 测试文本
TEST_TEXT="hi man. what's up"

# 启动后端服务器
echo "启动后端服务器..."
cd /workspace/backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload > backend.log 2>&1 &
BACKEND_PID=$!

# 启动前端服务器
echo "启动前端服务器..."
cd /workspace/frontend
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!

echo "服务器启动成功，后端PID: $BACKEND_PID 前端PID: $FRONTEND_PID"

# 等待服务器完全启动
echo "等待服务器完全启动..."
sleep 5

# 测试处理文本
echo "测试处理文本..."
FILE_ID=$(curl -s -X POST "$BACKEND_URL/api/process-text" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"$TEST_TEXT\", \"source_language\": \"en\", \"target_language\": \"zh\"}" | jq -r '.file_id')

echo "处理文本成功，文件ID: $FILE_ID"

# 等待处理完成
echo "等待文本处理完成..."
sleep 10

# 测试获取学习进度
echo "测试获取学习进度..."
curl -s "$BACKEND_URL/api/learn/$FILE_ID/progress"

echo "\n测试获取阶段2单元..."
curl -s "$BACKEND_URL/api/$FILE_ID/phase/2/units"

echo "\n测试完成！请访问前端页面 http://localhost:3006 进行手动测试。"
echo "测试步骤："
echo "1. 点击\"开始学习\"按钮"
echo "2. 检查阶段一的单元是否显示单词数量"
echo "3. 完成阶段一的学习，检查是否显示打勾"
echo "4. 进入阶段二的学习，完成所有练习"
echo "5. 检查阶段二结束后是否显示结束提示和\"完成\"按钮"

echo "\n按 Ctrl+C 停止服务器..."

# 等待用户输入
read -p "按 Enter 键停止服务器..."

# 停止服务器
kill $BACKEND_PID $FRONTEND_PID

echo "服务器已停止"
