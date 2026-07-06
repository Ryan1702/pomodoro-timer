const { app, BrowserWindow, Notification, ipcMain } = require("electron");
const path = require("path");

let mainWindow = null;

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

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});