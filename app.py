"""呱邻国桌面应用后端启动入口。

启动 FastAPI 后端服务。
支持 PyInstaller 打包为可执行程序，由 Electron 壳调用。
"""

import sys
import os


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
    # 数据目录：放在用户目录下
    if sys.platform == 'win32':
        data_dir = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'Gualingo')
    elif sys.platform == 'darwin':
        data_dir = os.path.expanduser('~/Library/Application Support/Gualingo')
    else:
        data_dir = os.path.expanduser('~/.local/share/Gualingo')

    os.makedirs(data_dir, exist_ok=True)
    config_dir = os.path.join(data_dir, 'config')
    os.makedirs(config_dir, exist_ok=True)

    os.environ.setdefault('DATA_DIR', data_dir)
    os.environ.setdefault('CONFIG_DIR', config_dir)

    # 前端静态文件目录（由 Electron 通过环境变量传入，开发模式下自动查找）
    if 'FRONTEND_DIST_DIR' not in os.environ:
        frontend_dist = os.path.join(BASE_PATH, 'frontend-soft-ui', 'dist')
        if not os.path.isdir(frontend_dist) or not os.path.isfile(os.path.join(frontend_dist, 'index.html')):
            frontend_dist = os.path.join(BASE_PATH, 'frontend', 'dist')
        os.environ['FRONTEND_DIST_DIR'] = frontend_dist


# ── 主函数 ──
def main():
    setup_env()
    import uvicorn
    from main import app
    uvicorn.run(app, host='127.0.0.1', port=18000, log_level='warning', timeout_keep_alive=600)


if __name__ == '__main__':
    main()
