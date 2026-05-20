/**
 * app.js — Main entry point. Home screen (with inline prep + display toggle),
 * time-of-day colors, global wiring.
 */

document.addEventListener("DOMContentLoaded", function() {
  initApp();
});

function initApp() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(regs) {
      regs.forEach(function(r) { r.unregister(); });
    });
  }

  if (window.location.search.includes("reset")) {
    localStorage.removeItem("windDownApp");
    window.history.replaceState({}, "", window.location.pathname);
  }

  updateState(function(s) {
    if (!s.firstVisitDate) s.firstVisitDate = getTodayISO();
    return s;
  });

  updateTimeColors();
  renderHome();
  wireHomeButtons();

  setInterval(updateTimeColors, 5 * 60 * 1000);

  registerInit("screen-home", function() {
    updateTimeColors();
    renderHome();
  });
}

/* ===== Time-based background colors ===== */
function updateTimeColors() {
  var hour = getHourNow();
  var root = document.documentElement;
  var start, end;

  if (hour < 12) {
    start = "#c4d8e0";
    end   = "#9eb5bf";
  } else if (hour < 19) {
    start = "#d9cdb8";
    end   = "#c4a88c";
  } else {
    start = "#4a4058";
    end   = "#1c1814";
  }

  root.style.setProperty("--bg-gradient-start", start);
  root.style.setProperty("--bg-gradient-end", end);
}

/* ===== Home screen ===== */
function renderHome() {
  var state = loadState();
  var today = getTodayISO();
  var hour = getHourNow();

  // Greeting
  var greetingEl = document.getElementById("home-greeting");
  if (hour < 12) {
    greetingEl.textContent = "上午好";
  } else if (hour < 19) {
    greetingEl.textContent = "下午好";
  } else {
    greetingEl.textContent = "晚上好";
  }

  // Date
  var d = new Date();
  document.getElementById("home-date").textContent =
    d.toLocaleDateString("zh-CN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

  // Streak with blue moon
  var streak = getStreakCount(state);
  var streakEl = document.getElementById("home-streak");
  if (streak > 0) {
    streakEl.innerHTML = '<span class="blue-moon"></span> ' + streak + ' 个平静夜晚';
  } else {
    streakEl.innerHTML = "";
  }

  // Prep display vs edit mode
  var prepSavedToday = state.prepDate === today && state.prepText;
  var displayDiv = document.getElementById("home-prep-display");
  var editDiv = document.getElementById("home-prep");

  if (prepSavedToday) {
    // Show display mode
    editDiv.classList.add("hidden");
    displayDiv.classList.remove("hidden");
    document.getElementById("prep-display-text").textContent = "今晚：" + state.prepText;
    if (state.tomorrowNote) {
      document.getElementById("prep-display-note").textContent = "备忘：" + state.tomorrowNote;
      document.getElementById("prep-display-note").style.display = "";
    } else {
      document.getElementById("prep-display-note").style.display = "none";
    }
  } else {
    // Show edit mode
    displayDiv.classList.add("hidden");
    editDiv.classList.remove("hidden");

    var prepInput = document.getElementById("prep-input");
    var noteInput = document.getElementById("tomorrow-note-input");

    prepInput.value = state.prepText || "";
    noteInput.value = state.tomorrowNote || "";

    // 10pm lock
    updatePrepLock();

    // Wire char counts
    wirePrepCharCounts();
  }

  // Buttons
  var todayCompleted = state.streaks.completedDates.includes(today);
  var inProgress = isRoutineInProgress();
  var startBtn = document.getElementById("btn-start");
  var resumeBtn = document.getElementById("btn-resume");
  var resetBtn = document.getElementById("btn-reset");

  if (todayCompleted) {
    startBtn.textContent = "晚安";
    startBtn.classList.remove("hidden");
    resumeBtn.classList.add("hidden");
    resetBtn.classList.remove("hidden");
  } else if (inProgress) {
    startBtn.textContent = "我回家了";
    startBtn.classList.remove("hidden");
    resumeBtn.classList.remove("hidden");
    resetBtn.classList.add("hidden");
  } else {
    startBtn.textContent = "我回家了";
    startBtn.classList.remove("hidden");
    resumeBtn.classList.add("hidden");
    resetBtn.classList.add("hidden");
  }
}

function updatePrepLock() {
  var prepInput = document.getElementById("prep-input");
  var noteInput = document.getElementById("tomorrow-note-input");
  if (!prepInput || !noteInput) return;
  var locked = isAfter10PM();

  prepInput.disabled = locked;
  noteInput.disabled = locked;

  if (locked) {
    prepInput.style.opacity = "0.4";
    noteInput.style.opacity = "0.4";
  } else {
    prepInput.style.opacity = "";
    noteInput.style.opacity = "";
  }
}

/* ===== Prep char count + auto-save (state only, no display switch) ===== */
var _prepSaveTimer = null;

function savePrepInputsSilent() {
  var prepInput = document.getElementById("prep-input");
  var noteInput = document.getElementById("tomorrow-note-input");
  if (!prepInput || !noteInput) return;

  var today = getTodayISO();
  var prepText = prepInput.value.trim();
  var noteText = noteInput.value.trim();

  updateState(function(s) {
    s.prepText = prepText;
    s.prepDate = prepText ? today : null;
    s.prepUpdatedAt = prepText ? getTimeNow() : null;
    s.tomorrowNote = noteText;
    return s;
  });
}

function commitPrepInputs() {
  savePrepInputsSilent();
  var prepInput = document.getElementById("prep-input");
  var noteInput = document.getElementById("tomorrow-note-input");
  if (!prepInput || !noteInput) return;

  var prepText = prepInput.value.trim();
  var noteText = noteInput.value.trim();

  if (prepText) {
    var displayDiv = document.getElementById("home-prep-display");
    var editDiv = document.getElementById("home-prep");
    displayDiv.classList.remove("hidden");
    editDiv.classList.add("hidden");
    document.getElementById("prep-display-text").textContent = "今晚：" + prepText;
    var noteDisplay = document.getElementById("prep-display-note");
    if (noteText) {
      noteDisplay.textContent = "备忘：" + noteText;
      noteDisplay.style.display = "";
    } else {
      noteDisplay.style.display = "none";
    }
  }
}

function wirePrepCharCounts() {
  var prepInput = document.getElementById("prep-input");
  var noteInput = document.getElementById("tomorrow-note-input");
  var prepCount = document.getElementById("prep-char-count");
  var noteCount = document.getElementById("note-char-count");
  var prepCheck = document.getElementById("prep-check-btn");
  var noteCheck = document.getElementById("note-check-btn");
  if (!prepInput || !noteInput) return;

  if (!prepInput._wired) {
    prepInput.addEventListener("input", function() {
      var len = this.value.length;
      prepCount.textContent = len + "/100";
      if (len > 100) { this.value = this.value.slice(0, 100); prepCount.textContent = "100/100"; }
      clearTimeout(_prepSaveTimer);
      _prepSaveTimer = setTimeout(savePrepInputsSilent, 600);
    });
    prepCheck.onclick = function(e) {
      e.preventDefault();
      clearTimeout(_prepSaveTimer);
      commitPrepInputs();
    };
    prepInput._wired = true;
  }

  if (!noteInput._wired) {
    noteInput.addEventListener("input", function() {
      var len = this.value.length;
      noteCount.textContent = len + "/50";
      if (len > 50) { this.value = this.value.slice(0, 50); noteCount.textContent = "50/50"; }
      clearTimeout(_prepSaveTimer);
      _prepSaveTimer = setTimeout(savePrepInputsSilent, 600);
    });
    noteCheck.onclick = function(e) {
      e.preventDefault();
      clearTimeout(_prepSaveTimer);
      commitPrepInputs();
    };
    noteInput._wired = true;
  }

  prepCount.textContent = prepInput.value.length + "/100";
  noteCount.textContent = noteInput.value.length + "/50";
}

/* ===== Home button wiring ===== */
function wireHomeButtons() {
  var startBtn = document.getElementById("btn-start");

  // Long-press on "晚安" to reset today
  var longPressTimer;
  startBtn.addEventListener("pointerdown", function(e) {
    var state = loadState();
    if (!state.streaks.completedDates.includes(getTodayISO())) return;
    longPressTimer = setTimeout(function() {
      if (confirm("重新开始今晚的晚间程序？")) {
        updateState(function(s) {
          var today = getTodayISO();
          s.streaks.completedDates = s.streaks.completedDates.filter(function(d) { return d !== today; });
          s.routine = { startDate: null, completedDate: null, currentStep: 0, stepRecords: [], tomorrowChecklist: {} };
          return s;
        });
        renderHome();
        showToast("已重置，再来一遍吧");
      }
    }, 2000);
  });
  startBtn.addEventListener("pointerup", function() { clearTimeout(longPressTimer); });
  startBtn.addEventListener("pointerleave", function() { clearTimeout(longPressTimer); });

  startBtn.addEventListener("click", function() {
    var state = loadState();
    var today = getTodayISO();

    if (state.streaks.completedDates.includes(today)) return;

    // Final save and commit before navigating
    clearTimeout(_prepSaveTimer);
    commitPrepInputs();

    showScreen("screen-routine");
  });

  // Resume routine
  document.getElementById("btn-resume").addEventListener("click", function() {
    showScreen("screen-routine");
  });

  // Reset tonight
  document.getElementById("btn-reset").addEventListener("click", function() {
    if (confirm("重新开始今晚的晚间程序？")) {
      updateState(function(s) {
        var today = getTodayISO();
        s.streaks.completedDates = s.streaks.completedDates.filter(function(d) { return d !== today; });
        s.routine = { startDate: null, completedDate: null, currentStep: 0, stepRecords: [], tomorrowChecklist: {} };
        return s;
      });
      renderHome();
      showToast("已重置，再来一遍吧");
    }
  });

  // Settings gear
  document.getElementById("settings-gear").addEventListener("click", function() {
    showScreen("screen-settings");
  });

  // Prep display: click edit icon → switch to edit mode
  document.getElementById("prep-edit-icon").addEventListener("click", function(e) {
    e.stopPropagation();
    var displayDiv = document.getElementById("home-prep-display");
    var editDiv = document.getElementById("home-prep");
    displayDiv.classList.add("hidden");
    editDiv.classList.remove("hidden");

    var state = loadState();
    document.getElementById("prep-input").value = state.prepText || "";
    document.getElementById("tomorrow-note-input").value = state.tomorrowNote || "";
    updatePrepLock();
    wirePrepCharCounts();

    // Focus the first input
    setTimeout(function() { document.getElementById("prep-input").focus(); }, 100);
  });

  // Click the display line itself also enters edit mode
  document.getElementById("prep-display-line").addEventListener("click", function() {
    document.getElementById("prep-edit-icon").click();
  });
}

/* ===== Toast ===== */
function showToast(msg, duration) {
  duration = duration || 2000;
  var toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  toast.classList.add("visible");
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(function() {
    toast.classList.remove("visible");
    toast.classList.add("hidden");
  }, duration);
}
