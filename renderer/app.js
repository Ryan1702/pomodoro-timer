// ====== 番茄钟核心逻辑 ======

// --- 主题商城 ---
const THEMES = [
  // 第1页 — 经典六款
  { id: "classic",  name: "经典番茄", swatch: "#e74c3c" },
  { id: "ocean",    name: "海风青",   swatch: "#008b8b" },
  { id: "forest",   name: "樱花粉",   swatch: "#e88d9c" },
  { id: "sunset",   name: "落日金",   swatch: "#d49b17" },
  { id: "lavender", name: "薰衣草紫", swatch: "#8e44ad" },
  { id: "graphite", name: "石墨灰",   swatch: "#2c3e50" },
  // 第2页 — 六款新主题
  { id: "spring-bud",  name: "春日嫩芽", swatch: "#2ecc71" },
  { id: "mint-fresh",  name: "薄荷冰泉", swatch: "#00b894" },
  { id: "aurora",      name: "极光幻境", swatch: "#6c5ce7" },
  { id: "peach-bloom", name: "桃气满满", swatch: "#fd79a8" },
  { id: "midnight",    name: "午夜星辰", swatch: "#1e3799" },
  { id: "lava-sunset", name: "落日熔岩", swatch: "#c0392b" },
];

let currentTheme = "classic";
try {
  const saved = localStorage.getItem("pomodoroTheme");
  // 兼容旧主题ID "amber-glow" → 替换为 "spring-bud"
  if (saved === "amber-glow") {
    currentTheme = "spring-bud";
    localStorage.setItem("pomodoroTheme", "spring-bud");
  } else if (saved && THEMES.find(t => t.id === saved)) {
    currentTheme = saved;
  }
} catch (_) {}
document.body.classList.add("theme-" + currentTheme);

function switchTheme(themeId) {
  if (themeId === currentTheme) return;
  document.body.classList.remove("theme-" + currentTheme);
  currentTheme = themeId;
  document.body.classList.add("theme-" + currentTheme);
  // 更新卡片激活状态
  document.querySelectorAll(".theme-card").forEach(card => {
    card.classList.toggle("active", card.dataset.theme === themeId);
  });
  // 更新进度环渐变（有渐变则用渐变，无则用纯色 CSS 变量）
  updateRingGradient(themeId);
  // 持久化
  try { localStorage.setItem("pomodoroTheme", themeId); } catch (_) {}
}

// 主题渐变映射（新6款用渐变环，经典6款用纯色环）
const THEME_GRADIENTS = {
  "spring-bud":  ["#f6d93e", "#2ecc71"],
  "mint-fresh":  ["#00b894", "#0984e3"],
  "aurora":      ["#00cec9", "#a29bfe"],
  "peach-bloom": ["#fd79a8", "#fab1a0"],
  "midnight":    ["#1e3799", "#8e44ad"],
  "lava-sunset": ["#c0392b", "#f1c40f"],
};

function updateRingGradient(themeId) {
  const defs = document.getElementById("ringGradients");
  if (!defs) return;
  const colors = THEME_GRADIENTS[themeId];
  if (colors) {
    // 渐变主题：注入 linearGradient
    defs.innerHTML = `
      <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
        <stop offset="0%" stop-color="${colors[0]}"/>
        <stop offset="100%" stop-color="${colors[1]}"/>
      </linearGradient>
    `;
    // 根据当前阶段选择 stroke：专注=渐变，休息=纯色
    if (state.phase === "focus") {
      el.progressRing.setAttribute("stroke", "url(#ringGrad)");
    } else if (state.phase === "shortBreak") {
      el.progressRing.setAttribute("stroke", "#27ae60");
    } else if (state.phase === "longBreak") {
      el.progressRing.setAttribute("stroke", "#3498db");
    }
  } else {
    // 非渐变主题：始终使用 CSS 变量
    defs.innerHTML = "";
    el.progressRing.setAttribute("stroke", "var(--ring-color)");
  }
}
const CARDS_PER_PAGE = 6;
let themePage = 0; // 当前页码

function buildThemeCards() {
  const grid = document.getElementById("themeGrid");
  const totalPages = Math.ceil(THEMES.length / CARDS_PER_PAGE);
  const start = themePage * CARDS_PER_PAGE;
  const pageThemes = THEMES.slice(start, start + CARDS_PER_PAGE);

  // 清空并重建当前页卡片
  grid.innerHTML = "";
  pageThemes.forEach(theme => {
    const card = document.createElement("div");
    card.className = "theme-card" + (theme.id === currentTheme ? " active" : "");
    card.dataset.theme = theme.id;
    card.innerHTML = `
      <div class="theme-swatch" style="background:${theme.swatch}"></div>
      <span class="theme-name">${theme.name}</span>
    `;
    card.addEventListener("click", () => switchTheme(theme.id));
    grid.appendChild(card);
  });

  // 更新翻页按钮状态
  updatePagerButtons(totalPages);
}

function goThemePage(delta) {
  themePage += delta;
  buildThemeCards();
}

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

// --- 永久统计（不会被 reset 清零）---
// lifetimeMinutes: 总专注分钟数（仅正常计时结束累加，跳过不计）
// lifetimeCoins: 总金币数 = 总专注分钟数（1分钟=1金币）
let lifetimeMinutes = 0;
let lifetimeCoins = 0;
try {
  const saved = localStorage.getItem("lifetimeStats");
  if (saved) {
    const parsed = JSON.parse(saved);
    if (typeof parsed.minutes === "number" && parsed.minutes >= 0) lifetimeMinutes = parsed.minutes;
    if (typeof parsed.coins === "number" && parsed.coins >= 0) lifetimeCoins = parsed.coins;
  }
} catch (_) {}

function saveLifetimeStats() {
  try {
    localStorage.setItem("lifetimeStats", JSON.stringify({
      minutes: lifetimeMinutes,
      coins: lifetimeCoins,
    }));
  } catch (_) {}
}

function updateLifetimeStats() {
  el.lifetimeText.textContent = `总共专注：${lifetimeMinutes}分钟 | 🪙 ${lifetimeCoins}`;
}

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
  lifetimeText: document.getElementById("lifetimeText"),
  // 设置面板
  btnSettings:  document.getElementById("btnSettings"),
  settingsPanel: document.getElementById("settingsPanel"),
  inputFocus:   document.getElementById("inputFocus"),
  inputShortBreak: document.getElementById("inputShortBreak"),
  inputLongBreak: document.getElementById("inputLongBreak"),
  // 主题商城
  btnStore:     document.getElementById("btnStore"),
  storePanel:   document.getElementById("storePanel"),
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

  // 渐变主题：专注阶段用渐变，休息阶段用纯色（与经典番茄一致）
  if (THEME_GRADIENTS[currentTheme]) {
    if (state.phase === "focus") {
      el.progressRing.setAttribute("stroke", "url(#ringGrad)");
    } else if (state.phase === "shortBreak") {
      el.progressRing.setAttribute("stroke", "#27ae60");
    } else if (state.phase === "longBreak") {
      el.progressRing.setAttribute("stroke", "#3498db");
    }
  }
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
// skipped: true 表示跳过（不累加统计），false/undefined 表示正常计时结束
function getNextPhase(skipped) {
  if (state.phase === "focus") {
    state.pomodoroCount++;
    // 只有正常计时结束（非跳过）才累加分钟数和金币数
    if (!skipped) {
      lifetimeMinutes += CONFIG.focus;
      lifetimeCoins += CONFIG.focus; // 1分钟 = 1金币
      saveLifetimeStats();
      updateLifetimeStats();
    }
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
  updateSkipButtonState();

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
      const next = getNextPhase(false); // 正常结束，累加统计
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

// --- 每日跳过次数管理 ---
const SKIP_LIMIT_KEY = "dailySkipLimit";
const MAX_SKIPS_PER_DAY = 3;

function getTodayKey() {
  const d = new Date();
  // 本地日期字符串 YYYY-MM-DD，基于本地时区，凌晨0点自动切换
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function loadSkipLimit() {
  try {
    const saved = localStorage.getItem(SKIP_LIMIT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 如果日期是今天，返回剩余次数；否则重置为最大值
      if (parsed.date === getTodayKey()) {
        return parsed.remaining;
      }
    }
  } catch (_) { /* ignore */ }
  return MAX_SKIPS_PER_DAY;
}

function saveSkipLimit(remaining) {
  try {
    localStorage.setItem(SKIP_LIMIT_KEY, JSON.stringify({
      date: getTodayKey(),
      remaining: remaining,
    }));
  } catch (_) { /* ignore */ }
}

let dailySkipRemaining = loadSkipLimit();

function updateSkipButtonState() {
  if (state.phase === "focus" && dailySkipRemaining <= 0) {
    el.btnSkip.disabled = true;
    el.btnSkip.title = "今日跳过次数已用完（凌晨0点刷新）";
  } else if (state.phase === "focus") {
    el.btnSkip.disabled = false;
    el.btnSkip.title = `跳过（今日剩余 ${dailySkipRemaining} 次）`;
  } else {
    // 休息阶段无限跳过
    el.btnSkip.disabled = false;
    el.btnSkip.title = "跳过";
  }
}

// --- 跳过当前阶段 ---
function skipPhase() {
  // 专注阶段检查每日跳过次数
  if (state.phase === "focus") {
    // 每天凌晨自动刷新（loadSkipLimit 已处理日期变更）
    const fresh = loadSkipLimit();
    if (fresh !== dailySkipRemaining) {
      dailySkipRemaining = fresh;
    }
    if (dailySkipRemaining <= 0) {
      return; // 无跳过次数，不执行
    }
    dailySkipRemaining--;
    saveSkipLimit(dailySkipRemaining);
  }

  clearInterval(state.timerId);
  state.timerId = null;
  const next = getNextPhase(true); // 跳过，不累加统计
  switchPhase(next);
  updateSkipButtonState();
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
  updateSkipButtonState();
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
updateLifetimeStats();
setPlayIcon(false);
updateSkipButtonState();
buildThemeCards();
updateRingGradient(currentTheme); // 启动时同步渐变环

// ====== 主题商城面板逻辑 ======
el.btnStore.addEventListener("click", () => {
  // 如果设置面板打开，先关闭
  if (!el.settingsPanel.classList.contains("hidden")) {
    el.settingsPanel.classList.add("hidden");
  }
  const opening = el.storePanel.classList.contains("hidden");
  el.storePanel.classList.toggle("hidden");
  // 打开时重置到当前主题所在页
  if (opening) {
    const idx = THEMES.findIndex(t => t.id === currentTheme);
    themePage = Math.floor(idx / CARDS_PER_PAGE);
    buildThemeCards();
  }
});

// 创建翻页按钮并添加到 storePanel 底部
(function initPager() {
  const pager = document.createElement("div");
  pager.className = "theme-pager";
  pager.id = "themePager";
  pager.innerHTML = `
    <button class="btn-pager" id="btnPagePrev" title="上一页">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </button>
    <span class="pager-info" id="pagerInfo">1/2</span>
    <button class="btn-pager" id="btnPageNext" title="下一页">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  `;
  el.storePanel.appendChild(pager);

  document.getElementById("btnPagePrev").addEventListener("click", () => {
    if (themePage > 0) goThemePage(-1);
  });
  document.getElementById("btnPageNext").addEventListener("click", () => {
    const totalPages = Math.ceil(THEMES.length / CARDS_PER_PAGE);
    if (themePage < totalPages - 1) goThemePage(1);
  });
})();

function updatePagerButtons(totalPages) {
  const prevBtn = document.getElementById("btnPagePrev");
  const nextBtn = document.getElementById("btnPageNext");
  const info = document.getElementById("pagerInfo");
  if (!prevBtn || !nextBtn || !info) return;

  prevBtn.disabled = themePage === 0;
  nextBtn.disabled = themePage >= totalPages - 1;
  info.textContent = `${themePage + 1}/${totalPages}`;
}

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
  // 如果商城面板打开，先关闭
  if (!el.storePanel.classList.contains("hidden")) {
    el.storePanel.classList.add("hidden");
  }
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