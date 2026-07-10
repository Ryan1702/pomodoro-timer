const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pomodoroAPI", {
  /**
   * 发送系统通知
   * @param {string} title 通知标题
   * @param {string} body 通知正文
   */
  showNotification: (title, body) => {
    ipcRenderer.invoke("show-notification", { title, body });
  },

  /**
   * 切换窗口置顶状态，返回切换后的状态
   * @returns {Promise<boolean>}
   */
  toggleAlwaysOnTop: () => {
    return ipcRenderer.invoke("toggle-always-on-top");
  },

  /**
   * 获取当前置顶状态
   * @returns {Promise<boolean>}
   */
  getAlwaysOnTop: () => {
    return ipcRenderer.invoke("get-always-on-top");
  },

  /**
   * 切换窗口缩小模式，返回切换后的状态
   * @returns {Promise<boolean>}
   */
  toggleCompact: () => {
    return ipcRenderer.invoke("toggle-compact");
  },

  /**
   * 获取当前缩小模式状态
   * @returns {Promise<boolean>}
   */
  getIsCompact: () => {
    return ipcRenderer.invoke("get-is-compact");
  },

  /**
   * 添加金币
   * @param {number} amount 要添加的金币数量
   * @returns {Promise<{success: boolean, oldCoins?: number, newCoins?: number, error?: string}>}
   */
  addCoins: (amount) => {
    return ipcRenderer.invoke("add-coins", amount);
  },

  /**
   * 查询当前金币
   * @returns {Promise<{success: boolean, coins?: number, minutes?: number, error?: string}>}
   */
  getCoins: () => {
    return ipcRenderer.invoke("get-coins");
  },

  /**
   * 检查金币信号文件（由 command 脚本写入）
   * 渲染进程定期轮询此方法以接收添加金币指令
   * @returns {Promise<{found: boolean, amount?: number, error?: string}>}
   */
  checkCoinsSignal: () => {
    return ipcRenderer.invoke("check-coins-signal");
  },
});