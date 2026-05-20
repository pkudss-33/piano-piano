/**
 * sounds.js — Sleep posture screen + Complete screen initialization.
 */

/* ===== SLEEP POSTURE SCREEN ===== */
registerInit("screen-posture", function() {
  var state = loadState();
  document.getElementById("posture-text").textContent = state.sleepPosture || "戴眼罩";

  // Gear button opens settings, then returns to this page
  document.getElementById("btn-posture-settings").onclick = function() {
    // Remember where to return to
    window._postureReturnScreen = "screen-posture";
    showScreen("screen-settings");
  };

  // Go to bed — record bedtime
  document.getElementById("btn-go-to-bed").onclick = function() {
    updateState(function(s) {
      s.bedTimes.push({ date: getTodayISO(), time: getTimeNow() });
      return s;
    });
    showScreen("screen-complete", "forward");
  };
});

/* ===== COMPLETE SCREEN ===== */
registerInit("screen-complete", function() {
  var state = loadState();
  var today = getTodayISO();

  // Show today's date: month above, day below
  var d = new Date();
  document.getElementById("complete-date-month").textContent = (d.getMonth() + 1) + "月";
  document.getElementById("complete-date-day").textContent = d.getDate() + "日";

  // Record completion
  if (!state.streaks.completedDates.includes(today)) {
    updateState(function(s) {
      s.streaks.completedDates.push(today);
      var streak = getStreakCount(s);
      s.streaks.currentStreak = streak;
      if (streak > s.streaks.longestStreak) {
        s.streaks.longestStreak = streak;
      }
      s.routine.completedDate = s.routine.startDate || today;
      return s;
    });
    state = loadState();
  }

  // Display streak
  var streak = getStreakCount(state);
  var streakEl = document.getElementById("complete-streak");
  if (streak > 0) {
    streakEl.innerHTML = '<span class="blue-moon"></span> ' + streak + ' 个平静夜晚';
  } else {
    streakEl.innerHTML = '<span class="blue-moon"></span> 第一个平静夜晚';
  }

  // Piano Piano text (replaces prep text)
  document.getElementById("complete-piano").textContent = "Piano Piano";

  // Share
  document.getElementById("btn-share").onclick = function() {
    var text = "完成了今晚的 piano piano" +
      (streak > 0 ? "（" + streak + " 个平静夜晚）" : "");
    if (navigator.share) {
      navigator.share({ title: "Piano Piano", text: text }).catch(function() {});
    } else {
      navigator.clipboard.writeText(text).then(function() {
        showToast("已复制到剪贴板");
      }).catch(function() {
        showToast("分享： " + text, 3000);
      });
    }
  };

  // Goodnight — go home
  document.getElementById("btn-goodnight").onclick = function() {
    resetDailyState();
    renderHome();
    showScreen("screen-home", "forward");
  };
});
