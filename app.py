"""呱邻国桌面应用启动入口。

启动 FastAPI 后端服务，然后用 PyWebView 打开原生窗口。
支持 PyInstaller 打包为单文件可执行程序。
"""

import sys
import os
import threading
import time
import webview  # pywebview

# ── 路径修正：PyInstaller 打包后资源在 _MEIPASS 目录 ──
def get_base_path():
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

BASE_PATH = get_base_path()

# ── 设置环境变量 ──
def setup_env():
    # 数据目录：放在用户目录下，而非临时目录
    if sys.platform == 'win32':
        data_dir = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'Lesslingo')
    elif sys.platform == 'darwin':
        data_dir = os.path.expanduser('~/Library/Application Support/Lesslingo')
    else:
        data_dir = os.path.expanduser('~/.local/share/Lesslingo')

    os.makedirs(data_dir, exist_ok=True)
    config_dir = os.path.join(data_dir, 'config')
    os.makedirs(config_dir, exist_ok=True)

    os.environ['DATA_DIR'] = data_dir
    os.environ['CONFIG_DIR'] = config_dir

    # 前端静态文件目录（打包后的前端）
    frontend_dist = os.path.join(BASE_PATH, 'frontend', 'dist')
    os.environ['FRONTEND_DIST_DIR'] = frontend_dist

    return data_dir, config_dir

# ── 启动后端 ──
def start_backend():
    import uvicorn
    from main import app
    uvicorn.run(app, host='127.0.0.1', port=18000, log_level='warning', timeout_keep_alive=600)

# ── 主函数 ──
def main():
    data_dir, config_dir = setup_env()

    # 在子线程启动后端
    backend_thread = threading.Thread(target=start_backend, daemon=True)
    backend_thread.start()

    # 等待后端就绪
    import urllib.request
    import urllib.error
    for i in range(30):
        try:
            urllib.request.urlopen('http://127.0.0.1:18000/api/history', timeout=1)
            break
        except (urllib.error.URLError, ConnectionRefusedError, OSError):
            time.sleep(0.5)

    # 创建 PyWebView 窗口
    window = webview.create_window(
        title='呱邻国 - Lesslingo',
        url='http://127.0.0.1:18000',
        width=1200,
        height=800,
        min_size=(800, 600),
        text_select=True,
    )

    # 启动窗口事件循环（阻塞）
    webview.start(debug=False)

    # 窗口关闭后退出
    sys.exit(0)


if __name__ == '__main__':
    main()
