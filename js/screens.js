/**
 * screens.js — Screen transition engine. Simple fade in/out.
 */

var currentScreenId = "screen-home";
var screenInitFns = {};
var transitionLocked = false;

function registerInit(screenId, fn) {
  screenInitFns[screenId] = fn;
}

function showScreen(screenId, direction) {
  if (transitionLocked) return;
  if (screenId === currentScreenId) return;

  var current = document.getElementById(currentScreenId);
  var next = document.getElementById(screenId);
  if (!next) return;

  transitionLocked = true;

  // Fade out current
  if (current) {
    current.classList.remove("active");
  }

  // Fade in next
  next.classList.add("active");

  // Toggle top-right icon buttons
  var gear = document.getElementById("settings-gear");
  var bedtimeBtn = document.getElementById("bedtime-history-btn");
  var hideIconsOn = ["screen-settings", "screen-complete", "screen-bedtime-history"];
  var show = !hideIconsOn.includes(screenId);
  if (gear) gear.style.display = show ? "flex" : "none";
  if (bedtimeBtn) bedtimeBtn.style.display = show ? "flex" : "none";

  // Night overlay for sounds screen
  var overlay = document.getElementById("night-overlay");
  if (overlay) {
    overlay.style.opacity = screenId === "screen-posture" ? "0.25" : "";
  }

  currentScreenId = screenId;

  setTimeout(function() {
    transitionLocked = false;
    var initFn = screenInitFns[screenId];
    if (initFn) initFn();
  }, 330);
}

function showSettings() {
  showScreen("screen-settings");
}

function resetDailyState() {
  updateState(function(s) {
    s.routine = {
      startDate: null,
      completedDate: null,
      currentStep: 0,
      stepRecords: [],
      tomorrowChecklist: {},
    };
    return s;
  });
}
