/**
 * routine.js — Step-by-step evening routine (10 steps).
 * Handles: routine progression, step 8 checklist,
 * card animations, timestamps, and completion summary.
 */

/* ===== ROUTINE SCREEN ===== */
registerInit("screen-routine", function() {
  var state = loadState();
  var today = getTodayISO();

  // Initialize routine if starting fresh
  if (!state.routine.startDate || state.routine.startDate !== today) {
    updateState(function(s) {
      s.routine.startDate = today;
      s.routine.currentStep = 0;
      s.routine.stepRecords = [];
      return s;
    });
    state = loadState();
  }

  // If all steps done, go to summary
  var steps = getActiveSteps();
  if (state.routine.currentStep >= steps.length) {
    showRoutineSummary();
    return;
  }

  renderRoutineStep();
  wireRoutineButtons();
});

function renderRoutineStep() {
  var state = loadState();
  var steps = getActiveSteps();
  var stepIdx = state.routine.currentStep;

  if (stepIdx >= steps.length) {
    showRoutineSummary();
    return;
  }

  var stepData = steps[stepIdx];

  // Step label
  document.getElementById("routine-step-label").textContent = stepData.label;

  // Progress dots
  renderProgressDots(steps, stepIdx, state.routine.stepRecords);

  // Step counter
  document.getElementById("routine-step-counter").textContent =
    (stepIdx + 1) + " / " + steps.length;

  // Step 8 checklist (tomorrow prep)
  var checklistEl = document.getElementById("step-checklist");
  var tomorrowNoteEl = document.getElementById("tomorrow-note-display");

  if (stepData.id === "tomorrow-prep") {
    renderTomorrowChecklist();
    checklistEl.classList.add("open");
    if (state.tomorrowNote) {
      tomorrowNoteEl.textContent = "备忘：" + state.tomorrowNote;
      tomorrowNoteEl.classList.remove("hidden");
    } else {
      tomorrowNoteEl.classList.add("hidden");
    }
  } else {
    checklistEl.classList.remove("open");
    tomorrowNoteEl.classList.add("hidden");
  }
}

function renderProgressDots(steps, currentIdx, records) {
  var container = document.getElementById("routine-progress-dots");
  container.innerHTML = "";

  steps.forEach(function(step, i) {
    var dot = document.createElement("span");
    dot.className = "progress-dot";

    var rec = records[i];
    if (i < currentIdx && rec) {
      if (rec.done) {
        dot.classList.add("done");
      } else if (rec.skipped) {
        dot.classList.add("skipped");
      }
    } else if (i === currentIdx) {
      dot.classList.add("current");
    }

    dot.title = step.label;
    container.appendChild(dot);
  });
}

function renderTomorrowChecklist() {
  var container = document.getElementById("step-checklist");
  var state = loadState();
  var items = getTomorrowChecklistItems();
  var checklist = state.routine.tomorrowChecklist || {};

  container.innerHTML = "";

  items.forEach(function(item) {
    var isDone = checklist[item.id] || false;
    var div = document.createElement("div");
    div.className = "checklist-item" + (isDone ? " done" : "");
    div.innerHTML =
      '<span class="checkbox">' + (isDone ? "✓" : "") + "</span>" +
      "<span>" + item.label + "</span>";
    div.addEventListener("click", function() {
      toggleTomorrowItem(item.id);
    });
    container.appendChild(div);
  });
}

function toggleTomorrowItem(itemId) {
  updateState(function(s) {
    if (!s.routine.tomorrowChecklist) s.routine.tomorrowChecklist = {};
    s.routine.tomorrowChecklist[itemId] = !s.routine.tomorrowChecklist[itemId];
    return s;
  });
  renderTomorrowChecklist();
}

function wireRoutineButtons() {
  var doneBtn = document.getElementById("btn-routine-done");
  var skipBtn = document.getElementById("btn-routine-skip");

  // Remove old listeners by cloning
  var newDone = doneBtn.cloneNode(true);
  doneBtn.parentNode.replaceChild(newDone, doneBtn);
  var newSkip = skipBtn.cloneNode(true);
  skipBtn.parentNode.replaceChild(newSkip, skipBtn);

  newDone.addEventListener("click", function() {
    recordStepAndAdvance(true);
  });

  newSkip.addEventListener("click", function() {
    recordStepAndAdvance(false);
  });
}

function recordStepAndAdvance(done) {
  updateState(function(s) {
    var idx = s.routine.currentStep;
    var steps = getActiveSteps();
    if (idx >= steps.length) return s;

    while (s.routine.stepRecords.length <= idx) {
      s.routine.stepRecords.push(null);
    }
    s.routine.stepRecords[idx] = {
      done: done,
      skipped: !done,
      time: getTimeNow(),
      label: steps[idx].label,
    };
    s.routine.currentStep = idx + 1;
    return s;
  });

  // Animate card
  var card = document.getElementById("routine-card");
  card.classList.add("card-exiting");

  setTimeout(function() {
    card.classList.remove("card-exiting");
    card.classList.add("card-entering");

    var state = loadState();
    var steps = getActiveSteps();

    if (state.routine.currentStep >= steps.length) {
      showRoutineSummary();
    } else {
      renderRoutineStep();
      wireRoutineButtons();
    }

    setTimeout(function() {
      card.classList.remove("card-entering");
    }, 350);
  }, 300);
}

/* ===== ROUTINE SUMMARY ===== */
function showRoutineSummary() {
  // Mark routine as completed
  updateState(function(s) {
    s.routine.completedDate = s.routine.startDate || getTodayISO();
    return s;
  });

  showScreen("screen-routine-summary", "forward");
}

registerInit("screen-routine-summary", function() {
  var state = loadState();
  var container = document.getElementById("routine-summary-list");
  var records = state.routine.stepRecords;
  var steps = getActiveSteps();
  container.innerHTML = "";

  steps.forEach(function(step, i) {
    var rec = records[i];
    var item = document.createElement("div");
    item.className = "summary-item";
    item.style.animationDelay = (i * 80) + "ms";

    if (rec && rec.done) {
      item.classList.add("done");
      item.innerHTML =
        "<span>" + (i + 1) + ". " + step.label + "</span>" +
        "<span class='summary-time'>" + (rec.time || "") + "</span>";
    } else {
      item.classList.add("skipped");
      item.innerHTML =
        "<span>" + (i + 1) + ". " + step.label + "</span>" +
        "<span class='summary-time'>" + (rec ? rec.time : "跳过") + "</span>";
    }

    container.appendChild(item);
  });

  // Continue to worry drop
  document.getElementById("btn-summary-next").onclick = function() {
    showScreen("screen-worry-drop", "forward");
  };
});
