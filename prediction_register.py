"""L5 预测登记：YAML / 交互式 → 追加到 prediction_log.csv"""
import argparse
import csv
import uuid
from datetime import datetime
from pathlib import Path
from config import PREDICTION_CSV

try:
    import yaml
except ImportError:
    yaml = None

CSV_HEADER = [
    "id", "created_at", "source", "asset", "direction",
    "target_value", "target_range", "deadline", "horizon_days",
    "confidence", "basis", "basis_engines",
    "status", "settled_at", "actual_value", "hit",
    "error_tag", "error_note", "notes",
]


def ensure_csv():
    p = Path(PREDICTION_CSV)
    p.parent.mkdir(parents=True, exist_ok=True)
    if not p.exists() or p.stat().st_size == 0:
        with open(p, "w", encoding="utf-8", newline="") as f:
            csv.writer(f).writerow(CSV_HEADER)


def append_row(row: dict):
    ensure_csv()
    full = {h: "" for h in CSV_HEADER}
    full.update(row)
    full["id"] = full.get("id") or str(uuid.uuid4())
    full["created_at"] = full.get("created_at") or datetime.now().isoformat()
    full["status"] = full.get("status") or "pending"
    if full.get("deadline") and not full.get("horizon_days"):
        try:
            d = datetime.fromisoformat(str(full["deadline"]))
            full["horizon_days"] = (d - datetime.now()).days
        except Exception:
            pass

    with open(PREDICTION_CSV, "a", encoding="utf-8", newline="") as f:
        csv.DictWriter(f, fieldnames=CSV_HEADER).writerow(full)
    print(f"[ok] registered: {full['source']} | {full['asset']} | {full['direction']:+d} → {full['deadline']}")
    return full["id"]


def from_yaml(path: str):
    if yaml is None:
        raise ImportError("PyYAML 未安装 → pip install PyYAML")
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    if isinstance(data, list):
        for d in data:
            append_row(d)
    else:
        append_row(data)


def interactive():
    print("=== 预测登记 · 交互式 ===")
    row = {}
    row["source"] = input("来源 (我/IMF/Fed/GS/...): ").strip() or "我"
    row["asset"] = input("资产 (SPX/NDX/US10Y/...): ").strip()
    row["direction"] = int(input("方向 (+1/-1/0): ").strip() or 0)
    tv = input("目标值（数值预测，留空跳过）: ").strip()
    row["target_value"] = float(tv) if tv else ""
    tr = input("目标区间（如 5300~5500，留空跳过）: ").strip()
    row["target_range"] = tr
    row["deadline"] = input("到期日 (YYYY-MM-DD): ").strip()
    row["confidence"] = float(input("置信度 [0-1]: ").strip() or 0.6)
    row["basis"] = input("依据简述: ").strip()
    row["basis_engines"] = input("AXIOM 引擎ID（逗号分隔，可空）: ").strip()
    row["notes"] = input("备注（链接到日报等）: ").strip()
    return append_row(row)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--yaml", help="从 YAML 文件批量导入")
    parser.add_argument("--interactive", action="store_true")
    args = parser.parse_args()

    if args.yaml:
        from_yaml(args.yaml)
    elif args.interactive:
        interactive()
    else:
        print("usage: --yaml <file> | --interactive")
