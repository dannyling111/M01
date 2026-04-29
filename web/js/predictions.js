// predictions.js — L5 校准统计逻辑（mirror of calibration_report.py）
(function (global) {
  "use strict";

  function brierScore(records) {
    const settled = records.filter((r) => r.status === "settled" && r.errorTag !== "5");
    if (!settled.length) return null;
    const sum = settled.reduce((acc, r) => acc + Math.pow((r.confidence || 0.6) - r.hit, 2), 0);
    return sum / settled.length;
  }

  function bySource(records) {
    const settled = records.filter((r) => r.status === "settled");
    const groups = {};
    for (const r of settled) {
      if (!groups[r.source]) groups[r.source] = [];
      groups[r.source].push(r);
    }
    const rows = [];
    for (const [src, items] of Object.entries(groups)) {
      const n = items.length;
      const winRate = items.reduce((a, x) => a + x.hit, 0) / n;
      const avgConf = items.reduce((a, x) => a + (x.confidence || 0.6), 0) / n;
      const brier = items.reduce((a, x) => a + Math.pow((x.confidence || 0.6) - x.hit, 2), 0) / n;
      const overConfidence = avgConf - winRate;
      rows.push({ source: src, n, winRate, avgConf, brier, overConfidence });
    }
    rows.sort((a, b) => b.n - a.n);
    return rows;
  }

  function calibrationBuckets(records, nBuckets = 5) {
    const settled = records.filter((r) => r.status === "settled");
    const buckets = [];
    for (let i = 0; i < nBuckets; i++) {
      const lo = i / nBuckets;
      const hi = (i + 1) / nBuckets;
      const inB = settled.filter((r) => {
        const c = r.confidence || 0.6;
        return c >= lo && c < hi + (i === nBuckets - 1 ? 0.01 : 0);
      });
      const center = (lo + hi) / 2;
      const actual = inB.length ? inB.reduce((a, x) => a + x.hit, 0) / inB.length : center;
      buckets.push({ bucket: center, n: inB.length, actual });
    }
    return buckets;
  }

  function summary(records) {
    const total = records.length;
    const settled = records.filter((r) => r.status === "settled");
    const mine = settled.filter((r) => r.source === "我");
    const myWin = mine.length ? mine.reduce((a, x) => a + x.hit, 0) / mine.length : null;
    return {
      total, settled: settled.length,
      myWin, brier: brierScore(records),
    };
  }

  global.PRED = { brierScore, bySource, calibrationBuckets, summary };
})(window);
