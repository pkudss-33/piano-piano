/**
 * settings.js — Customize evening routine steps.
 */

registerInit("screen-settings", function() {
  renderStepList();
  renderChecklist();
  wireSettingsButtons();
  wireChecklistButtons();

  // Sleep posture input
  var postureInput = document.getElementById("settings-posture-input");
  if (postureInput) {
    postureInput.value = loadState().sleepPosture || "戴眼罩";
    if (!postureInput._wired) {
      postureInput._wired = true;
      postureInput.addEventListener("input", function() {
        var val = this.value.trim();
        if (val) {
          updateState(function(s) { s.sleepPosture = val; return s; });
        }
      });
    }
  }
});

function renderStepList() {
  var state = loadState();
  var steps = getActiveSteps();
  var list = document.getElementById("step-edit-list");

  list.innerHTML = "";

  steps.forEach(function(step, i) {
    var item = document.createElement("div");
    item.className = "step-edit-item";
    item.draggable = true;
    item.dataset.index = i;

    item.innerHTML =
      '<span class="drag-handle">≡</span>' +
      '<span class="step-label">' + (i + 1) + ". " + step.label + "</span>" +
      '<span class="step-actions">' +
      '<button class="edit-step" data-idx="' + i + '">✎</button>' +
      '<button class="delete-step" data-idx="' + i + '">×</button>' +
      "</span>";

    list.appendChild(item);
  });

  // Wire edit/delete buttons
  list.querySelectorAll(".edit-step").forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.stopPropagation();
      editStep(parseInt(this.dataset.idx));
    });
  });

  list.querySelectorAll(".delete-step").forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.stopPropagation();
      deleteStep(parseInt(this.dataset.idx));
    });
  });

  // Drag and drop
  wireDragDrop();
}

function wireDragDrop() {
  var items = document.querySelectorAll(".step-edit-item");
  var list = document.getElementById("step-edit-list");

  items.forEach(function(item) {
    item.addEventListener("dragstart", function(e) {
      e.dataTransfer.setData("text/plain", this.dataset.index);
      this.style.opacity = "0.5";
    });

    item.addEventListener("dragend", function() {
      this.style.opacity = "1";
    });

    item.addEventListener("dragover", function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      this.style.borderTop = "2px solid var(--color-accent)";
    });

    item.addEventListener("dragleave", function() {
      this.style.borderTop = "";
    });

    item.addEventListener("drop", function(e) {
      e.preventDefault();
      this.style.borderTop = "";
      var fromIdx = parseInt(e.dataTransfer.getData("text/plain"));
      var toIdx = parseInt(this.dataset.index);
      if (fromIdx !== toIdx) {
        moveStep(fromIdx, toIdx);
      }
    });
  });
}

function moveStep(fromIdx, toIdx) {
  updateState(function(s) {
    var steps = s.customSteps ? [...s.customSteps] : [...DEFAULT_STEPS];
    var item = steps.splice(fromIdx, 1)[0];
    steps.splice(toIdx, 0, item);
    s.customSteps = steps;
    return s;
  });
  renderStepList();
}

function editStep(index) {
  var state = loadState();
  var steps = getActiveSteps();
  var currentLabel = steps[index].label;
  var newLabel = prompt("编辑步骤名称：", currentLabel);

  if (newLabel && newLabel.trim() && newLabel.trim() !== currentLabel) {
    updateState(function(s) {
      if (!s.customSteps) s.customSteps = JSON.parse(JSON.stringify(DEFAULT_STEPS));
      s.customSteps[index].label = newLabel.trim();
      return s;
    });
    renderStepList();
  }
}

function deleteStep(index) {
  var state = loadState();
  var steps = getActiveSteps();
  if (steps.length <= 1) {
    showToast("至少保留一个步骤");
    return;
  }

  updateState(function(s) {
    if (!s.customSteps) s.customSteps = JSON.parse(JSON.stringify(DEFAULT_STEPS));
    s.customSteps.splice(index, 1);
    return s;
  });
  renderStepList();
}

function addStep() {
  var label = prompt("新步骤名称：");
  if (label && label.trim()) {
    updateState(function(s) {
      if (!s.customSteps) s.customSteps = JSON.parse(JSON.stringify(DEFAULT_STEPS));
      s.customSteps.push({ id: "custom-" + Date.now(), label: label.trim() });
      return s;
    });
    renderStepList();
  }
}

function restoreDefaults() {
  if (confirm("恢复为默认的 10 个步骤？")) {
    updateState(function(s) {
      s.customSteps = null;
      s.customTomorrowChecklist = null;
      return s;
    });
    renderStepList();
    renderChecklist();
    showToast("已恢复默认步骤");
  }
}

/* ===== Tomorrow checklist editing ===== */
function renderChecklist() {
  var items = getTomorrowChecklistItems();
  // Filter out the custom-note (tomorrowNote) item since it's auto-managed
  items = items.filter(function(item) { return item.id !== "custom-note"; });
  var list = document.getElementById("checklist-edit-list");
  if (!list) return;
  list.innerHTML = "";

  items.forEach(function(item, i) {
    var div = document.createElement("div");
    div.className = "step-edit-item";
    div.draggable = true;
    div.dataset.index = i;
    div.innerHTML =
      '<span class="drag-handle">≡</span>' +
      '<span class="step-label">' + (i + 1) + ". " + item.label + "</span>" +
      '<span class="step-actions">' +
      '<button class="edit-checklist" data-idx="' + i + '">✎</button>' +
      '<button class="delete-checklist" data-idx="' + i + '">×</button>' +
      "</span>";
    list.appendChild(div);
  });

  // Wire edit/delete buttons
  list.querySelectorAll(".edit-checklist").forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.stopPropagation();
      editChecklistItem(parseInt(this.dataset.idx));
    });
  });
  list.querySelectorAll(".delete-checklist").forEach(function(btn) {
    btn.addEventListener("click", function(e) {
      e.stopPropagation();
      deleteChecklistItem(parseInt(this.dataset.idx));
    });
  });

  // Drag and drop
  wireChecklistDragDrop();
}

function wireChecklistDragDrop() {
  var items = document.querySelectorAll("#checklist-edit-list .step-edit-item");
  var list = document.getElementById("checklist-edit-list");
  if (!list) return;

  items.forEach(function(item) {
    item.addEventListener("dragstart", function(e) {
      e.dataTransfer.setData("text/checklist-index", this.dataset.index);
      this.style.opacity = "0.5";
    });
    item.addEventListener("dragend", function() { this.style.opacity = "1"; });
    item.addEventListener("dragover", function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      this.style.borderTop = "2px solid var(--color-accent)";
    });
    item.addEventListener("dragleave", function() { this.style.borderTop = ""; });
    item.addEventListener("drop", function(e) {
      e.preventDefault();
      this.style.borderTop = "";
      var fromIdx = parseInt(e.dataTransfer.getData("text/checklist-index"));
      var toIdx = parseInt(this.dataset.index);
      if (fromIdx !== toIdx) moveChecklistItem(fromIdx, toIdx);
    });
  });
}

function getCustomChecklist() {
  var state = loadState();
  if (state.customTomorrowChecklist) return state.customTomorrowChecklist;
  return JSON.parse(JSON.stringify(DEFAULT_TOMORROW_CHECKLIST));
}

function moveChecklistItem(fromIdx, toIdx) {
  updateState(function(s) {
    var items = getCustomChecklist();
    var moved = items.splice(fromIdx, 1)[0];
    items.splice(toIdx, 0, moved);
    s.customTomorrowChecklist = items;
    return s;
  });
  renderChecklist();
}

function editChecklistItem(index) {
  var items = getCustomChecklist();
  var currentLabel = items[index].label;
  var newLabel = prompt("编辑清单项名称：", currentLabel);
  if (newLabel && newLabel.trim() && newLabel.trim() !== currentLabel) {
    updateState(function(s) {
      var list = getCustomChecklist();
      list[index].label = newLabel.trim();
      s.customTomorrowChecklist = list;
      return s;
    });
    renderChecklist();
  }
}

function deleteChecklistItem(index) {
  updateState(function(s) {
    var list = getCustomChecklist();
    if (list.length <= 1) {
      showToast("至少保留一项");
      return s;
    }
    list.splice(index, 1);
    s.customTomorrowChecklist = list;
    return s;
  });
  renderChecklist();
}

function addChecklistItem() {
  var label = prompt("新清单项名称：");
  if (label && label.trim()) {
    updateState(function(s) {
      var list = getCustomChecklist();
      list.push({ id: "cl-" + Date.now(), label: label.trim() });
      s.customTomorrowChecklist = list;
      return s;
    });
    renderChecklist();
  }
}

function wireChecklistButtons() {
  var addBtn = document.getElementById("btn-add-checklist");
  if (!addBtn || addBtn._wired) return;
  addBtn._wired = true;
  var newAdd = addBtn.cloneNode(true);
  addBtn.parentNode.replaceChild(newAdd, addBtn);
  newAdd.addEventListener("click", addChecklistItem);
}

function wireSettingsButtons() {
  // Add step
  var addBtn = document.getElementById("btn-add-step");
  var newAdd = addBtn.cloneNode(true);
  addBtn.parentNode.replaceChild(newAdd, addBtn);
  newAdd.addEventListener("click", addStep);

  // Restore defaults
  var restoreBtn = document.getElementById("btn-restore-defaults");
  var newRestore = restoreBtn.cloneNode(true);
  restoreBtn.parentNode.replaceChild(newRestore, restoreBtn);
  newRestore.addEventListener("click", restoreDefaults);

  // Close settings
  var closeBtn = document.getElementById("btn-settings-close");
  var newClose = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newClose, closeBtn);
  newClose.addEventListener("click", function() {
    // Save posture before closing
    var postureInput = document.getElementById("settings-posture-input");
    if (postureInput) {
      var val = postureInput.value.trim();
      if (val) {
        updateState(function(s) { s.sleepPosture = val; return s; });
      }
    }
    // Return to posture or checklist screen if coming from there, otherwise go home
    var returnTo = window._postureReturnScreen || window._checklistReturnScreen;
    window._postureReturnScreen = null;
    window._checklistReturnScreen = null;
    showScreen(returnTo || "screen-home", "backward");
  });
}
