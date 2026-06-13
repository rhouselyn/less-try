"""呱邻国桌面应用启动入口。

启动 FastAPI 后端服务，然后打开浏览器窗口。
优先尝试 PyWebView 原生窗口，失败则回退到系统浏览器。
"""

import sys
import os
import threading
import time
import webbrowser

# ── 路径修正：PyInstaller 打包后资源在 _MEIPASS 目录 ──
def get_base_path():
    if getattr(sys, 'frozen', False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

BASE_PATH = get_base_path()

# 将 backend 目录加入 Python 搜索路径
BACKEND_PATH = os.path.join(BASE_PATH, 'backend')
if BACKEND_PATH not in sys.path:
    sys.path.insert(0, BACKEND_PATH)

# ── 设置环境变量 ──
def setup_env():
    # 数据目录：放在用户目录下，而非临时目录
    if sys.platform == 'win32':
        data_dir = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'Gualingo')
    elif sys.platform == 'darwin':
        data_dir = os.path.expanduser('~/Library/Application Support/Gualingo')
    else:
        data_dir = os.path.expanduser('~/.local/share/Gualingo')

    os.makedirs(data_dir, exist_ok=True)
    config_dir = os.path.join(data_dir, 'config')
    os.makedirs(config_dir, exist_ok=True)

    os.environ['DATA_DIR'] = data_dir
    os.environ['CONFIG_DIR'] = config_dir

    # 前端静态文件目录（优先使用 frontend-soft-ui，其次 frontend）
    frontend_dist = os.path.join(BASE_PATH, 'frontend-soft-ui', 'dist')
    if not os.path.isdir(frontend_dist) or not os.path.isfile(os.path.join(frontend_dist, 'index.html')):
        frontend_dist = os.path.join(BASE_PATH, 'frontend', 'dist')
    os.environ['FRONTEND_DIST_DIR'] = frontend_dist

    return data_dir, config_dir

# ── 启动后端 ──
def start_backend():
    import uvicorn
    from main import app
    uvicorn.run(app, host='127.0.0.1', port=18000, log_level='warning', timeout_keep_alive=600)

# ── 尝试 PyWebView 原生窗口 ──
def try_pywebview():
    try:
        import webview
        window = webview.create_window(
            title='呱邻国 - Gualingo',
            url='http://127.0.0.1:18000',
            width=1200,
            height=800,
            min_size=(800, 600),
            text_select=True,
        )
        webview.start(debug=False)
        return True
    except Exception:
        return False

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

    # 优先尝试 PyWebView 原生窗口，失败则打开系统浏览器
    if not try_pywebview():
        webbrowser.open('http://127.0.0.1:18000')
        # 浏览器模式下，保持后端运行直到用户 Ctrl+C
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass

    sys.exit(0)


if __name__ == '__main__':
    main()
