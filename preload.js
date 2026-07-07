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
});