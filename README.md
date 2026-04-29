# AllWeather-Brain

> 机构级宏观全天候大脑 · 代码层
> Vault 文档：`C:\Users\Danny\OneDrive\Apps\remotely-save\a\Projects\M-AllWeather-Brain\_地图.md`

## 文件清单

```
data_aggregator.py     # L1: 多源数据拉取 → DuckDB
ratio_calculator.py    # L1: 派生比率计算
signals_calculator.py  # L1: 信号阈值判定
axiom_types.py         # L2: 统一 EngineOutput 数据类型
axiom_registry.py      # L2: 引擎注册表 + reliability 配置
axiom_engines.py       # L2: 9 引擎 MVP 实现
prediction_register.py # L5: 预测登记（YAML/交互式）
prediction_settler.py  # L5: 到期自动结算
calibration_report.py  # L5: 校准曲线 + Brier 报告
brief_generator.py     # L4: 每日早盘简报
config.py              # 配置：路径 + API Key
```

## 数据库

DuckDB 文件：`./data/allweather.duckdb`
预测 CSV：`C:\Users\Danny\OneDrive\Apps\remotely-save\a\Topics\经济投资\3_Projects\预测核对系统\prediction_log.csv`

## 安装

```bash
pip install duckdb pandas yfinance fredapi ccxt feedparser python-dotenv pyyaml
```

## 每日 cron

```
07:00  python data_aggregator.py --full
07:05  python ratio_calculator.py
07:10  python signals_calculator.py
07:15  python prediction_settler.py
07:20  python axiom_engines.py --run
07:25  python brief_generator.py
07:30  推送到 Vault + 邮件 + Telegram
```

## 与 Vault 的关系

- 代码：本目录（OneDrive\PythonScripts）
- 文档/规格/数据：Vault 内
- 输出：写到 Vault 的 `Topics/经济投资/4_Outputs/` 和 `Topics/经济投资/3_Projects/预测核对系统/`
