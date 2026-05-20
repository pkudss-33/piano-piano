/**
 * settings.js — Customize evening routine steps.
 */

registerInit("screen-settings", function() {
  renderStepList();
  wireSettingsButtons();

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
      return s;
    });
    renderStepList();
    showToast("已恢复默认步骤");
  }
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
    // Return to posture screen if coming from there, otherwise go home
    var returnTo = window._postureReturnScreen;
    window._postureReturnScreen = null;
    showScreen(returnTo || "screen-home", "backward");
  });
}
