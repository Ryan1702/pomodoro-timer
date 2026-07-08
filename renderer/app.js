// ====== 番茄钟核心逻辑 ======

// --- 配置 ---
const DEFAULT_CONFIG = {
  focus: 25,       // 25 分钟专注
  shortBreak: 5,   // 5 分钟短休息
  longBreak: 15,   // 15 分钟长休息
  longBreakInterval: 4, // 每 4 个番茄后长休息
};

// 从 localStorage 加载用户设置，fallback 到默认值
function loadConfig() {
  try {
    const saved = localStorage.getItem("pomodoroConfig");
    if (saved) {
      const parsed = JSON.parse(saved);
      // 合并保存值，确保所有 key 都有效（正整数）
      const merged = { ...DEFAULT_CONFIG };
      for (const k of ["focus", "shortBreak", "longBreak", "longBreakInterval"]) {
        const v = parseInt(parsed[k], 10);
        if (!isNaN(v) && v >= 1 && v <= 120) {
          merged[k] = v;
        }
      }
      return merged;
    }
  } catch (_) { /* ignore parse error */ }
  return { ...DEFAULT_CONFIG };
}

function saveConfig(cfg) {
  try {
    localStorage.setItem("pomodoroConfig", JSON.stringify({
      focus: cfg.focus,
      shortBreak: cfg.shortBreak,
      longBreak: cfg.longBreak,
      longBreakInterval: cfg.longBreakInterval,
    }));
  } catch (_) { /* ignore quota */ }
}

let CONFIG = loadConfig();

// 阶段定义（根据 CONFIG 构建，duration 转秒）
function buildPhases(cfg) {
  return [
    { name: "focus",      label: "专注",    duration: cfg.focus * 60,      next: "shortBreak" },
    { name: "shortBreak", label: "短休息",  duration: cfg.shortBreak * 60, next: "focus"       },
    { name: "longBreak",  label: "长休息",  duration: cfg.longBreak * 60,  next: "focus"       },
  ];
}

let PHASES = buildPhases(CONFIG);

const RING_CIRCUMFERENCE = 2 * Math.PI * 88; // ≈ 552.92

// --- 状态 ---
let state = {
  phase: "focus",           // 当前阶段: focus | shortBreak | longBreak
  totalSeconds: CONFIG.focus * 60, // 当前阶段总秒数
  remaining: CONFIG.focus * 60,    // 剩余秒数
  running: false,             // 是否正在运行
  pomodoroCount: 0,           // 本轮已完成番茄数
  sessionNumber: 1,           // 当前是第几轮（第几个番茄或休息）
  timerId: null,              // setInterval id
};

// --- DOM 元素 ---
const el = {
  phaseLabel:   document.getElementById("phaseLabel"),
  timerText:    document.getElementById("timerText"),
  progressRing: document.getElementById("progressRing"),
  btnStartPause: document.getElementById("btnStartPause"),
  btnSkip:      document.getElementById("btnSkip"),
  btnReset:     document.getElementById("btnReset"),
  iconPlay:     document.getElementById("iconPlay"),
  iconPause:    document.getElementById("iconPause"),
  countText:    document.getElementById("countText"),
  sessionHint:  document.getElementById("sessionHint"),
  // 设置面板
  btnSettings:  document.getElementById("btnSettings"),
  settingsPanel: document.getElementById("settingsPanel"),
  inputFocus:   document.getElementById("inputFocus"),
  inputShortBreak: document.getElementById("inputShortBreak"),
  inputLongBreak: document.getElementById("inputLongBreak"),
  // 置顶按钮
  btnPin:       document.getElementById("btnPin"),
  // 缩小按钮
  btnCompact:   document.getElementById("btnCompact"),
  iconCompactEnter: document.getElementById("iconCompactEnter"),
  iconCompactExit:  document.getElementById("iconCompactExit"),
};

// --- 根据阶段更新 UI 主题 ---
function applyPhaseTheme() {
  // 保留 is-compact 类，只切换阶段主题类
  const phaseCls = { focus: "", shortBreak: "short-break", longBreak: "long-break" };
  const target = phaseCls[state.phase] || "";
  // 移除所有阶段相关的类，但不影响 is-compact
  document.body.classList.remove("short-break", "long-break");
  if (target) {
    document.body.classList.add(target);
  }
  el.phaseLabel.textContent = PHASES.find((p) => p.name === state.phase).label;
}

// --- 格式化时间 ---
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// --- 更新进度环 ---
function updateRing() {
  const offset = RING_CIRCUMFERENCE * (1 - state.remaining / state.totalSeconds);
  el.progressRing.setAttribute("stroke-dashoffset", offset);
  el.timerText.textContent = formatTime(state.remaining);
}

// --- 更新番茄计数 ---
function updateCount() {
  el.countText.textContent = `×${state.pomodoroCount}`;
  el.sessionHint.textContent = `第 ${state.sessionNumber} 轮`;
}

// --- 设置按钮状态 ---
function setPlayIcon(isRunning) {
  el.iconPlay.style.display = isRunning ? "none" : "";
  el.iconPause.style.display = isRunning ? "" : "none";
  el.btnStartPause.title = isRunning ? "暂停" : "开始";
}

// --- 获取当前阶段的配置 ---
function getPhaseConfig() {
  return PHASES.find((p) => p.name === state.phase);
}

// --- 确定下一阶段 ---
function getNextPhase() {
  if (state.phase === "focus") {
    state.pomodoroCount++;
    // 每完成 CONFIG.longBreakInterval 个番茄，进入长休息
    if (state.pomodoroCount % CONFIG.longBreakInterval === 0) {
      return "longBreak";
    }
    return "shortBreak";
  }
  // 休息结束后回到专注
  state.sessionNumber++;
  return "focus";
}

// --- 切换阶段 ---
function switchPhase(nextPhase) {
  const phaseConfig = PHASES.find((p) => p.name === nextPhase);

  state.phase = nextPhase;
  state.totalSeconds = phaseConfig.duration;
  state.remaining = phaseConfig.duration;
  state.running = false;
  clearInterval(state.timerId);
  state.timerId = null;

  applyPhaseTheme();
  updateRing();
  updateCount();
  setPlayIcon(false);

  // 发送系统通知
  const prevLabel = el.phaseLabel.textContent;
  if (typeof window.pomodoroAPI !== "undefined") {
    window.pomodoroAPI.showNotification(
      `${prevLabel} 结束`,
      `开始${phaseConfig.label}（${Math.floor(phaseConfig.duration / 60)} 分钟）`
    );
  }
}

// --- 开始计时 ---
function startTimer() {
  if (state.running) return;
  state.running = true;
  setPlayIcon(true);

  state.timerId = setInterval(() => {
    state.remaining--;
    updateRing();

    if (state.remaining <= 0) {
      // 时间到，切换阶段
      clearInterval(state.timerId);
      state.timerId = null;
      const next = getNextPhase();
      switchPhase(next);
    }
  }, 1000);
}

// --- 暂停计时 ---
function pauseTimer() {
  if (!state.running) return;
  state.running = false;
  setPlayIcon(false);
  clearInterval(state.timerId);
  state.timerId = null;
}

// --- 跳过当前阶段 ---
function skipPhase() {
  clearInterval(state.timerId);
  state.timerId = null;
  const next = getNextPhase();
  switchPhase(next);
}

// --- 重置整个周期 ---
function resetAll() {
  clearInterval(state.timerId);
  state.timerId = null;

  state.phase = "focus";
  state.totalSeconds = CONFIG.focus * 60;
  state.remaining = CONFIG.focus * 60;
  state.running = false;
  state.pomodoroCount = 0;
  state.sessionNumber = 1;

  applyPhaseTheme();
  updateRing();
  updateCount();
  setPlayIcon(false);
}

// --- 事件绑定 ---
el.btnStartPause.addEventListener("click", () => {
  if (state.running) {
    pauseTimer();
  } else {
    startTimer();
  }
});

el.btnSkip.addEventListener("click", () => {
  skipPhase();
});

el.btnReset.addEventListener("click", () => {
  resetAll();
});

// --- 初始化 ---
applyPhaseTheme();
updateRing();
updateCount();
setPlayIcon(false);

// ====== 设置面板逻辑 ======

// 初始化输入框值为当前 CONFIG
function syncInputsToConfig() {
  el.inputFocus.value = CONFIG.focus;
  el.inputShortBreak.value = CONFIG.shortBreak;
  el.inputLongBreak.value = CONFIG.longBreak;
}
syncInputsToConfig();

// 切换设置面板显示
el.btnSettings.addEventListener("click", () => {
  el.settingsPanel.classList.toggle("hidden");
});

// 通用输入处理：校验 → 更新 CONFIG → 重建 PHASES → 同步当前状态 → 保存
function onDurationChange(phaseKey, inputEl) {
  return () => {
    let val = parseInt(inputEl.value, 10);
    // 校验
    if (isNaN(val) || val < 1) val = 1;
    if (val > 120) val = 120;

    // 修正输入框显示
    if (inputEl.value !== String(val)) {
      inputEl.value = val;
    }

    // 更新 CONFIG
    CONFIG[phaseKey] = val;

    // 重建 PHASES
    PHASES = buildPhases(CONFIG);

    // 如果当前阶段正好是被修改的阶段，且计时器未运行，立即同步剩余时间
    const phaseMap = { focus: "focus", shortBreak: "shortBreak", longBreak: "longBreak" };
    if (!state.running && phaseMap[phaseKey] === state.phase) {
      state.totalSeconds = val * 60;
      state.remaining = val * 60;
      updateRing();
    }

    // 持久化
    saveConfig(CONFIG);
  };
}

el.inputFocus.addEventListener("change", onDurationChange("focus", el.inputFocus));
el.inputShortBreak.addEventListener("change", onDurationChange("shortBreak", el.inputShortBreak));
el.inputLongBreak.addEventListener("change", onDurationChange("longBreak", el.inputLongBreak));

// 也监听输入实时修正（失焦时已经由 change 处理，这里处理直接按回车等场景）
// 额外：点击其他地方失焦时 change 已触发，覆盖了主要场景

// ====== 置顶按钮逻辑 ======
let isPinned = false;

// 启动时从主进程获取当前置顶状态
(async function initPinState() {
  if (typeof window.pomodoroAPI !== "undefined" && window.pomodoroAPI.getAlwaysOnTop) {
    isPinned = await window.pomodoroAPI.getAlwaysOnTop();
    if (isPinned) {
      el.btnPin.classList.add("is-pinned");
    }
  }
})();

el.btnPin.addEventListener("click", async () => {
  if (typeof window.pomodoroAPI !== "undefined" && window.pomodoroAPI.toggleAlwaysOnTop) {
    isPinned = await window.pomodoroAPI.toggleAlwaysOnTop();
    if (isPinned) {
      el.btnPin.classList.add("is-pinned");
    } else {
      el.btnPin.classList.remove("is-pinned");
    }
  }
});

// ====== 缩小按钮逻辑 ======
let isCompact = false;

// 启动时从主进程获取当前缩小状态
(async function initCompactState() {
  if (typeof window.pomodoroAPI !== "undefined" && window.pomodoroAPI.getIsCompact) {
    isCompact = await window.pomodoroAPI.getIsCompact();
    applyCompactUI();
  }
})();

function applyCompactUI() {
  if (isCompact) {
    document.body.classList.add("is-compact");
    el.iconCompactEnter.style.display = "none";
    el.iconCompactExit.style.display = "";
    el.btnCompact.title = "还原窗口";
  } else {
    document.body.classList.remove("is-compact");
    el.iconCompactEnter.style.display = "";
    el.iconCompactExit.style.display = "none";
    el.btnCompact.title = "缩小窗口";
  }
}

el.btnCompact.addEventListener("click", async () => {
  if (typeof window.pomodoroAPI !== "undefined" && window.pomodoroAPI.toggleCompact) {
    isCompact = await window.pomodoroAPI.toggleCompact();
    applyCompactUI();
  }
});