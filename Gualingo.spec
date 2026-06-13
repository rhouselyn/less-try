# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec 文件 - 呱邻国后端服务

只打包 Python 后端为可执行文件，前端和图标由 electron-builder 处理。
"""

import os
import sys

block_cipher = None

# 项目根目录
ROOT = os.path.abspath(SPECPATH)

# 图标路径（按平台选择）
if sys.platform == 'win32':
    ICON_PATH = os.path.join(ROOT, 'assets', 'icon.ico')
elif sys.platform == 'darwin':
    ICON_PATH = os.path.join(ROOT, 'assets', 'icon_macos.png')
else:
    ICON_PATH = os.path.join(ROOT, 'assets', 'icon.png')

# 后端目录
BACKEND = os.path.join(ROOT, 'backend')

# 收集后端所有 Python 文件
backend_datas = []
if os.path.isdir(BACKEND):
    for f in os.listdir(BACKEND):
        fp = os.path.join(BACKEND, f)
        if f.endswith('.py'):
            backend_datas.append((fp, 'backend'))
        elif f == 'requirements.txt':
            backend_datas.append((fp, 'backend'))

    # 收集后端子目录
    for subdir in ['routers', 'utils']:
        sd = os.path.join(BACKEND, subdir)
        if os.path.isdir(sd):
            backend_datas.append((sd, os.path.join('backend', subdir)))

# 隐式导入
hiddenimports = [
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'fastapi',
    'fastapi.responses',
    'fastapi.staticfiles',
    'starlette.routing',
    'starlette.middleware',
    'starlette.middleware.cors',
    'sqlite3',
]

excludes = ['matplotlib', 'scipy', 'numpy', 'pandas', 'PIL', 'tkinter',
            'pywebview', 'pythonnet', 'clr_loader', 'clr']

a = Analysis(
    [os.path.join(ROOT, 'app.py')],
    pathex=[ROOT, BACKEND],
    binaries=[],
    datas=backend_datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='Gualingo',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    icon=ICON_PATH,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='Gualingo',
)
