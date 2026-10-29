// script.js —— DOM 外壳：状态机、计分、倒计时、生成、音效、特效
// 纯逻辑全部委托给 game-core.js（window.GameCore）
(function () {
  'use strict';

  const Core = window.GameCore;

  // ---- 常量 ----
  const GAME_DURATION = 120;   // 单局总时长（秒）
  const BALL_MIN_DIST = 150;   // 与上次位置的最小位移（px）
  const SPAWN_RETRY = 20;      // 生成重试次数
  const WARN_TIME = 30;        // 倒计时告警阈值（秒）
  const STORAGE_KEY = 'catchball.highscore';

  // ---- DOM ----
  const app = document.getElementById('app');
  const stage = document.getElementById('stage');
  const ball = document.getElementById('ball');
  const fxLayer = document.getElementById('fx-layer');
  const scoreEl = document.getElementById('score');
  const timerEl = document.getElementById('timer');
  const startOverlay = document.getElementById('start-overlay');
  const endOverlay = document.getElementById('end-overlay');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const finalScoreEl = document.getElementById('final-score');
  const highScoreEl = document.getElementById('high-score');
  const newRecordEl = document.getElementById('new-record');

  // ---- 状态 ----
  let state = 'IDLE';   // IDLE | PLAYING | ENDED
  let score = 0;
  let timeLeft = GAME_DURATION;
  let tickTimer = null;
  let resizeTimer = null;
  let prevPos = null;
  let audioCtx = null;

  // ---- HUD ----
  function renderScore() {
    scoreEl.textContent = String(score);
  }
  function renderTimer() {
    timerEl.textContent = Core.formatTime(timeLeft);
    timerEl.classList.toggle('warn', Core.isWarnTime(timeLeft, WARN_TIME));
  }

  // ---- 音效（Web Audio 合成，无外部文件）----
  function ensureAudio() {
    if (!audioCtx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = AC ? new AC() : null;
      } catch (e) {
        audioCtx = null;
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }
  function beep(freq, dur, type, gainValue) {
    if (!audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      const g = gainValue == null ? 0.18 : gainValue;
      gain.gain.setValueAtTime(g, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch (e) {
      /* 忽略音频异常，不影响游戏 */
    }
  }
  function playHit() { beep(880, 0.08, 'sine', 0.20); }
  function playMiss() { beep(200, 0.12, 'square', 0.15); }
  function playEnd() {
    beep(660, 0.15, 'sine', 0.18);
    setTimeout(function () { beep(440, 0.25, 'sine', 0.18); }, 160);
  }

  // ---- 小球生成 ----
  function spawnBall() {
    ball.hidden = false;
    const size = ball.offsetWidth || 60;
    const rect = stage.getBoundingClientRect();
    const pos = Core.pickSpawnPosition({
      area: { width: rect.width, height: rect.height },
      ballSize: size,
      prev: prevPos,
      avoidRects: [],
      minDist: BALL_MIN_DIST,
      retry: SPAWN_RETRY
    });
    prevPos = pos;
    ball.style.left = (pos.x - size / 2) + 'px';
    ball.style.top = (pos.y - size / 2) + 'px';
    // 重放入场动画
    ball.classList.remove('pop');
    void ball.offsetWidth;
    ball.classList.add('pop');
  }

  // ---- 命中粒子特效 ----
  function burstAt(clientX, clientY) {
    const rect = stage.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const count = 8;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      fxLayer.appendChild(p);
      const angle = (Math.PI * 2 * i) / count;
      const dist = 26 + Math.random() * 26;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      const anim = p.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(0)', opacity: 0 }
      ], { duration: 450, easing: 'ease-out' });
      anim.onfinish = function () { p.remove(); };
    }
  }

  // ---- 点空红闪 ----
  function flashMiss() {
    app.classList.remove('miss-flash');
    void app.offsetWidth;
    app.classList.add('miss-flash');
    setTimeout(function () { app.classList.remove('miss-flash'); }, 320);
  }

  // ---- 点击处理 ----
  function onPointerDown(e) {
    if (state !== 'PLAYING') return;
    ensureAudio();

    const isHit = (e.target === ball) ||
      (e.target.closest && e.target.closest('#ball') === ball);

    if (isHit) {
      score = Core.nextScore(score, true);
      renderScore();
      playHit();
      burstAt(e.clientX, e.clientY);
      spawnBall();               // 命中后换位重生（点空白不换位）
    } else {
      score = Core.nextScore(score, false);
      renderScore();
      playMiss();
      flashMiss();
    }
  }

  // ---- 倒计时 ----
  function startTimer() {
    stopTimer();
    tickTimer = setInterval(function () {
      timeLeft -= 1;
      renderTimer();
      if (timeLeft <= 0) endGame();
    }, 1000);
  }
  function stopTimer() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  // ---- 最高分存储（localStorage 不可用时降级）----
  function readHighScoreRaw() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v == null ? NaN : parseInt(v, 10);
    } catch (e) {
      return NaN;
    }
  }
  function writeHighScore(v) {
    try {
      localStorage.setItem(STORAGE_KEY, String(v));
    } catch (e) {
      /* 隐私模式等场景忽略 */
    }
  }

  // ---- 开局 / 结束 / 重开 ----
  function startGame() {
    state = 'PLAYING';
    score = 0;
    timeLeft = GAME_DURATION;
    prevPos = null;
    renderScore();
    renderTimer();
    startOverlay.hidden = true;
    endOverlay.hidden = true;
    newRecordEl.hidden = true;
    spawnBall();
    startTimer();
  }

  function endGame() {
    stopTimer();
    state = 'ENDED';
    ball.hidden = true;
    ball.classList.remove('pop');

    const result = Core.resolveHighScore(readHighScoreRaw(), score);
    writeHighScore(result.high);

    finalScoreEl.textContent = String(score);
    highScoreEl.textContent = String(result.high);
    newRecordEl.hidden = !result.isNewRecord;
    endOverlay.hidden = false;

    playEnd();
  }

  // ---- 窗口尺寸变化：将小球约束回有效区域 ----
  function onResize() {
    if (state !== 'PLAYING') return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (state === 'PLAYING') spawnBall();
    }, 150);
  }

  // ---- 事件绑定 ----
  startBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    ensureAudio();
    startGame();
  });
  restartBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    startGame();
  });
  app.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('resize', onResize);

  // 初始 HUD
  renderScore();
  renderTimer();
})();
