# 🧠 AllWeather Brain · 机构级宏观全天候大脑

> 基于 AXIOM 7 层 38 引擎框架的全天候宏观分析 + 预测核对回路 · 个人投研驾驶舱

**Live Demo**: 部署到 Cloudflare Pages 后填入

---

## ✨ 核心功能（6 大 Tab）

| Tab | 功能 | 后端引擎 |
|---|---|---|
| ① 现状 | 4 KPI + 9 引擎卡 + 美林时钟 | L2-03 / L3-01~04 / L4-08 / L6-01 |
| ② 信号灯 | 9 信号阈值矩阵（关注/预警/触发） | L4-08 |
| ③ 情景概率 | 4 情景贝叶斯融合 + 资产策略矩阵 | L6-01 / L6-03 |
| ④ 仪表盘 | 5 大资产 + 历史回看 | L4-07 |
| ⑤ 预测核对 ★ | Brier / 校准曲线 / 来源对比 / 9 类错因 | L5 |
| 📰 简报 | 一句话结论 + 关键变化 + 行动建议 | L4 简报层 |

---

## 🛠 技术栈

- **纯静态**：HTML + Tailwind CDN + Chart.js（无 build）
- **JS 端 AXIOM 引擎**：`web/js/axiom.js`（mirror of Python `axiom_engines.py`）
- **数据**：`web/js/data.js`（demo），未来接 `data/snapshot.json`

---

## 📁 文件结构

```
web/
├── index.html       6 tab 单页
├── css/style.css    Tailwind @apply 工具类
└── js/
    ├── data.js          DEMO 数据（替换为 fetch 真实数据）
    ├── axiom.js         9 引擎 JS 实现
    ├── charts.js        Chart.js 渲染器
    ├── predictions.js   L5 校准统计
    └── app.js           主入口 / DOM 渲染 / Tab 切换
```

---

## 🚀 本地运行

```bash
# 任意静态服务器
cd web
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

---

## 🌍 Cloudflare Pages 部署

1. Fork / push 到 GitHub
2. Cloudflare Pages → Create project → 连接 GitHub
3. **Build output directory**: `web`
4. Build command: 留空
5. Deploy → 几秒后获得 `*.pages.dev` 链接

---

## 🔄 数据更新流程（接真实 API）

后端 Python 脚本（`../axiom_engines.py` + `../data_aggregator.py`）每日跑一次：

```bash
py axiom_engines.py > web/data/snapshot.json
```

前端 `data.js` 改为：
```js
fetch('./data/snapshot.json').then(r => r.json()).then(d => { window.DEMO_DATA = d; init(); });
```

---

## 📐 AXIOM 框架

| 层 | 职责 |
|---|---|
| L0 | Regime 检测 / 元层 |
| L1 | 数据聚合 + 历史回看 |
| L2 | 框架（美林时钟 / Sahm 规则） |
| L3 | 模型（估值 / 利率 / 信用 / 流动性） |
| L4 | 决策（资产快照 / 阈值 / 简报） |
| L5 | 预测核对回路（Brier / 9 类错因） |
| L6 | 顶层概率融合 / 贝叶斯归因 |

MVP-9 引擎闭环：L1-02 / L2-03 / L3-01 / L3-02 / L3-03 / L3-04 / L4-08 / L5-01 / L6-01 / L6-03

---

## ⚠️ 免责声明

数据为 demo 演示，非投资建议。
