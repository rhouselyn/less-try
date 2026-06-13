// 预加载脚本 - 最小化实现，不暴露 Node.js API 给渲染进程
// 所有前端功能通过后端 API 实现，无需 Electron 特权 API
window.addEventListener('DOMContentLoaded', () => {
  console.log('Gualingo desktop app loaded');
});
