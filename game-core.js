// game-core.js —— 纯逻辑核心（UMD-lite：浏览器全局 GameCore / Node require）
// 不依赖 DOM，可被单元测试直接调用。
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

  // 秒 -> "MM:SS"（补零、负数夹紧为 00:00）
  function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
  }

  // 是否进入倒计时告警
  function isWarnTime(seconds, warnAt) {
    return seconds <= warnAt;
  }

  // 两点欧氏距离
  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // 圆（圆心 cx,cy 半径 r）与矩形是否相交
  function overlapsRect(cx, cy, r, rect) {
    return !(cx + r <= rect.left || cx - r >= rect.right || cy + r <= rect.top || cy - r >= rect.bottom);
  }

  // 生成小球中心坐标：区域内随机 + 避让 UI 矩形 + 与上次位置保持最小位移
  // opts: { area:{width,height}, ballSize, prev, avoidRects, minDist, retry, random }
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

    let best = null;
    let bestDist = -1;
    for (let i = 0; i < retry; i++) {
      const cand = { x: margin + random() * w, y: margin + random() * h };
      let blocked = false;
      for (let j = 0; j < avoidRects.length; j++) {
        if (overlapsRect(cand.x, cand.y, r, avoidRects[j])) { blocked = true; break; }
      }
      if (blocked) continue;
      const d = prev ? distance(cand, prev) : Infinity;
      if (d >= minDist) return cand;
      if (d > bestDist) { bestDist = d; best = cand; }
    }
    if (best) return best; // 约束不可满足时取距离上次最远的候选
    return { x: margin + random() * w, y: margin + random() * h };
  }

  // 最高分裁决：stored 为旧记录，返回 { high, isNewRecord }
  function resolveHighScore(stored, score) {
    const prev = (typeof stored === 'number' && Number.isFinite(stored) && stored > 0) ? stored : 0;
    return { high: Math.max(prev, score), isNewRecord: score > prev };
  }

  return { nextScore, formatTime, isWarnTime, distance, pickSpawnPosition, resolveHighScore };
});
