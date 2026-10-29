# 抓小球小游戏 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 用原生 HTML/CSS/JS 实现一个 2 分钟限时的单页抓球小游戏，命中 +2、点空 −1（下限 0），实时分数与倒计时，结束结算并可重开。

**Architecture:** 采用「纯逻辑核心 + DOM 外壳」分层。所有可测的纯逻辑（计分、时间格式化、生成位置算法、最高分裁决）收敛到 `game-core.js`，用 UMD-lite 模式同时支持浏览器全局 `GameCore` 与 Node `require`，实现零依赖单元测试；`script.js` 只负责 DOM 事件、定时器、音效与特效。使用**经典 `<script>` 标签（非 ES module）**，保证 `file://` 双击即可运行。

**Tech Stack:** HTML5、CSS3、原生 JavaScript（ES6）、Web Audio API、localStorage、Node.js（仅用于跑测试）。

**Spec:** 见 [spec.md](../../spec.md)（本仓库根目录）。

---

## 文件结构

```
class/
├── spec.md                       # 需求规格（已存在）
├── docs/plans/2026-10-19-catch-the-ball.md   # 本计划
├── game-core.js                  # 纯逻辑（UMD-lite），可被 Node require
├── script.js                     # DOM 外壳：状态机/事件/定时器/音效/特效
├── style.css                     # 视觉与动画
├── index.html                    # 结构
└── tests/core.test.js            # 零依赖测试运行器（Node）
```

> 说明：spec 原定「分离三文件」。因采用「零依赖逻辑测试 + 浏览器验证」策略，将纯逻辑拆出 `game-core.js`（第 4 个源文件）+ `tests/core.test.js`。业务范围不变。

---

## Task 1: 计分核心 `nextScore`

**Files:**
- Create: `tests/core.test.js`
- Create: `game-core.js`

**Step 1: Write the failing test**

`tests/core.test.js`（建立运行器 + 第一批断言）：

```js
// tests/core.test.js —— 零依赖测试运行器
const assert = require('assert');
const core = require('../game-core.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  PASS', name); }
  catch (e) { failed++; console.log('  FAIL', name, '\n        ' + e.message); }
}

// Task 1: nextScore
test('命中加 2 分', () => assert.strictEqual(core.nextScore(0, true), 2));
test('命中在已有分基础上加 2', () => assert.strictEqual(core.nextScore(8, true), 10));
test('点空扣 1 分', () => assert.strictEqual(core.nextScore(2, false), 1));
test('0 分点空仍为 0（下限）', () => assert.strictEqual(core.nextScore(0, false), 0));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
```

**Step 2: Run test to verify it fails**

Run: `node tests/core.test.js`
Expected: FAIL / 报错 —— `Cannot find module '../game-core.js'`

**Step 3: Write minimal implementation**

`game-core.js`（UMD-lite 骨架 + 仅实现 `nextScore`）：

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GameCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 命中 +2；点空 -1，下限 0
  function nextScore(score, isHit) {
    return isHit ? score + 2 : Math.max(0, score - 1);
  }

  return { nextScore };
});
```

**Step 4: Run test to verify it passes**

Run: `node tests/core.test.js`
Expected: `4 passed, 0 failed`

**Step 5: Commit**（仅在仓库存在且用户要求时执行）

---

## Task 2: 时间工具 `formatTime` / `isWarnTime`

**Files:**
- Modify: `game-core.js`
- Modify: `tests/core.test.js`

**Step 1: Write the failing test**（追加到 test 文件）

```js
test('120 秒格式化为 02:00', () => assert.strictEqual(core.formatTime(120), '02:00'));
test('9 秒格式化为 00:09（补零）', () => assert.strictEqual(core.formatTime(9), '00:09'));
test('0 秒格式化为 00:00', () => assert.strictEqual(core.formatTime(0), '00:00'));
test('负数秒夹紧为 00:00', () => assert.strictEqual(core.formatTime(-5), '00:00'));
test('低于等于阈值进入告警', () => assert.strictEqual(core.isWarnTime(30, 30), true));
test('高于阈值不告警', () => assert.strictEqual(core.isWarnTime(31, 30), false));
```

**Step 2: Run to verify failure** → `is not a function`

**Step 3: Implement**

```js
function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}

function isWarnTime(seconds, warnAt) {
  return seconds <= warnAt;
}
```

并加入 return 导出。

**Step 4: Run to verify pass** → 全绿。

---

## Task 3: 距离函数 `distance`

**Files:** Modify `game-core.js`, `tests/core.test.js`

**Step 1: Test**

```js
test('两点距离（3,4）= 5', () => assert.strictEqual(core.distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5));
test('同点距离为 0', () => assert.strictEqual(core.distance({ x: 5, y: 5 }, { x: 5, y: 5 }), 0));
```

**Step 2-4:** 实现 `distance(a, b)` 返回欧氏距离；跑绿。

---

## Task 4: 生成位置算法 `pickSpawnPosition`

**Files:** Modify `game-core.js`, `tests/core.test.js`

**接口约定：**
```js
pickSpawnPosition({
  area: { width, height },   // 舞台尺寸
  ballSize,                  // 球直径
  prev,                      // 上次中心 {x,y} | null
  avoidRects,                // [{left,top,right,bottom}] 需避让的 UI 矩形
  minDist,                   // 与 prev 的最小位移
  retry,                     // 最大重试次数
  random                     // 可注入，默认 Math.random
}) => { x, y }               // 返回球心坐标
```

**Step 1: Test**

```js
test('无 prev 时返回区域内合法点', () => {
  for (let i = 0; i < 100; i++) {
    const p = core.pickSpawnPosition({ area: { width: 800, height: 600 }, ballSize: 60, prev: null });
    assert.ok(p.x >= 30 && p.x <= 770 && p.y >= 30 && p.y <= 570);
  }
});
test('满足最小位移时选取合规点（注入固定随机）', () => {
  const seq = [0.9, 0.9]; let i = 0;
  const p = core.pickSpawnPosition({
    area: { width: 800, height: 600 }, ballSize: 60, prev: { x: 100, y: 100 },
    minDist: 200, random: () => seq[i++ % seq.length]
  });
  assert.ok(core.distance(p, { x: 100, y: 100 }) >= 200);
});
test('始终避开指定矩形', () => {
  const avoid = [{ left: 0, top: 0, right: 400, bottom: 600 }]; // 遮挡左半区
  for (let i = 0; i < 100; i++) {
    const p = core.pickSpawnPosition({ area: { width: 800, height: 600 }, ballSize: 60, prev: null, avoidRects: avoid });
    assert.ok(p.x - 30 >= 400, '球不应与左半遮罩重叠');
  }
});
test('约束不可满足时仍返回区域内点（兜底）', () => {
  const p = core.pickSpawnPosition({ area: { width: 800, height: 600 }, ballSize: 60, prev: { x: 400, y: 300 }, minDist: 99999 });
  assert.ok(p.x >= 30 && p.x <= 770 && p.y >= 30 && p.y <= 570);
});
```

**Step 2: Run to verify failure.**

**Step 3: Implement**

```js
function distance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function overlapsRect(cx, cy, r, rect) {
  return !(cx + r <= rect.left || cx - r >= rect.right || cy + r <= rect.top || cy - r >= rect.bottom);
}

function pickSpawnPosition(opts) {
  const area = opts.area;
  const ballSize = opts.ballSize;
  const prev = opts.prev || null;
  const avoidRects = opts.avoidRects || [];
  const minDist = opts.minDist || 0;
  const retry = opts.retry || 20;
  const random = opts.random || Math.random;

  const margin = ballSize; // 半半径 + 安全边距
  const w = Math.max(0, area.width - 2 * margin);
  const h = Math.max(0, area.height - 2 * margin);
  const r = ballSize / 2;

  let best = null, bestDist = -1;
  for (let i = 0; i < retry; i++) {
    const cand = { x: margin + random() * w, y: margin + random() * h };
    let blocked = false;
    for (const rect of avoidRects) {
      if (overlapsRect(cand.x, cand.y, r, rect)) { blocked = true; break; }
    }
    if (blocked) continue;
    const d = prev ? distance(cand, prev) : Infinity;
    if (d >= minDist) return cand;
    if (d > bestDist) { bestDist = d; best = cand; }
  }
  if (best) return best;
  return { x: margin + random() * w, y: margin + random() * h };
}
```

**Step 4: Run to verify pass.**

---

## Task 5: 最高分裁决 `resolveHighScore`

**Files:** Modify `game-core.js`, `tests/core.test.js`

**Step 1: Test**

```js
test('未破纪录时返回旧记录且不为新纪录', () =>
  assert.deepStrictEqual(core.resolveHighScore(10, 5), { high: 10, isNewRecord: false }));
test('破纪录时更新并标记新纪录', () =>
  assert.deepStrictEqual(core.resolveHighScore(10, 12), { high: 12, isNewRecord: true }));
test('非法存储值按 0 处理', () =>
  assert.deepStrictEqual(core.resolveHighScore(NaN, 0), { high: 0, isNewRecord: false }));
```

**Step 2-4: Implement**

```js
function resolveHighScore(stored, score) {
  const prev = (typeof stored === 'number' && Number.isFinite(stored) && stored > 0) ? stored : 0;
  return { high: Math.max(prev, score), isNewRecord: score > prev };
}
```

---

## Task 6: 页面结构 `index.html`

**Files:** Create `index.html`

**无单元测试，浏览器验证。**

结构要点：
- `lang="zh-CN"`，`<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">`
- `#app`
  - `#hud`：`分数：<span id="score">0</span>` ｜ `时间：<span id="timer">02:00</span>`
  - `#stage`（相对定位容器）
    - `#ball`（绝对定位的蓝球，`hidden`/透明 由状态控制）
    - `#fx-layer`（粒子/波纹容器）
  - `#start-overlay`（`<h1>` 标题 + `#start-btn`「开始游戏」）
  - `#end-overlay`（`hidden`）：`#final-score`、`#high-score`、`#new-record`、`#restart-btn`「重新开始」
- 底部按顺序引入 `<script src="game-core.js"></script>`、`<script src="script.js"></script>`（**不加 `type="module"`**）

---

## Task 7: 视觉样式 `style.css`

**Files:** Create `style.css`

要点：浅黄 `#FFFDE7` 背景、蓝球 `#2196F3`（直径 `clamp(48px, 8vw, 60px)`）、圆角阴影、`#333` 文字、遮罩/弹窗居中、命中粒子动画、点空红闪 `@keyframes`、`touch-action: manipulation`、`user-select: none`、响应式媒体查询。

---

## Task 8: DOM 外壳 `script.js`

**Files:** Create `script.js`

要点（全部经 `GameCore` 调用纯逻辑）：
- 常量：`GAME_DURATION=120`、`BALL_MIN_DIST=150`、`SPAWN_RETRY=20`、`WARN_TIME=30`、`STORAGE_KEY='catchball.highscore'`
- 状态：`state` ∈ `IDLE|PLAYING|ENDED`；`score`、`timeLeft`、`tickTimer`
- `startGame()`：隐藏开始遮罩 → 重置 → 进入 PLAYING → `spawnBall()` → `startTimer()`
- `startTimer()`：`setInterval` 每秒 `timeLeft--`，刷新 HUD；`<=WARN_TIME` 加告警类；归零 `endGame()`
- `spawnBall()`：读 `#stage` 尺寸与 UI 矩形，调用 `GameCore.pickSpawnPosition`，定位 `#ball`，播放入场动画
- `onStagePointerDown(e)`：`state!=='PLAYING'` 直接 return；命中判定 `e.target===ball` → `GameCore.nextScore(score,true)` + 命中音效/粒子 + `spawnBall()`；否则 `nextScore(score,false)` + 扣分音效 + 红闪
- `endGame()`：清定时器 → `state='ENDED'` → 隐藏球 → 读写 localStorage → 用 `resolveHighScore` 裁决 → 填充并显示结算弹窗
- `restart()`：隐藏弹窗 → `startGame()`
- 音效：`AudioContext` 懒加载，首次点击开始 `resume()`；`beep(freq, dur, type)` 合成
- 事件：`start-btn` click、`restart-btn` click、`#stage` pointerdown、`window resize`

---

## Task 9: 音效与特效

**Files:** Modify `script.js`、`style.css`

- 命中：`beep(880, 0.08, 'sine')` + 球体缩放消散 + 粒子
- 点空：`beep(200, 0.12, 'square')` + 页面红闪 class
- 结束：两段提示音

---

## Task 10: 浏览器验收

**Files:** 无（验证）

启动本地静态服务器（`python -m http.server 8000`），用浏览器逐一执行 spec §14 的 12 条验收标准，截图记录证据。所有断言必须通过，未通过则回到对应 Task 修复。

**验收检查清单（来自 spec §14）**
1. 开始按钮开局、遮罩消失、倒计时递减
2. 120 秒后显示 00:00 并结算
3. 背景浅黄 `#FFFDE7`
4. PLAYING 时恰好 1 个蓝球随机出现
5. 命中：+2 且球换位
6. 点空：−1（下限 0）且球不动
7. HUD 分数/倒计时实时更新
8. 结束：移除球、点击无效、弹结算
9. 破纪录显示「新纪录！」并写回 localStorage
10. 重新开始：重置并立即开局
11. 音效在首次交互后播放
12. 触屏/窄窗口可用

---

## 执行方式

计划完成后按 `superpowers:executing-plans` 逐任务执行；每个 Task 遵循 TDD 循环（Red → 验证失败 → Green → 验证通过 → Refactor），Task 10 用浏览器实证收尾（对应 `superpowers:verification-before-completion`）。
