// app.js — 主入口：tab 切换 + DOM 渲染
(function () {
  "use strict";

  const D = window.DEMO_DATA;
  const result = window.AXIOM.runMVP(D);

  // ========== Header ==========
  document.getElementById("data-version").innerHTML = `data: <span class="font-mono">${D.dataVersion}</span>`;
  document.getElementById("last-update").innerHTML = `updated: <span class="font-mono">${D.asOf}</span>`;
  document.getElementById("footer-time").textContent = new Date().toLocaleString("zh-CN");

  // ========== TAB 切换 ==========
  const tabs = document.querySelectorAll(".tab-btn");
  const sections = document.querySelectorAll(".tab-content");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      tabs.forEach((b) => b.classList.remove("tab-active"));
      btn.classList.add("tab-active");
      sections.forEach((s) => s.classList.add("hidden"));
      document.getElementById("tab-" + target).classList.remove("hidden");
      // 切到 markets 时刷新可能延迟挂载的 chart
    });
  });

  // ========== TAB 1: OVERVIEW ==========
  const dominantName = D.scenarioNames[result.dominant] || result.dominant;
  const dominantProb = (result.scenarios[result.dominant] * 100).toFixed(1);
  document.getElementById("kpi-scenario").textContent = dominantName;
  document.getElementById("kpi-scenario-prob").textContent = dominantProb + "%";

  const merrill = result.engines["L2-03"];
  const quadName = { recovery: "复苏", overheat: "过热", stagflation: "滞胀", recession: "衰退" }[merrill.payload.quadrant];
  document.getElementById("kpi-clock").textContent = quadName;
  document.getElementById("kpi-clock-sub").textContent =
    `ΔG:${merrill.payload.dG.toFixed(2)} ΔI:${merrill.payload.dI.toFixed(2)}`;

  const thr = result.engines["L4-08"].payload;
  document.getElementById("kpi-stress").textContent = `${thr.triggers}/${thr.warns}/${thr.attentions}`;
  document.getElementById("kpi-stress-sub").textContent = `触发 / 预警 / 关注`;

  document.getElementById("kpi-score").textContent = result.compositeScore.toFixed(2);
  const scoreClass = result.compositeScore < -0.3 ? "text-red-400" : result.compositeScore < 0 ? "text-orange-400" : "text-emerald-400";
  document.getElementById("kpi-score").classList.add(scoreClass);

  // 引擎卡片
  const engineCardsEl = document.getElementById("engine-cards");
  const renderEngine = (id, eng) => {
    const meta = window.AXIOM.ENGINE_META[id] || { name: id, layer: "" };
    const score = eng.score || 0;
    const rel = eng.reliability || 0;
    const barColor = score > 0.2 ? "bg-emerald-500" : score < -0.2 ? "bg-red-500" : "bg-yellow-500";
    let stateText = "中性";
    if (id === "L2-03") stateText = quadName;
    else if (id === "L3-01") stateText = eng.payload.tag || "";
    else if (id === "L3-02") stateText = eng.payload.stress + " 紧度";
    else if (id === "L3-03") stateText = { easy: "宽松", tightening: "趋紧", stress: "压力" }[eng.payload.phase];
    else if (id === "L3-04") stateText = { expanding: "扩张", neutral: "中性", draining: "收缩" }[eng.payload.trend];
    else if (id === "L4-08") stateText = `${eng.payload.triggers} 触发`;
    else if (id === "L6-01") stateText = dominantName;
    return `
      <div class="engine-card">
        <div class="engine-id">${id} · ${meta.layer}</div>
        <div class="engine-name">${meta.name}</div>
        <div class="engine-state">${stateText}</div>
        <div class="bar-bg"><div class="bar-fill ${barColor}" style="width:${Math.abs(score) * 100}%"></div></div>
        <div class="engine-meta"><span>score ${score.toFixed(2)}</span><span>rel ${rel.toFixed(2)}</span></div>
      </div>
    `;
  };
  engineCardsEl.innerHTML = ["L2-03", "L3-01", "L3-02", "L3-03", "L3-04", "L4-08", "L6-01"]
    .map((id) => renderEngine(id, result.engines[id])).join("");

  // 美林图
  CHARTS.renderMerrillClock("merrillChart", merrill.payload.dG, merrill.payload.dI);
  document.getElementById("merrill-explain").textContent =
    `当前位于「${quadName}」象限。GDP YoY ${merrill.payload.g.toFixed(1)}% / CPI YoY ${merrill.payload.i.toFixed(1)}%。`;

  // ========== TAB 2: SIGNALS ==========
  const sigBody = document.getElementById("signals-tbody");
  const stateBadge = (s) => ({
    ok: '<span class="badge badge-green">正常</span>',
    attention: '<span class="badge badge-yellow">关注</span>',
    warn: '<span class="badge badge-orange">预警</span>',
    trigger: '<span class="badge badge-red">触发</span>',
  }[s] || s);
  const stateDot = (s) => ({
    ok: '<span class="dot dot-green"></span>',
    attention: '<span class="dot dot-yellow"></span>',
    warn: '<span class="dot dot-orange"></span>',
    trigger: '<span class="dot dot-red"></span>',
  }[s] || "");

  const states = result.engines["L4-08"].payload.states;
  // 引擎归属（每个信号绑定到某一层）
  const SIG_ENGINE = {
    CAPE: "L3-01", ERP: "L3-01", "2s10s": "L3-02", AuOil: "L3-02",
    MOVE_VIX: "L3-02", Sahm: "L2-04", HY_OAS: "L3-03", "5Y5Y": "L4-03", ISM_PMI: "L1-02",
  };
  sigBody.innerHTML = Object.entries(states).map(([k, s]) => {
    const desc = D.signalDescriptions[k] || "";
    const eng = SIG_ENGINE[k] || "—";
    return `
      <tr>
        <td class="py-2 px-3 font-medium">${stateDot(s.state)}${k}</td>
        <td class="text-center text-xs font-mono text-slate-500">${eng}</td>
        <td class="text-center">${s.th[0]}</td>
        <td class="text-center">${s.th[1]}</td>
        <td class="text-center">${s.th[2]}</td>
        <td class="text-center font-bold">${s.value}</td>
        <td class="text-center">${stateBadge(s.state)}</td>
        <td class="text-xs text-slate-400">${desc}</td>
      </tr>
    `;
  }).join("");

  // 距触发最近的 3 个
  const nearestEl = document.getElementById("nearest-triggers");
  nearestEl.innerHTML = result.nearest.map((n) => `
    <div class="card">
      <div class="text-xs text-slate-500">距触发距离</div>
      <div class="text-2xl font-bold mt-1">${n.name}</div>
      <div class="text-sm text-slate-300 mt-1">当前 <b>${n.value}</b> · 阈值 ${n.trigger}</div>
      <div class="mt-2">${stateBadge(n.state)} <span class="text-xs text-slate-400 ml-2">距离 ${(n.distance * 100).toFixed(1)}%</span></div>
    </div>
  `).join("");

  // ========== TAB 3: SCENARIOS ==========
  CHARTS.renderScenarioBars("scenarioChart", result.scenarios, D.scenarioNames);
  CHARTS.renderDimRadar("dimChart", result);

  const scnBody = document.getElementById("scenario-tbody");
  scnBody.innerHTML = Object.entries(result.scenarios).map(([k, p]) => {
    const r = D.scenarioReturns[k] || {};
    const isDom = k === result.dominant;
    return `
      <tr class="${isDom ? 'bg-cyan-500/5' : ''}">
        <td class="py-2 px-3 font-medium">${isDom ? '★ ' : ''}${D.scenarioNames[k]}</td>
        <td class="text-center font-mono ${isDom ? 'text-cyan-400 font-bold' : ''}">${(p * 100).toFixed(1)}%</td>
        <td class="text-center text-xs">${r.SPX || ''}</td>
        <td class="text-center text-xs">${r.US10Y || ''}</td>
        <td class="text-center text-xs">${r.Gold || ''}</td>
        <td class="text-center text-xs">${r.DXY || ''}</td>
        <td class="text-center text-xs">${r.BTC || ''}</td>
        <td class="text-xs text-slate-300">${r.strategy || ''}</td>
      </tr>
    `;
  }).join("");

  const contribEl = document.getElementById("top-contrib");
  contribEl.innerHTML = result.contrib.map((c, i) => `
    <div class="engine-card">
      <div class="engine-id">#${i + 1} · ${c.id}</div>
      <div class="engine-name">${c.name}</div>
      <div class="engine-state text-cyan-400">贡献 ${c.contrib.toFixed(2)}</div>
      <div class="text-xs text-slate-400 mt-2">${c.why}</div>
    </div>
  `).join("");

  // ========== TAB 4: MARKETS ==========
  const valBadge = (v) => ({
    "极端": '<span class="badge badge-red">极端</span>',
    "高估": '<span class="badge badge-orange">高估</span>',
    "中性": '<span class="badge badge-yellow">中性</span>',
    "低估": '<span class="badge badge-green">低估</span>',
  }[v] || v);
  const dColor = (n) => n > 0 ? "text-emerald-400" : n < 0 ? "text-red-400" : "text-slate-400";
  const fmt = (n) => (n > 0 ? "+" : "") + n.toFixed(2);

  document.getElementById("asset-cards").innerHTML = D.assets.map((a) => `
    <div class="card">
      <div class="flex justify-between items-start">
        <div>
          <div class="text-xs text-slate-500">${a.sym}</div>
          <div class="text-sm text-slate-300">${a.name}</div>
        </div>
        ${valBadge(a.valuation)}
      </div>
      <div class="text-2xl font-bold mt-2">${a.price.toLocaleString()}</div>
      <div class="grid grid-cols-3 gap-1 mt-2 text-xs">
        <div><div class="text-slate-500">1D</div><div class="${dColor(a.d1)}">${fmt(a.d1)}%</div></div>
        <div><div class="text-slate-500">1M</div><div class="${dColor(a.m1)}">${fmt(a.m1)}%</div></div>
        <div><div class="text-slate-500">1Y</div><div class="${dColor(a.y1)}">${fmt(a.y1)}%</div></div>
      </div>
      <div class="bar-bg mt-2"><div class="bar-fill bg-cyan-500" style="width:${a.pct5y}%"></div></div>
      <div class="text-xs text-slate-500 mt-1">5Y 百分位 ${a.pct5y}%</div>
    </div>
  `).join("");

  document.getElementById("lookback-tbody").innerHTML = D.lookback.map((l) => {
    const d3 = (l.now - l.m3);
    const d1y = (l.now - l.y1);
    return `
      <tr>
        <td class="py-2 px-3 font-medium">${l.metric}</td>
        <td class="text-center font-mono">${l.now}</td>
        <td class="text-center text-slate-400">${l.m3}</td>
        <td class="text-center ${dColor(d3)}">${fmt(d3)}</td>
        <td class="text-center text-slate-400">${l.y1}</td>
        <td class="text-center ${dColor(d1y)}">${fmt(d1y)}</td>
        <td class="text-center"><span class="font-mono">${l.y5pct}%</span></td>
      </tr>
    `;
  }).join("");

  // ========== TAB 5: PREDICTIONS ==========
  const summary = PRED.summary(D.predictions);
  document.getElementById("pred-total").textContent = summary.total;
  document.getElementById("pred-settled").textContent = summary.settled;
  document.getElementById("pred-mywin").textContent = summary.myWin != null ? (summary.myWin * 100).toFixed(0) + "%" : "—";
  document.getElementById("pred-brier").textContent = summary.brier != null ? summary.brier.toFixed(3) : "—";

  // 来源对比
  const srcRows = PRED.bySource(D.predictions);
  document.getElementById("source-tbody").innerHTML = srcRows.map((r) => {
    const overTag = r.overConfidence > 0.1 ? '<span class="badge badge-red">严重</span>' :
                    r.overConfidence > 0.05 ? '<span class="badge badge-orange">偏高</span>' :
                    r.overConfidence < -0.05 ? '<span class="badge badge-yellow">保守</span>' :
                    '<span class="badge badge-green">健康</span>';
    return `
      <tr>
        <td class="py-2 px-3 font-medium">${r.source}</td>
        <td class="text-center">${r.n}</td>
        <td class="text-center font-bold ${r.winRate > 0.5 ? 'text-emerald-400' : 'text-red-400'}">${(r.winRate * 100).toFixed(0)}%</td>
        <td class="text-center text-slate-400">${(r.avgConf * 100).toFixed(0)}%</td>
        <td class="text-center font-mono">${r.brier.toFixed(3)}</td>
        <td class="text-center">${overTag}</td>
      </tr>
    `;
  }).join("");

  // 校准曲线
  const buckets = PRED.calibrationBuckets(D.predictions, 5);
  CHARTS.renderCalibrationCurve("calibChart", buckets);

  // Pending 列表
  const pending = D.predictions.filter((p) => p.status === "pending").sort((a, b) => a.deadline.localeCompare(b.deadline));
  const dirIcon = (d) => d > 0 ? '<span class="text-emerald-400">▲</span>' : d < 0 ? '<span class="text-red-400">▼</span>' : '<span class="text-slate-400">→</span>';
  document.getElementById("pending-tbody").innerHTML = pending.map((p) => `
    <tr>
      <td class="py-2 px-3 font-medium">${p.source}</td>
      <td>${p.asset}</td>
      <td class="text-center">${dirIcon(p.direction)}</td>
      <td class="text-center text-xs">${p.targetValue ?? p.targetRange ?? '—'}</td>
      <td class="text-center font-mono">${(p.confidence * 100).toFixed(0)}%</td>
      <td class="text-center text-xs text-slate-400">${p.deadline}</td>
      <td class="text-xs text-slate-300">${p.basis}</td>
    </tr>
  `).join("");

  // ========== TAB 6: BRIEF ==========
  const briefEl = document.getElementById("brief-content");
  const triggers = Object.entries(states).filter(([_, s]) => s.state === "trigger").map(([k]) => k);
  const warns = Object.entries(states).filter(([_, s]) => s.state === "warn").map(([k]) => k);
  briefEl.innerHTML = `
    <h2>🎯 一句话结论</h2>
    <p>主导情景为 <b class="text-orange-400">${dominantName}</b>（概率 ${dominantProb}%），
    美林时钟位于 <b class="text-cyan-400">${quadName}</b> 象限，综合 score <b>${result.compositeScore.toFixed(2)}</b>。
    ${triggers.length > 0 ? `当前 <b class="text-red-400">${triggers.length} 个信号触发</b>（${triggers.join('、')}），需高度警惕。` : '暂无触发信号。'}</p>

    <h2>📊 9 引擎闭环</h2>
    <ul>
      <li><b>L2-03 美林时钟</b>：${quadName}（ΔG ${merrill.payload.dG.toFixed(2)} / ΔI ${merrill.payload.dI.toFixed(2)}）</li>
      <li><b>L3-01 估值</b>：${result.engines["L3-01"].payload.tag}，CAPE 百分位 ${(result.engines["L3-01"].payload.capePct * 100).toFixed(0)}%</li>
      <li><b>L3-02 利率</b>：${result.engines["L3-02"].payload.stress} 紧度，2s10s ${result.engines["L3-02"].payload.curve2s10s}bp</li>
      <li><b>L3-03 信用</b>：${result.engines["L3-03"].payload.phase}，HY OAS ${result.engines["L3-03"].payload.hyOAS}bp</li>
      <li><b>L3-04 流动性</b>：${result.engines["L3-04"].payload.trend}，netLiq ${(result.engines["L3-04"].payload.netLiqYoY * 100).toFixed(1)}%</li>
      <li><b>L4-08 阈值</b>：${thr.triggers} 触发 / ${thr.warns} 预警 / ${thr.attentions} 关注</li>
    </ul>

    <h2>⚠️ 关键信号变化</h2>
    <ul>
      ${triggers.length ? `<li><b class="text-red-400">触发</b>：${triggers.join('、')}</li>` : ''}
      ${warns.length ? `<li><b class="text-orange-400">预警</b>：${warns.join('、')}</li>` : ''}
      <li><b class="text-yellow-400">距触发最近</b>：${result.nearest.map((n) => n.name).join('、')}</li>
    </ul>

    <h2>🎲 情景概率</h2>
    <ul>
      ${Object.entries(result.scenarios).sort((a, b) => b[1] - a[1]).map(([k, p]) =>
        `<li>${D.scenarioNames[k]} <code>${(p * 100).toFixed(1)}%</code> · 策略：${D.scenarioReturns[k].strategy}</li>`
      ).join('')}
    </ul>

    <h2>🎯 行动建议（基于主导情景）</h2>
    <p>当前主导情景为「${dominantName}」，对应策略：<b class="text-cyan-400">${D.scenarioReturns[result.dominant].strategy}</b></p>
    <ul>
      <li>SPX 预期：<code>${D.scenarioReturns[result.dominant].SPX}</code></li>
      <li>US10Y 预期：<code>${D.scenarioReturns[result.dominant].US10Y}</code></li>
      <li>Gold 预期：<code>${D.scenarioReturns[result.dominant].Gold}</code></li>
      <li>BTC 预期：<code>${D.scenarioReturns[result.dominant].BTC}</code></li>
    </ul>

    <h2>🔍 校准能力</h2>
    <p>已结算 ${summary.settled} 条预测。我的胜率 <b class="text-emerald-400">${summary.myWin != null ? (summary.myWin * 100).toFixed(0) + '%' : '—'}</b>，
    Brier <b>${summary.brier != null ? summary.brier.toFixed(3) : '—'}</b>
    （桥水 0.18 / GS 0.22 作参照）。</p>

    <p class="text-xs text-slate-500 mt-4">数据时点：${D.asOf} · 引擎版本：${D.dataVersion} · 仅供研究，非投资建议</p>
  `;
})();
