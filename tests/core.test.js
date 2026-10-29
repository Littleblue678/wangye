// tests/core.test.js —— 零依赖测试运行器（Node 直接运行）
const assert = require('assert');
const core = require('../game-core.js');

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  PASS', name);
  } catch (e) {
    failed++;
    console.log('  FAIL', name, '\n        ' + e.message);
  }
}

console.log('game-core 纯逻辑测试\n');

// ---- Task 1: nextScore ----
test('命中加 2 分', () => assert.strictEqual(core.nextScore(0, true), 2));
test('命中在已有分基础上加 2', () => assert.strictEqual(core.nextScore(8, true), 10));
test('点空扣 1 分', () => assert.strictEqual(core.nextScore(2, false), 1));
test('0 分点空仍为 0（下限）', () => assert.strictEqual(core.nextScore(0, false), 0));

// ---- Task 2: formatTime / isWarnTime ----
test('120 秒格式化为 02:00', () => assert.strictEqual(core.formatTime(120), '02:00'));
test('9 秒格式化为 00:09（补零）', () => assert.strictEqual(core.formatTime(9), '00:09'));
test('0 秒格式化为 00:00', () => assert.strictEqual(core.formatTime(0), '00:00'));
test('负数秒夹紧为 00:00', () => assert.strictEqual(core.formatTime(-5), '00:00'));
test('低于等于阈值进入告警', () => assert.strictEqual(core.isWarnTime(30, 30), true));
test('高于阈值不告警', () => assert.strictEqual(core.isWarnTime(31, 30), false));

// ---- Task 3: distance ----
test('两点距离（3,4）= 5', () => assert.strictEqual(core.distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5));
test('同点距离为 0', () => assert.strictEqual(core.distance({ x: 5, y: 5 }, { x: 5, y: 5 }), 0));

// ---- Task 4: pickSpawnPosition ----
test('无 prev 时返回区域内合法点', () => {
  for (let i = 0; i < 100; i++) {
    const p = core.pickSpawnPosition({ area: { width: 800, height: 600 }, ballSize: 60, prev: null });
    assert.ok(p.x >= 30 && p.x <= 770 && p.y >= 30 && p.y <= 570, '越界: ' + JSON.stringify(p));
  }
});
test('满足最小位移时选取合规点（注入固定随机）', () => {
  const seq = [0.9, 0.9];
  let i = 0;
  const p = core.pickSpawnPosition({
    area: { width: 800, height: 600 },
    ballSize: 60,
    prev: { x: 100, y: 100 },
    minDist: 200,
    random: () => seq[i++ % seq.length]
  });
  assert.ok(core.distance(p, { x: 100, y: 100 }) >= 200, '位移不足: ' + JSON.stringify(p));
});
test('始终避开指定矩形', () => {
  const avoid = [{ left: 0, top: 0, right: 400, bottom: 600 }]; // 遮挡左半区
  for (let i = 0; i < 100; i++) {
    const p = core.pickSpawnPosition({
      area: { width: 800, height: 600 },
      ballSize: 60,
      prev: null,
      avoidRects: avoid
    });
    assert.ok(p.x - 30 >= 400, '与左半遮罩重叠: ' + JSON.stringify(p));
  }
});
test('约束不可满足时仍返回区域内点（兜底）', () => {
  const p = core.pickSpawnPosition({
    area: { width: 800, height: 600 },
    ballSize: 60,
    prev: { x: 400, y: 300 },
    minDist: 99999
  });
  assert.ok(p.x >= 30 && p.x <= 770 && p.y >= 30 && p.y <= 570, '越界: ' + JSON.stringify(p));
});

// ---- Task 5: resolveHighScore ----
test('未破纪录时返回旧记录且不为新纪录', () =>
  assert.deepStrictEqual(core.resolveHighScore(10, 5), { high: 10, isNewRecord: false }));
test('破纪录时更新并标记新纪录', () =>
  assert.deepStrictEqual(core.resolveHighScore(10, 12), { high: 12, isNewRecord: true }));
test('非法存储值按 0 处理', () =>
  assert.deepStrictEqual(core.resolveHighScore(NaN, 0), { high: 0, isNewRecord: false }));

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
