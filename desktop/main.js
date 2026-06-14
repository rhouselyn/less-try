const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let backendProcess = null;
const BACKEND_PORT = 18000;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

function getBackendExePath() {
  const resourcesPath = process.resourcesPath;
  const exeName = process.platform === 'win32' ? 'Gualingo.exe' : 'Gualingo';
  return path.join(resourcesPath, 'backend', exeName);
}

function getFrontendDistPath() {
  return path.join(process.resourcesPath, 'frontend');
}

function getIconPath() {
  if (process.platform === 'win32') {
    return path.join(process.resourcesPath, 'assets', 'icon.ico');
  } else if (process.platform === 'darwin') {
    return path.join(process.resourcesPath, 'assets', 'icon_macos.png');
  }
  return path.join(process.resourcesPath, 'assets', 'icon.png');
}

function startBackend() {
  const isDev = !app.isPackaged;
  const frontendPath = isDev
    ? path.join(__dirname, '..', 'frontend', 'dist')
    : getFrontendDistPath();

  const env = Object.assign({}, process.env, {
    FRONTEND_DIR: frontendPath,
  });

  if (isDev) {
    backendProcess = spawn('python', [path.join(__dirname, '..', 'app.py')], {
      env,
      stdio: 'pipe',
    });
  } else {
    const backendExe = getBackendExePath();
    backendProcess = spawn(backendExe, [], {
      env,
      stdio: 'pipe',
    });
  }

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend] ${data}`);
  });

  backendProcess.on('error', (err) => {
    console.error('Failed to start backend:', err);
  });

  backendProcess.on('exit', (code) => {
    console.log(`Backend exited with code ${code}`);
    backendProcess = null;
  });
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

function waitForBackend(maxRetries = 60, interval = 500) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const check = () => {
      http.get(`${BACKEND_URL}/api/history`, (res) => {
        res.resume();
        resolve();
      }).on('error', () => {
        retries++;
        if (retries >= maxRetries) {
          reject(new Error('Backend failed to start within timeout'));
        } else {
          setTimeout(check, interval);
        }
      });
    };
    check();
  });
}

function createWindow() {
  const iconPath = app.isPackaged ? getIconPath() : undefined;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: '呱邻国 - Gualingo',
    icon: iconPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 移除默认菜单栏（File, Edit, Window, Help）
  Menu.setApplicationMenu(null);

  mainWindow.loadURL(BACKEND_URL);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  startBackend();

  try {
    await waitForBackend();
  } catch (err) {
    console.error(err.message);
    app.quit();
    return;
  }

  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  stopBackend();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
