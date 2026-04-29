// charts.js — Chart.js 渲染器集合
(function (global) {
  "use strict";

  // 通用主题
  Chart.defaults.color = "#94a3b8";
  Chart.defaults.borderColor = "#1e293b";
  Chart.defaults.font.family = "ui-sans-serif, system-ui";

  // ========== 美林时钟（散点图 4 象限）==========
  function renderMerrillClock(canvasId, dG, dI) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    return new Chart(ctx, {
      type: "scatter",
      data: {
        datasets: [
          {
            label: "当前位置",
            data: [{ x: dG, y: dI }],
            backgroundColor: "#06b6d4",
            pointRadius: 10,
            pointHoverRadius: 12,
            borderColor: "#67e8f9",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            title: { display: true, text: "ΔGDP（增长加速 →）" },
            min: -3, max: 3,
            grid: { color: "#1e293b" },
          },
          y: {
            title: { display: true, text: "ΔCPI（通胀加速 ↑）" },
            min: -3, max: 3,
            grid: { color: "#1e293b" },
          },
        },
      },
      plugins: [
        {
          id: "quadrants",
          beforeDraw(chart) {
            const { ctx, chartArea: { left, right, top, bottom }, scales: { x, y } } = chart;
            const cx = x.getPixelForValue(0);
            const cy = y.getPixelForValue(0);
            ctx.save();
            ctx.fillStyle = "rgba(16,185,129,0.06)";
            ctx.fillRect(cx, top, right - cx, cy - top); // 复苏 ↑G ↓I (右上其实是过热)
            ctx.fillStyle = "rgba(245,158,11,0.06)";
            ctx.fillRect(cx, cy, right - cx, bottom - cy);
            ctx.fillStyle = "rgba(239,68,68,0.06)";
            ctx.fillRect(left, cy, cx - left, bottom - cy);
            ctx.fillStyle = "rgba(59,130,246,0.06)";
            ctx.fillRect(left, top, cx - left, cy - top);
            ctx.fillStyle = "#64748b";
            ctx.font = "11px sans-serif";
            ctx.fillText("过热 ↑G ↑I", cx + 8, top + 14);
            ctx.fillText("滞胀 ↓G ↑I", left + 8, top + 14);
            ctx.fillText("衰退 ↓G ↓I", left + 8, bottom - 6);
            ctx.fillText("复苏 ↑G ↓I", cx + 8, bottom - 6);
            ctx.restore();
          },
        },
      ],
    });
  }

  // ========== 情景概率柱状图 ==========
  function renderScenarioBars(canvasId, scenarios, names) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const labels = Object.keys(scenarios).map((k) => names[k] || k);
    const data = Object.values(scenarios).map((v) => +(v * 100).toFixed(1));
    const colors = ["#10b981", "#ef4444", "#f59e0b", "#a855f7"];
    return new Chart(ctx, {
      type: "bar",
      data: { labels, datasets: [{ data, backgroundColor: colors }] },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.parsed.x}%` } } },
        scales: {
          x: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + "%" }, grid: { color: "#1e293b" } },
          y: { grid: { display: false } },
        },
      },
    });
  }

  // ========== 三维信号雷达 ==========
  function renderDimRadar(canvasId, engOut) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    // 把 score 映射到 0-100
    const v = (s) => Math.round((s + 1) * 50);
    return new Chart(ctx, {
      type: "radar",
      data: {
        labels: ["增长", "通胀", "估值", "利率紧度", "信用", "流动性"],
        datasets: [
          {
            label: "当前",
            data: [
              v(engOut.engines["L2-03"].payload.dG > 0 ? 0.5 : -0.5),
              v(engOut.engines["L2-03"].payload.dI > 0 ? 0.5 : -0.5),
              v(engOut.engines["L3-01"].score),
              v(-engOut.engines["L3-02"].score),
              v(engOut.engines["L3-03"].score),
              v(engOut.engines["L3-04"].score),
            ],
            backgroundColor: "rgba(6,182,212,0.2)",
            borderColor: "#06b6d4",
            pointBackgroundColor: "#06b6d4",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            min: 0, max: 100,
            ticks: { display: false },
            grid: { color: "#1e293b" },
            angleLines: { color: "#1e293b" },
            pointLabels: { color: "#94a3b8", font: { size: 11 } },
          },
        },
      },
    });
  }

  // ========== 校准曲线 ==========
  function renderCalibrationCurve(canvasId, buckets) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const labels = buckets.map((b) => (b.bucket * 100).toFixed(0) + "%");
    const actual = buckets.map((b) => +(b.actual * 100).toFixed(1));
    const ideal = buckets.map((b) => (b.bucket * 100).toFixed(0));
    return new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "理想（完美校准）", data: ideal, borderColor: "#64748b", borderDash: [5, 5], pointRadius: 0, tension: 0 },
          { label: "实际", data: actual, borderColor: "#06b6d4", backgroundColor: "rgba(6,182,212,0.2)", tension: 0.2, pointRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
        scales: {
          x: { title: { display: true, text: "声明置信度 →" }, grid: { color: "#1e293b" } },
          y: { min: 0, max: 100, title: { display: true, text: "实际命中率 (%)" }, grid: { color: "#1e293b" } },
        },
      },
    });
  }

  global.CHARTS = { renderMerrillClock, renderScenarioBars, renderDimRadar, renderCalibrationCurve };
})(window);
