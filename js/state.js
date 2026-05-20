/**
 * state.js — Single source of truth for app state.
 * All localStorage reads/writes go through this file.
 */

const STORAGE_KEY = "windDownApp";

/* ===== Default steps ===== */
const DEFAULT_STEPS = [
  { id: "change-clothes", label: "换家居服" },
  { id: "wash-hands",     label: "洗手" },
  { id: "wash-up",        label: "洗漱或洗澡" },
  { id: "skincare",       label: "护肤" },
  { id: "reply-msgs",      label: "回复消息，和谁聊聊" },
  { id: "supplements",    label: "补剂" },
  { id: "brush-teeth",    label: "刷牙" },
  { id: "tomorrow-prep",  label: "准备明天早晨" },
  { id: "dim-lights",     label: "调暗灯光" },
  { id: "set-alarm",      label: "设明天闹钟" },
];

/* ===== Default checklist for step 8 (tomorrow-prep) ===== */
const DEFAULT_TOMORROW_CHECKLIST = [
  { id: "outfit",   label: "选明天的衣服" },
  { id: "pack-bag", label: "收拾包包" },
  { id: "charge",   label: "给设备充电" },
];

/* ===== Default state ===== */
function createDefaultState() {
  return {
    prepText: "",
    prepDate: null,
    prepUpdatedAt: null,
    tomorrowNote: "",

    customSteps: null,          // null = use defaults
    customTomorrowChecklist: null, // null = use DEFAULT_TOMORROW_CHECKLIST

    routine: {
      startDate: null,
      completedDate: null,
      currentStep: 0,
      stepRecords: [],          // [{done, skipped, time}] — one per step
      tomorrowChecklist: {},    // { "outfit": true, ... }
    },

    worryDrops: [],             // [{text, date}]
    bedTimes: [],               // [{date, time}]

    sleepPosture: "戴眼罩",

    sounds: {
      lastPlayed: null,
      volume: 0.5,
      duration: 30,             // minutes
    },

    streaks: {
      currentStreak: 0,
      longestStreak: 0,
      completedDates: [],
    },

    firstVisitDate: null,
  };
}

/* ===== Helpers ===== */
function getTodayISO() {
  const d = new Date();
  return d.getFullYear() + "-"
    + String(d.getMonth() + 1).padStart(2, "0") + "-"
    + String(d.getDate()).padStart(2, "0");
}

function getTimeNow() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":"
    + String(d.getMinutes()).padStart(2, "0");
}

function getHourNow() {
  return new Date().getHours();
}

function getYesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.getFullYear() + "-"
    + String(d.getMonth() + 1).padStart(2, "0") + "-"
    + String(d.getDate()).padStart(2, "0");
}

function getPreviousDay(isoDate) {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return d.getFullYear() + "-"
    + String(d.getMonth() + 1).padStart(2, "0") + "-"
    + String(d.getDate()).padStart(2, "0");
}

/* ===== State load / save ===== */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    return validateState(parsed);
  } catch (e) {
    return createDefaultState();
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // localStorage full or unavailable
  }
}

function updateState(fn) {
  const state = loadState();
  const updated = fn(state);
  saveState(updated);
  return updated;
}

function validateState(state) {
  const defaults = createDefaultState();

  // Migrate old customSteps label
  if (Array.isArray(state.customSteps)) {
    state.customSteps = state.customSteps.map(function(s) {
      if (s.label === "准备明天穿戴") s.label = "准备明天早晨";
      return s;
    });
  }

  // Ensure nested objects exist
  if (!state.routine) state.routine = defaults.routine;
  if (!state.streaks) state.streaks = defaults.streaks;
  if (!state.sounds) state.sounds = defaults.sounds;
  if (!Array.isArray(state.worryDrops)) state.worryDrops = [];
  if (!Array.isArray(state.bedTimes)) state.bedTimes = [];
  if (typeof state.prepText !== "string") state.prepText = "";
  if (typeof state.prepDate !== "string") state.prepDate = null;
  if (typeof state.tomorrowNote !== "string") state.tomorrowNote = "";
  if (typeof state.sleepPosture !== "string" || !state.sleepPosture) state.sleepPosture = "戴眼罩";
  if (typeof state.sounds.volume !== "number") state.sounds.volume = 0.5;
  if (typeof state.sounds.duration !== "number") state.sounds.duration = 30;
  if (!state.routine.tomorrowChecklist) state.routine.tomorrowChecklist = {};
  if (state.customTomorrowChecklist !== null && !Array.isArray(state.customTomorrowChecklist)) state.customTomorrowChecklist = null;
  return state;
}

/* ===== Step helpers ===== */
function getActiveSteps() {
  const state = loadState();
  return state.customSteps || DEFAULT_STEPS;
}

function getTomorrowChecklistItems() {
  const state = loadState();
  const items = state.customTomorrowChecklist
    ? JSON.parse(JSON.stringify(state.customTomorrowChecklist))
    : JSON.parse(JSON.stringify(DEFAULT_TOMORROW_CHECKLIST));
  if (state.tomorrowNote) {
    items.push({ id: "custom-note", label: state.tomorrowNote });
  }
  return items;
}

/* ===== Streak computation ===== */
function getStreakCount(state) {
  const dates = state.streaks.completedDates;
  if (!dates.length) return 0;

  let count = 0;
  let check = getYesterdayISO();

  // If today is completed, start counting from today
  if (dates.includes(getTodayISO())) {
    count = 1;
    check = getYesterdayISO();
  }

  // Walk backward through consecutive dates
  const dateSet = new Set(dates);
  while (dateSet.has(check)) {
    count++;
    check = getPreviousDay(check);
  }

  return count;
}

function isTodayCompleted() {
  const state = loadState();
  return state.streaks.completedDates.includes(getTodayISO());
}

function isRoutineInProgress() {
  const state = loadState();
  const today = getTodayISO();
  return state.routine.currentStep > 0
    && state.routine.startDate === today
    && state.routine.completedDate !== today;
}

/* ===== Time helpers ===== */
function isAfter10PM() {
  return getHourNow() >= 22;
}

/* ===== Prep helpers ===== */
function isPrepDoneToday() {
  const state = loadState();
  return state.prepDate === getTodayISO();
}
