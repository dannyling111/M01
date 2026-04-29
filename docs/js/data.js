// data.js — Demo 数据（之后接真实 API 时替换为 fetch('./data/snapshot.json')）

window.DEMO_DATA = {
  asOf: "2026-04-29",
  dataVersion: "demo-v1.0",

  // === 宏观时序（最近 12 个月 YoY）===
  gdpYoY:  [2.8, 2.7, 2.5, 2.4, 2.3, 2.2, 2.1, 2.0, 1.9, 1.9, 1.9, 1.9],
  cpiYoY:  [3.5, 3.4, 3.3, 3.3, 3.2, 3.1, 3.0, 3.0, 2.9, 2.9, 2.8, 2.8],

  // === 估值（含 100 年历史采样供百分位计算）===
  cape:    36.5,
  erp:    -0.35,
  buffett: 114,
  capeHistory:    [10, 12, 15, 18, 20, 22, 25, 28, 30, 32, 35, 36, 40, 42, 45],
  erpHistory:     [-2, -1, 0, 1, 2, 3, 4, 5, 6],
  buffettHistory: [50, 60, 70, 80, 100, 110, 120, 130, 140, 150],

  // === 利率 & 流动性 ===
  realRate:      0.93,
  curve_2s10s:   40,    // bp
  move:          95,
  netLiqYoY:    -0.02,
  m2YoY:         4.6,

  // === 信用 ===
  creditImpulse: 0.3,
  hyOAS:         300,

  // === L4-08 信号当前值 ===
  signals: {
    CAPE:     36.5,
    ERP:     -0.35,
    "2s10s":  40,
    AuOil:    66.3,
    MOVE_VIX: 6.3,
    Sahm:     0.35,
    HY_OAS:   300,
    "5Y5Y":   2.26,
    ISM_PMI:  49.3,
  },

  // 信号说明
  signalDescriptions: {
    CAPE:     "Shiller P/E · 极端高估警示",
    ERP:      "股权风险溢价 · 持有现金优于股票",
    "2s10s":  "2-10 年利差 · 倒挂=衰退 12-18m 预警",
    AuOil:    "金/油比 · 极端避险信号",
    MOVE_VIX: "债市/股市波动比 · 债市先知",
    Sahm:     "Sahm 失业率规则 · 衰退确认",
    HY_OAS:   "HY 信用利差 · 信用事件预警",
    "5Y5Y":   "5Y5Y 通胀预期 · 锚定状态",
    ISM_PMI:  "制造业 PMI · 50 荣枯线",
  },

  // === 5 大资产快照 ===
  assets: [
    { sym: "SPX",   name: "S&P 500",       price: 5310,  d1: 0.4,  m1: -1.2, y1: 12.3, pct5y: 92, valuation: "高估" },
    { sym: "US10Y", name: "10Y Treasury",  price: 4.42,  d1: -0.02,m1: 0.15, y1: -0.30,pct5y: 78, valuation: "中性" },
    { sym: "Gold",  name: "Gold",          price: 3320,  d1: 0.8,  m1: 4.5,  y1: 22.1, pct5y: 98, valuation: "极端" },
    { sym: "DXY",   name: "USD Index",     price: 99.2,  d1: -0.1, m1: -2.3, y1: -3.1, pct5y: 45, valuation: "中性" },
    { sym: "BTC",   name: "Bitcoin",       price: 92500, d1: 1.2,  m1: -3.8, y1: 38.5, pct5y: 88, valuation: "高估" },
  ],

  // === 历史回看 ===
  lookback: [
    { metric: "CAPE",      now: 36.5, m3: 35.2, y1: 32.1, y5pct: 95 },
    { metric: "ERP",       now: -0.35,m3: 0.1,  y1: 1.2,  y5pct: 8 },
    { metric: "2s10s (bp)",now: 40,   m3: -10,  y1: -50,  y5pct: 65 },
    { metric: "金油比",     now: 66.3, m3: 58.4, y1: 42.1, y5pct: 96 },
    { metric: "VIX",       now: 15,   m3: 18,   y1: 22,   y5pct: 22 },
    { metric: "HY OAS (bp)",now: 300, m3: 320,  y1: 380,  y5pct: 30 },
    { metric: "Sahm",      now: 0.35, m3: 0.28, y1: 0.18, y5pct: 80 },
    { metric: "ISM PMI",   now: 49.3, m3: 50.2, y1: 51.5, y5pct: 28 },
  ],

  // === 各情景下资产预期收益区间（年化）===
  scenarioReturns: {
    soft_landing:  { SPX: "+8 ~ +18%", US10Y: "+2 ~ +6%",  Gold: "-2 ~ +5%",  DXY: "-2 ~ +3%", BTC: "+15 ~ +60%", strategy: "60/40 基准 + 偏多周期" },
    recession:     { SPX: "-25 ~ -10%",US10Y: "+8 ~ +15%", Gold: "+5 ~ +20%", DXY: "+3 ~ +8%", BTC: "-40 ~ -10%", strategy: "降股 + 加长债 + 防御股" },
    reflation:     { SPX: "+5 ~ +15%", US10Y: "-3 ~ +2%",  Gold: "+8 ~ +25%", DXY: "-5 ~ -1%", BTC: "+20 ~ +80%", strategy: "加商品 + 周期股 + 加密" },
    stagflation:   { SPX: "-15 ~ -5%", US10Y: "-5 ~ +3%",  Gold: "+15 ~ +35%",DXY: "0 ~ +5%",  BTC: "-20 ~ +20%", strategy: "黄金 + 现金 + 短债" },
  },

  scenarioNames: {
    soft_landing: "软着陆",
    recession: "周期衰退",
    reflation: "再通胀",
    stagflation: "硬着陆/滞胀",
  },

  // === L5 预测样本（与 vault CSV 一致）===
  predictions: [
    {
      id: "pred-1", source: "我", asset: "SPX", direction: -1,
      targetValue: null, targetRange: null,
      deadline: "2026-10-26", confidence: 0.65, status: "pending",
      basis: "ERP 负 + CAPE 36.5 接近 38 + Sahm 0.35 升势",
      basisEngines: "L3-01,L4-08,L2-03",
    },
    {
      id: "pred-2", source: "IMF", asset: "Global GDP 2026", direction: 0,
      targetValue: 3.2, targetRange: null,
      deadline: "2026-12-31", confidence: 0.55, status: "pending",
      basis: "IMF WEO 2026/04",
    },
    {
      id: "pred-3", source: "Fed", asset: "FFR 2026Q4", direction: -1,
      targetValue: 3.875, targetRange: "3.50~4.25",
      deadline: "2026-12-31", confidence: 0.50, status: "pending",
      basis: "Fed Dot Plot 中位数",
      basisEngines: "L4-03",
    },
    {
      id: "pred-4", source: "GS", asset: "SPX YE 2026", direction: 1,
      targetValue: 6500, targetRange: null,
      deadline: "2026-12-31", confidence: 0.55, status: "pending",
      basis: "GS 2026 outlook · Kostin",
    },
    {
      id: "pred-5", source: "我", asset: "Recession 2026", direction: 1,
      targetValue: null, targetRange: null,
      deadline: "2026-12-31", confidence: 0.40, status: "pending",
      basis: "Sahm 升 + 2s10s 倒挂史 + 信用脉冲减速",
      basisEngines: "L2-04,L4-01,L3-03",
    },
    // 历史 settled 样例（用于校准曲线 + 胜率）
    {id:"h1", source:"我",   asset:"SPX",   direction:-1, deadline:"2025-10-01", confidence:0.70, status:"settled", hit:1, errorTag:null},
    {id:"h2", source:"我",   asset:"NDX",   direction:+1, deadline:"2025-08-01", confidence:0.60, status:"settled", hit:0, errorTag:"3"},
    {id:"h3", source:"我",   asset:"Gold",  direction:+1, deadline:"2025-12-01", confidence:0.80, status:"settled", hit:1, errorTag:null},
    {id:"h4", source:"我",   asset:"BTC",   direction:+1, deadline:"2025-06-01", confidence:0.65, status:"settled", hit:1, errorTag:null},
    {id:"h5", source:"我",   asset:"DXY",   direction:-1, deadline:"2025-11-01", confidence:0.55, status:"settled", hit:0, errorTag:"4"},
    {id:"h6", source:"IMF",  asset:"GDP",   direction:0,  deadline:"2024-12-31", confidence:0.55, status:"settled", hit:0, errorTag:"1"},
    {id:"h7", source:"IMF",  asset:"GDP",   direction:0,  deadline:"2023-12-31", confidence:0.55, status:"settled", hit:1, errorTag:null},
    {id:"h8", source:"IMF",  asset:"通胀",  direction:-1, deadline:"2024-06-30", confidence:0.65, status:"settled", hit:0, errorTag:"6"},
    {id:"h9", source:"Fed",  asset:"FFR",   direction:-1, deadline:"2024-12-31", confidence:0.70, status:"settled", hit:0, errorTag:"6"},
    {id:"h10",source:"Fed",  asset:"FFR",   direction:-1, deadline:"2025-09-30", confidence:0.65, status:"settled", hit:1, errorTag:null},
    {id:"h11",source:"GS",   asset:"SPX",   direction:+1, deadline:"2024-12-31", confidence:0.60, status:"settled", hit:1, errorTag:null},
    {id:"h12",source:"GS",   asset:"SPX",   direction:+1, deadline:"2023-12-31", confidence:0.55, status:"settled", hit:0, errorTag:"4"},
    {id:"h13",source:"GS",   asset:"US10Y", direction:-1, deadline:"2024-06-30", confidence:0.50, status:"settled", hit:0, errorTag:"6"},
  ],
};
