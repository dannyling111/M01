// axiom.js — AXIOM 9 引擎 JS 端口（mirror of axiom_engines.py）
// 输出统一为 EngineOutput { id, score, reliability, confidence, payload }

(function (global) {
  "use strict";

  // ========== 工具函数 ==========
  const clamp = (x, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x));
  const sign = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);

  function percentileRank(arr, value) {
    if (!arr || !arr.length) return 0.5;
    const below = arr.filter((v) => v <= value).length;
    return below / arr.length;
  }

  function mean(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  // ========== 引擎 base_grade & oos_health ==========
  const BASE_GRADE = {
    "L1-02": 0.92, "L2-03": 0.85, "L3-01": 0.80, "L3-02": 0.78, "L3-03": 0.82,
    "L3-04": 0.75, "L4-08": 0.88, "L5-01": 0.83, "L6-01": 0.86, "L6-03": 0.80,
  };
  const OOS_HEALTH = {
    "L1-02": 0.95, "L2-03": 0.88, "L3-01": 0.72, "L3-02": 0.81, "L3-03": 0.85,
    "L3-04": 0.78, "L4-08": 0.90, "L5-01": 0.86, "L6-01": 0.84, "L6-03": 0.82,
  };
  const REGIME_PENALTY = 0.92;

  function reliabilityOf(id) {
    return (BASE_GRADE[id] || 0.7) * REGIME_PENALTY * (OOS_HEALTH[id] || 0.8);
  }

  function out(id, score, payload, confidence = null) {
    const rel = reliabilityOf(id);
    return {
      id,
      score: clamp(score),
      reliability: rel,
      confidence: confidence == null ? rel : confidence,
      payload: payload || {},
    };
  }

  // ========== L2-03 美林时钟 ==========
  function merrillClock(gdpYoY, cpiYoY) {
    const g0 = gdpYoY[gdpYoY.length - 1];
    const i0 = cpiYoY[cpiYoY.length - 1];
    const g3 = gdpYoY[gdpYoY.length - 4] || g0;
    const i3 = cpiYoY[cpiYoY.length - 4] || i0;
    const dG = g0 - g3;
    const dI = i0 - i3;
    let quadrant;
    if (dG > 0 && dI < 0) quadrant = "recovery";
    else if (dG > 0 && dI > 0) quadrant = "overheat";
    else if (dG < 0 && dI > 0) quadrant = "stagflation";
    else quadrant = "recession";
    const score = clamp((dG - dI) / 2);
    return out("L2-03", score, { quadrant, dG, dI, g: g0, i: i0 });
  }

  // ========== L3-01 估值均值回归 ==========
  function valuationMeanReversion(cape, capeHist, erp, buffett, buffettHist) {
    const capePct = percentileRank(capeHist, cape);
    const buffPct = percentileRank(buffettHist, buffett);
    // 估值越高 score 越负（看空）
    const score = clamp(-(capePct - 0.5) * 2);
    const tag = capePct > 0.9 ? "极端高估" : capePct > 0.75 ? "高估" : capePct < 0.25 ? "低估" : "中性";
    return out("L3-01", score, { capePct, buffPct, erp, tag });
  }

  // ========== L3-02 利率体制 ==========
  function rateRegime(realRate, curve2s10s, move) {
    // realRate 高 + 倒挂 → 紧缩压力 → 看空风险资产
    const tightness = clamp(realRate / 2 - curve2s10s / 200);
    const score = -tightness; // 紧缩→负
    const stress = move > 110 ? "high" : move > 90 ? "med" : "low";
    return out("L3-02", score, { realRate, curve2s10s, move, stress });
  }

  // ========== L3-03 信用周期 ==========
  function creditCycle(creditImpulse, hyOAS) {
    // OAS 低 + impulse 正 → 信用宽松
    const score = clamp(creditImpulse - (hyOAS - 400) / 600);
    const phase = hyOAS > 600 ? "stress" : hyOAS > 450 ? "tightening" : "easy";
    return out("L3-03", score, { creditImpulse, hyOAS, phase });
  }

  // ========== L3-04 流动性 ==========
  function liquidity(netLiqYoY, m2YoY) {
    const score = clamp(netLiqYoY * 5 + (m2YoY - 5) / 10);
    const trend = score > 0.2 ? "expanding" : score < -0.2 ? "draining" : "neutral";
    return out("L3-04", score, { netLiqYoY, m2YoY, trend });
  }

  // ========== L4-08 阈值引擎 ==========
  // [关注, 预警, 触发]
  const THRESHOLDS = {
    CAPE:     { th: [30, 35, 38], dir: ">" },
    ERP:      { th: [1.0, 0.0, -0.5], dir: "<" },
    "2s10s":  { th: [50, 0, -20], dir: "<" },
    AuOil:    { th: [40, 55, 70], dir: ">" },
    MOVE_VIX: { th: [4, 5, 6], dir: ">" },
    Sahm:     { th: [0.2, 0.4, 0.5], dir: ">" },
    HY_OAS:   { th: [400, 550, 700], dir: ">" },
    "5Y5Y":   { th: [2.5, 2.8, 3.0], dir: ">" },
    ISM_PMI:  { th: [50, 48, 45], dir: "<" },
  };

  function thresholdState(value, cfg) {
    const [att, warn, trig] = cfg.th;
    if (cfg.dir === ">") {
      if (value >= trig) return "trigger";
      if (value >= warn) return "warn";
      if (value >= att) return "attention";
      return "ok";
    } else {
      if (value <= trig) return "trigger";
      if (value <= warn) return "warn";
      if (value <= att) return "attention";
      return "ok";
    }
  }

  function thresholdCheck(signals) {
    const states = {};
    let triggers = 0, warns = 0, attentions = 0;
    for (const [k, v] of Object.entries(signals)) {
      const cfg = THRESHOLDS[k];
      if (!cfg) continue;
      const s = thresholdState(v, cfg);
      states[k] = { value: v, state: s, th: cfg.th, dir: cfg.dir };
      if (s === "trigger") triggers++;
      else if (s === "warn") warns++;
      else if (s === "attention") attentions++;
    }
    const score = clamp(-(triggers * 0.3 + warns * 0.15 + attentions * 0.05));
    return out("L4-08", score, { states, triggers, warns, attentions });
  }

  // 距触发最近：返回排名前 N 的 [name, distancePct]
  function nearestTriggers(signals, n = 3) {
    const arr = [];
    for (const [k, v] of Object.entries(signals)) {
      const cfg = THRESHOLDS[k];
      if (!cfg) continue;
      const trig = cfg.th[2];
      // distance 0 = 已触发，1 = 距离很远
      const dist = cfg.dir === ">" ? Math.max(0, (trig - v) / Math.max(Math.abs(trig), 1))
                                   : Math.max(0, (v - trig) / Math.max(Math.abs(trig), 1));
      arr.push({ name: k, value: v, trigger: trig, distance: dist, state: thresholdState(v, cfg) });
    }
    arr.sort((a, b) => a.distance - b.distance);
    return arr.slice(0, n);
  }

  // ========== L6-01 情景矩阵 ==========
  // 每个情景 = (G方向, I方向, Liq方向, Credit方向)
  const SCENARIOS = {
    soft_landing: { g: 1, i: -1, liq: 0, credit: 1, prior: 0.30 },
    recession:    { g: -1, i: -1, liq: -1, credit: -1, prior: 0.25 },
    reflation:    { g: 1, i: 1, liq: 1, credit: 1, prior: 0.20 },
    stagflation:  { g: -1, i: 1, liq: -1, credit: -1, prior: 0.25 },
  };

  function scenarioLikelihood(scenarioCfg, engOut) {
    // 简化 likelihood：方向匹配度
    const g = engOut.merrill.payload.dG > 0 ? 1 : -1;
    const i = engOut.merrill.payload.dI > 0 ? 1 : -1;
    const liq = engOut.liq.score > 0 ? 1 : -1;
    const credit = engOut.credit.score > 0 ? 1 : -1;
    let match = 0;
    if (g === scenarioCfg.g) match++;
    if (i === scenarioCfg.i) match++;
    if (liq === scenarioCfg.liq) match++;
    if (credit === scenarioCfg.credit) match++;
    return 0.1 + (match / 4) * 0.9; // 0.1 ~ 1.0
  }

  function scenarioMatrix(engOut) {
    const post = {};
    let denom = 0;
    for (const [name, cfg] of Object.entries(SCENARIOS)) {
      const lik = scenarioLikelihood(cfg, engOut);
      post[name] = lik * cfg.prior;
      denom += post[name];
    }
    for (const k of Object.keys(post)) post[k] = post[k] / denom;
    return out("L6-01", 0, { scenarios: post });
  }

  // ========== L6-03 贡献归因（简化版）==========
  function topContributors(engOut, dominantScenario) {
    const cfg = SCENARIOS[dominantScenario];
    const items = [
      { id: "L2-03", name: "美林时钟", contrib: Math.abs(engOut.merrill.payload.dG - engOut.merrill.payload.dI) * 0.4, why: `G ${engOut.merrill.payload.dG.toFixed(2)} / I ${engOut.merrill.payload.dI.toFixed(2)}` },
      { id: "L3-01", name: "估值均值回归", contrib: Math.abs(engOut.val.score) * 0.35, why: `CAPE pct ${(engOut.val.payload.capePct * 100).toFixed(0)}%` },
      { id: "L3-02", name: "利率体制", contrib: Math.abs(engOut.rate.score) * 0.30, why: `realRate ${engOut.rate.payload.realRate} / 2s10s ${engOut.rate.payload.curve2s10s}bp` },
      { id: "L3-03", name: "信用周期", contrib: Math.abs(engOut.credit.score) * 0.30, why: `OAS ${engOut.credit.payload.hyOAS}bp · ${engOut.credit.payload.phase}` },
      { id: "L3-04", name: "流动性", contrib: Math.abs(engOut.liq.score) * 0.25, why: `netLiq ${(engOut.liq.payload.netLiqYoY * 100).toFixed(1)}% · ${engOut.liq.payload.trend}` },
      { id: "L4-08", name: "阈值引擎", contrib: Math.abs(engOut.thr.score) * 0.40, why: `${engOut.thr.payload.triggers} 触发 / ${engOut.thr.payload.warns} 预警` },
    ];
    items.sort((a, b) => b.contrib - a.contrib);
    return items.slice(0, 3);
  }

  // ========== 主入口 ==========
  function runMVP(d) {
    const merrill = merrillClock(d.gdpYoY, d.cpiYoY);
    const val = valuationMeanReversion(d.cape, d.capeHistory, d.erp, d.buffett, d.buffettHistory);
    const rate = rateRegime(d.realRate, d.curve_2s10s, d.move);
    const credit = creditCycle(d.creditImpulse, d.hyOAS);
    const liq = liquidity(d.netLiqYoY, d.m2YoY);
    const thr = thresholdCheck(d.signals);
    const engOut = { merrill, val, rate, credit, liq, thr };
    const scn = scenarioMatrix(engOut);
    const scenarios = scn.payload.scenarios;
    const dominant = Object.entries(scenarios).sort((a, b) => b[1] - a[1])[0][0];
    const contrib = topContributors(engOut, dominant);

    // 综合 score：各引擎加权
    const compositeScore = (
      merrill.score * 0.20 +
      val.score * 0.20 +
      rate.score * 0.15 +
      credit.score * 0.15 +
      liq.score * 0.10 +
      thr.score * 0.20
    );

    return {
      asOf: d.asOf,
      engines: {
        "L2-03": merrill, "L3-01": val, "L3-02": rate, "L3-03": credit,
        "L3-04": liq, "L4-08": thr, "L6-01": scn,
      },
      scenarios,
      dominant,
      contrib,
      compositeScore,
      nearest: nearestTriggers(d.signals, 3),
    };
  }

  // 引擎元数据（用于现状卡）
  const ENGINE_META = {
    "L2-03": { name: "美林时钟", layer: "L2 框架层" },
    "L3-01": { name: "估值均值回归", layer: "L3 模型层" },
    "L3-02": { name: "利率体制", layer: "L3 模型层" },
    "L3-03": { name: "信用周期", layer: "L3 模型层" },
    "L3-04": { name: "流动性", layer: "L3 模型层" },
    "L4-08": { name: "阈值警报", layer: "L4 决策层" },
    "L6-01": { name: "情景概率", layer: "L6 顶层" },
  };

  global.AXIOM = {
    runMVP, merrillClock, valuationMeanReversion, rateRegime, creditCycle,
    liquidity, thresholdCheck, scenarioMatrix, nearestTriggers,
    BASE_GRADE, OOS_HEALTH, REGIME_PENALTY, THRESHOLDS, SCENARIOS, ENGINE_META,
    reliabilityOf, percentileRank, clamp, sign, mean,
  };
})(window);
