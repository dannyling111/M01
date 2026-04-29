"""L5 预测结算：到期自动取实际值 → 计算 hit/miss → 回写 CSV"""
import csv
from datetime import datetime, date
from pathlib import Path
import duckdb
from config import PREDICTION_CSV, DUCKDB_PATH

CSV_HEADER = [
    "id", "created_at", "source", "asset", "direction",
    "target_value", "target_range", "deadline", "horizon_days",
    "confidence", "basis", "basis_engines",
    "status", "settled_at", "actual_value", "hit",
    "error_tag", "error_note", "notes",
]


def get_actual(con, symbol: str, deadline_str: str) -> float | None:
    """从 DuckDB timeseries 取 deadline 当日（或最接近）的值"""
    try:
        d = datetime.fromisoformat(deadline_str).date()
    except Exception:
        return None
    row = con.execute("""
        SELECT value FROM timeseries
        WHERE symbol = ? AND ts <= ?
        ORDER BY ts DESC LIMIT 1
    """, [symbol, d]).fetchone()
    return row[0] if row else None


def get_baseline(con, symbol: str, created_at: str) -> float | None:
    try:
        d = datetime.fromisoformat(created_at).date()
    except Exception:
        return None
    row = con.execute("""
        SELECT value FROM timeseries
        WHERE symbol = ? AND ts <= ?
        ORDER BY ts DESC LIMIT 1
    """, [symbol, d]).fetchone()
    return row[0] if row else None


def compute_hit(pred: dict, actual: float, baseline: float | None) -> float:
    direction = int(pred.get("direction") or 0)
    target_value = pred.get("target_value")
    target_range = pred.get("target_range")

    # 1. 区间预测
    if target_range:
        try:
            low, high = [float(x) for x in str(target_range).split("~")]
            return 1.0 if low <= actual <= high else 0.0
        except Exception:
            pass

    # 2. 点位预测
    if target_value not in (None, "", "None"):
        tv = float(target_value)
        diff = abs(actual - tv) / max(abs(tv), 1e-6)
        if diff < 0.05:
            return 1.0
        elif diff < 0.10:
            return 0.5
        else:
            return 0.0

    # 3. 方向预测
    if baseline is None:
        return 0.5  # 无基线，无法判定
    actual_dir = 1 if actual > baseline else (-1 if actual < baseline else 0)
    if direction == 0:
        # 横盘：变化 < 2%
        return 1.0 if abs(actual - baseline) / abs(baseline) < 0.02 else 0.0
    return 1.0 if actual_dir == direction else 0.0


def run():
    p = Path(PREDICTION_CSV)
    if not p.exists():
        print(f"[skip] {p} not found")
        return

    rows = list(csv.DictReader(open(p, encoding="utf-8")))
    if not rows:
        print("[skip] empty")
        return

    con = duckdb.connect(str(DUCKDB_PATH))
    today = date.today()
    settled, missed_data = 0, 0

    for r in rows:
        if r.get("status") != "pending":
            continue
        try:
            d = datetime.fromisoformat(r["deadline"]).date()
        except Exception:
            continue
        if d > today:
            continue

        actual = get_actual(con, r["asset"], r["deadline"])
        if actual is None:
            missed_data += 1
            continue

        baseline = get_baseline(con, r["asset"], r["created_at"])
        try:
            hit = compute_hit(r, actual, baseline)
        except Exception as e:
            print(f"  ! settle error {r['id']}: {e}")
            continue

        r["status"] = "settled"
        r["settled_at"] = datetime.now().isoformat()
        r["actual_value"] = actual
        r["hit"] = hit
        settled += 1
        flag = "✓" if hit >= 0.5 else "✗"
        print(f"  {flag} {r['source']:8} {r['asset']:8} dir={r['direction']:+} actual={actual:.2f} hit={hit}")

    con.close()

    # 回写
    with open(p, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=CSV_HEADER)
        w.writeheader()
        w.writerows(rows)

    print(f"\n[done] settled={settled}, missing_data={missed_data}")


if __name__ == "__main__":
    run()
