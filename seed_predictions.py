"""一键导入 5 条 seed 预测，验证 L5 完整流程"""
from datetime import datetime, timedelta
from prediction_register import append_row

today = datetime.now()


SEEDS = [
    {
        "source": "我",
        "asset": "SPX",
        "direction": -1,
        "target_value": "",
        "target_range": "",
        "deadline": (today + timedelta(days=180)).date().isoformat(),
        "horizon_days": 180,
        "confidence": 0.65,
        "basis": "ERP 已为负 + CAPE 36.5 接近触发线 38 + Sahm 0.35 升势",
        "basis_engines": "L3-01,L4-08,L2-03",
        "notes": "M-AllWeather-Brain seed",
    },
    {
        "source": "IMF",
        "asset": "Global_GDP_2026",
        "direction": 0,
        "target_value": 3.2,
        "target_range": "",
        "deadline": "2026-12-31",
        "horizon_days": (datetime(2026,12,31) - today).days,
        "confidence": 0.55,
        "basis": "IMF WEO 2026/04",
        "basis_engines": "",
        "notes": "IMF April 2026 outlook",
    },
    {
        "source": "Fed",
        "asset": "FFR_2026Q4",
        "direction": -1,
        "target_value": 3.875,
        "target_range": "3.50~4.25",
        "deadline": "2026-12-31",
        "horizon_days": (datetime(2026,12,31) - today).days,
        "confidence": 0.50,
        "basis": "Fed 点阵图 中位数 (median dot)",
        "basis_engines": "L4-03",
        "notes": "Fed Dot Plot 2026/03 SEP",
    },
    {
        "source": "GS",
        "asset": "SPX_YE2026",
        "direction": 1,
        "target_value": 6500,
        "target_range": "",
        "deadline": "2026-12-31",
        "horizon_days": (datetime(2026,12,31) - today).days,
        "confidence": 0.55,
        "basis": "GS 2026 outlook · Kostin",
        "basis_engines": "",
        "notes": "GS 2026 year-end target",
    },
    {
        "source": "我",
        "asset": "Recession_2026",
        "direction": 1,
        "target_value": "",
        "target_range": "",
        "deadline": "2026-12-31",
        "horizon_days": (datetime(2026,12,31) - today).days,
        "confidence": 0.40,
        "basis": "Sahm 0.35 持续上升 + 2s10s 倒挂 + 信用脉冲减速",
        "basis_engines": "L2-04,L4-01,L3-03",
        "notes": "事件型预测：2026 内 NBER 宣布衰退",
    },
]


if __name__ == "__main__":
    import sys, io
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True)
    for s in SEEDS:
        append_row(s)
    print(f"\n[seeded] {len(SEEDS)} predictions")
