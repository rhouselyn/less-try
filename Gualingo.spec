# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller spec 文件 - 呱邻国桌面应用"""

import os
import sys

block_cipher = None

# 项目根目录：SPECPATH 就是 spec 文件所在目录
ROOT = os.path.abspath(SPECPATH)

# 后端目录
BACKEND = os.path.join(ROOT, 'backend')

# 前端构建产物目录（需先 npm run build）
FRONTEND_DIST = os.path.join(ROOT, 'frontend-soft-ui', 'dist')

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

# 收集前端构建产物
frontend_datas = []
if os.path.isdir(FRONTEND_DIST):
    frontend_datas.append((FRONTEND_DIST, os.path.join('frontend', 'dist')))

# NLTK 数据
nltk_data = os.path.expanduser('~/nltk_data')
nltk_datas = []
if os.path.isdir(nltk_data):
    nltk_datas.append((nltk_data, 'nltk_data'))

all_datas = backend_datas + frontend_datas + nltk_datas

# 隐式导入（PyInstaller 无法自动检测的模块）
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
    'pywebview',
    'pywebview.platforms',
    'sqlite3',
    'nltk',
    'nltk.tokenize',
    'nltk.tokenize.punkt',
]

a = Analysis(
    [os.path.join(ROOT, 'app.py')],
    pathex=[ROOT, BACKEND],
    binaries=[],
    datas=all_datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['matplotlib', 'scipy', 'numpy', 'pandas', 'PIL', 'tkinter'],
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
    icon=None,  # 可替换为应用图标路径
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
