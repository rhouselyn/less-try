"""呱邻国桌面应用启动入口。

启动 FastAPI 后端服务，自动打开浏览器，最小化到系统托盘。
关闭浏览器窗口后服务继续运行，右键托盘图标退出。
支持 PyInstaller 打包为可执行程序。
"""

import sys
import os
import threading
import time
import webbrowser
import signal

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

    # 前端静态文件目录
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

# ── 系统托盘 ──
def run_tray():
    """系统托盘图标，右键菜单可退出"""
    try:
        from PIL import Image
        import pystray
        from pystray import MenuItem as item

        # 加载图标
        icon_path = os.path.join(BASE_PATH, 'assets', 'icon.png')
        if not os.path.isfile(icon_path):
            icon_path = os.path.join(BASE_PATH, 'assets', 'icon_macos.png')
        if os.path.isfile(icon_path):
            icon_image = Image.open(icon_path)
        else:
            # 生成一个简单的绿色图标
            icon_image = Image.new('RGBA', (64, 64), (92, 255, 65, 255))

        def on_quit(icon, item):
            icon.stop()
            os.kill(os.getpid(), signal.SIGTERM)

        menu = pystray.Menu(
            item('打开呱邻国', lambda: webbrowser.open('http://127.0.0.1:18000')),
            item('退出', on_quit),
        )

        tray_icon = pystray.Icon('Gualingo', icon_image, '呱邻国 - Gualingo', menu)
        tray_icon.run()
    except ImportError:
        # 没有 pystray/PIL，就阻塞等待用户 Ctrl+C
        print("呱邻国正在运行中，访问 http://127.0.0.1:18000")
        print("按 Ctrl+C 退出")
        try:
            signal.pause()
        except AttributeError:
            # Windows 没有 signal.pause
            while True:
                time.sleep(1)

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

    # 自动打开浏览器
    webbrowser.open('http://127.0.0.1:18000')

    # 启动系统托盘（阻塞主线程）
    run_tray()

    # 退出
    sys.exit(0)


if __name__ == '__main__':
    main()
