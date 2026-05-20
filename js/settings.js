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
function getChecklistItemsForEdit() {
  var state = loadState();
  if (state.customTomorrowChecklist) {
    return JSON.parse(JSON.stringify(state.customTomorrowChecklist));
  }
  return JSON.parse(JSON.stringify(DEFAULT_TOMORROW_CHECKLIST));
}

function saveChecklist(items) {
  updateState(function(s) {
    s.customTomorrowChecklist = items;
    return s;
  });
}

function renderChecklist() {
  var items = getChecklistItemsForEdit();
  var list = document.getElementById("checklist-edit-list");
  if (!list) return;
  list.innerHTML = "";

  items.forEach(function(item, i) {
    var div = document.createElement("div");
    div.className = "checklist-edit-item";
    div.innerHTML =
      '<span class="checklist-index">' + (i + 1) + '.</span>' +
      '<input type="text" class="checklist-input text-input" value="' +
      escapeHtml(item.label) + '" maxlength="20" data-idx="' + i + '">' +
      '<button class="checklist-delete-btn" data-idx="' + i + '" title="删除">×</button>';
    list.appendChild(div);
  });

  // Wire input changes
  list.querySelectorAll(".checklist-input").forEach(function(input) {
    input.addEventListener("input", function() {
      var idx = parseInt(this.dataset.idx);
      var val = this.value.trim();
      if (val) {
        var items = getChecklistItemsForEdit();
        items[idx].label = val;
        saveChecklist(items);
      }
    });
    // Prevent blur from removing empty input before user can fix it
    input.addEventListener("blur", function() {
      if (!this.value.trim()) {
        this.value = getChecklistItemsForEdit()[parseInt(this.dataset.idx)].label;
      }
    });
  });

  // Wire delete buttons
  list.querySelectorAll(".checklist-delete-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var idx = parseInt(this.dataset.idx);
      var items = getChecklistItemsForEdit();
      if (items.length <= 1) {
        showToast("至少保留一项");
        return;
      }
      items.splice(idx, 1);
      saveChecklist(items);
      renderChecklist();
    });
  });
}

function addChecklistItem() {
  var items = getChecklistItemsForEdit();
  items.push({ id: "cl-" + Date.now(), label: "" });
  saveChecklist(items);
  renderChecklist();
  // Focus the new empty input
  var inputs = document.querySelectorAll("#checklist-edit-list .checklist-input");
  var last = inputs[inputs.length - 1];
  if (last) { last.focus(); last.value = ""; }
}

function escapeHtml(str) {
  var div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
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
