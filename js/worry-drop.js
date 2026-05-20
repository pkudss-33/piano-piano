/**
 * worry-drop.js — "装不下的心事，先丢一下"
 */

registerInit("screen-worry-drop", function() {
  var input = document.getElementById("worry-input");
  var dropBtn = document.getElementById("btn-drop-worry");
  var historyDiv = document.getElementById("worry-history");
  var historyPrompt = document.getElementById("worry-history-prompt");
  var viewBtn = document.getElementById("btn-view-worries");

  input.value = "";
  dropBtn.disabled = true;
  historyDiv.classList.add("hidden");

  input.oninput = function() {
    dropBtn.disabled = this.value.trim().length === 0;
  };

  // Drop it
  dropBtn.onclick = function() {
    var text = input.value.trim();
    if (!text) return;

    updateState(function(s) {
      s.worryDrops.push({ text: text, date: getTodayISO(), time: getTimeNow() });
      if (s.worryDrops.length > 30) s.worryDrops.shift();
      return s;
    });

    showToast("已放下");
    input.value = "";
    dropBtn.disabled = true;
    historyPrompt.classList.remove("hidden");

    // Auto navigate to sounds after a brief moment
    setTimeout(function() {
      showScreen("screen-posture", "forward");
    }, 800);
  };

  // Skip worry
  document.getElementById("btn-worry-skip").onclick = function() {
    showScreen("screen-posture", "forward");
  };

  // View past worries
  viewBtn.onclick = function() {
    if (!historyDiv.classList.contains("hidden")) {
      historyDiv.classList.add("hidden");
      viewBtn.textContent = "看看之前丢下的";
      return;
    }

    var state = loadState();
    var recent = state.worryDrops.slice(-5).reverse();
    if (recent.length === 0) {
      historyDiv.innerHTML =
        '<p style="color: var(--color-text-muted); font-size: var(--font-size-sm);">还没有丢下过什么</p>';
    } else {
      historyDiv.innerHTML = recent.map(function(w) {
        return (
          '<div class="worry-history-item">' +
          '<div class="worry-date">' + w.date + " " + (w.time || "") + "</div>" +
          w.text +
          "</div>"
        );
      }).join("");
    }
    historyDiv.classList.remove("hidden");
    viewBtn.textContent = "收起";
  };
});
