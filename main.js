const { app, BrowserWindow, Notification, ipcMain } = require("electron");
const path = require("path");

let mainWindow = null;
let isCompact = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 650,
    resizable: false,
    titleBarStyle: "hiddenInset",
    title: "番茄钟",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// 处理渲染进程发来的通知请求
ipcMain.handle("show-notification", (_event, { title, body }) => {
  if (Notification.isSupported()) {
    const notif = new Notification({ title, body, silent: false });
    notif.show();
  }
});

// 处理置顶切换请求
ipcMain.handle("toggle-always-on-top", () => {
  if (mainWindow) {
    const current = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!current);
    return !current;
  }
  return false;
});

// 获取当前置顶状态
ipcMain.handle("get-always-on-top", () => {
  return mainWindow ? mainWindow.isAlwaysOnTop() : false;
});

// 切换缩小模式
ipcMain.handle("toggle-compact", () => {
  if (!mainWindow) return false;
  isCompact = !isCompact;
  if (isCompact) {
    mainWindow.setMinimumSize(200, 160);
    mainWindow.setSize(200, 160);
  } else {
    mainWindow.setMinimumSize(400, 650);
    mainWindow.setSize(400, 650);
  }
  mainWindow.setResizable(false);
  mainWindow.center();
  return isCompact;
});

// 获取当前缩小状态
ipcMain.handle("get-is-compact", () => {
  return isCompact;
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});