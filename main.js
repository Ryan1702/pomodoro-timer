const { app, BrowserWindow, Notification, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow = null;
let isCompact = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 680,
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

// 处理添加金币请求（来自 command 脚本或命令行）
ipcMain.handle("add-coins", async (_event, amount) => {
  if (!mainWindow) return { success: false, error: "窗口未创建" };
  try {
    const result = await mainWindow.webContents.executeJavaScript(`
      (function() {
        let lifetimeMinutes = 0;
        let lifetimeCoins = 0;
        try {
          const saved = localStorage.getItem("lifetimeStats");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (typeof parsed.minutes === "number") lifetimeMinutes = parsed.minutes;
            if (typeof parsed.coins === "number") lifetimeCoins = parsed.coins;
          }
        } catch (_) {}
        const oldCoins = lifetimeCoins;
        lifetimeCoins += ${amount};
        const newStats = JSON.stringify({ minutes: lifetimeMinutes, coins: lifetimeCoins });
        localStorage.setItem("lifetimeStats", newStats);
        return { success: true, oldCoins: oldCoins, newCoins: lifetimeCoins, minutes: lifetimeMinutes };
      })()
    `);
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// 处理查询金币请求
ipcMain.handle("get-coins", async () => {
  if (!mainWindow) return { success: false, error: "窗口未创建" };
  try {
    return await mainWindow.webContents.executeJavaScript(`
      (function() {
        try {
          const saved = localStorage.getItem("lifetimeStats");
          if (saved) {
            const parsed = JSON.parse(saved);
            return { success: true, coins: parsed.coins || 0, minutes: parsed.minutes || 0 };
          }
        } catch (_) {}
        return { success: true, coins: 0, minutes: 0 };
      })()
    `);
  } catch (e) {
    return { success: false, error: e.message };
  }
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
    mainWindow.setMinimumSize(400, 680);
    mainWindow.setSize(400, 680);
  }
  mainWindow.setResizable(false);
  mainWindow.center();
  return isCompact;
});

// 获取当前缩小状态
ipcMain.handle("get-is-compact", () => {
  return isCompact;
});

// 金币信号文件路径
const COINS_SIGNAL_FILE = path.join(app.getPath("userData"), "add_coins.signal");

// 检查并处理金币信号文件（由渲染进程轮询调用）
ipcMain.handle("check-coins-signal", async () => {
  try {
    if (!fs.existsSync(COINS_SIGNAL_FILE)) {
      return { found: false };
    }
    const content = fs.readFileSync(COINS_SIGNAL_FILE, "utf-8").trim();
    const amount = parseInt(content, 10);
    if (isNaN(amount) || amount <= 0) {
      fs.unlinkSync(COINS_SIGNAL_FILE);
      return { found: false };
    }
    // 读取后立即删除，防止重复添加
    fs.unlinkSync(COINS_SIGNAL_FILE);
    return { found: true, amount };
  } catch (e) {
    return { found: false, error: e.message };
  }
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