"""L5 校准曲线 + Brier 报告 → 输出 markdown 到 Vault"""
import csv
from collections import defaultdict
from datetime import datetime, date, timedelta
from pathlib import Path
from config import PREDICTION_CSV, VAULT_ROOT

OUT_PATH = VAULT_ROOT / "Topics" / "经济投资" / "3_Projects" / "预测核对系统" / "校准曲线_最新.md"


def safe_float(x):
    try:
        return float(x)
    except Exception:
        return None


def run():
    rows = list(csv.DictReader(open(PREDICTION_CSV, encoding="utf-8")))
    settled = [r for r in rows if r.get("status") == "settled"]
    if not settled:
        OUT_PATH.write_text("# 校准曲线\n\n暂无 settled 记录。\n", encoding="utf-8")
        print("[empty] 暂无 settled 数据")
        return

    # 按 source 聚合
    by_source = defaultdict(list)
    for r in settled:
        h = safe_float(r.get("hit"))
        c = safe_float(r.get("confidence"))
        if h is None or c is None:
            continue
        by_source[r["source"]].append((c, h))

    lines = ["---", "type: report", "auto_generated: true",
             f"updated: {datetime.now().isoformat()}", "---", "", "# 校准曲线 · 最新", ""]
    lines.append("## 各来源胜率对比")
    lines.append("")
    lines.append("| 来源 | n | 胜率 | 平均置信度 | Brier | 过度自信 |")
    lines.append("|------|---|------|-----------|-------|----------|")

    for src, data in sorted(by_source.items(), key=lambda kv: -len(kv[1])):
        n = len(data)
        win_rate = sum(h for _, h in data) / n
        avg_conf = sum(c for c, _ in data) / n
        brier = sum((c - h) ** 2 for c, h in data) / n
        overconf = avg_conf - win_rate
        lines.append(
            f"| {src} | {n} | {win_rate:.1%} | {avg_conf:.1%} | {brier:.3f} | {overconf:+.1%} |"
        )

    lines.append("")
    lines.append("## 校准分箱（10 桶）")
    lines.append("")
    lines.append("| 置信度桶 | n | 实际命中率 | 偏差 |")
    lines.append("|---------|---|-----------|------|")

    all_data = [pt for pts in by_source.values() for pt in pts]
    buckets = defaultdict(list)
    for c, h in all_data:
        b = round(c * 10) / 10
        buckets[b].append(h)
    for b in sorted(buckets):
        n = len(buckets[b])
        actual = sum(buckets[b]) / n
        lines.append(f"| {b:.0%} | {n} | {actual:.1%} | {actual - b:+.1%} |")

    lines.append("")
    lines.append("## 错因分布（最近 365 天）")
    lines.append("")
    cutoff = date.today() - timedelta(days=365)
    error_dist = defaultdict(int)
    for r in settled:
        try:
            sd = datetime.fromisoformat(r.get("settled_at", "")).date()
            if sd < cutoff:
                continue
        except Exception:
            continue
        h = safe_float(r.get("hit"))
        if h is None or h >= 0.5:
            continue
        tag = (r.get("error_tag") or "未归因").split(",")[0].strip()
        error_dist[tag] += 1

    if error_dist:
        lines.append("| 错因 | 次数 |")
        lines.append("|------|-----|")
        ERROR_NAMES = {
            "1": "数据错误", "2": "模型失效", "3": "时间错位",
            "4": "幅度错估", "5": "黑天鹅", "6": "政策超预期",
            "7": "拥挤交易", "8": "因果误判", "9": "认知偏误",
            "未归因": "未归因",
        }
        for tag, n in sorted(error_dist.items(), key=lambda kv: -kv[1]):
            lines.append(f"| {tag} · {ERROR_NAMES.get(tag, '?')} | {n} |")
    else:
        lines.append("暂无 miss 记录或全部已正确归因。")

    lines.append("")
    lines.append("---")
    lines.append("> 详见 [[Topics/经济投资/3_Projects/预测核对系统/校准方法论]]")

    OUT_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"[done] {OUT_PATH}")


if __name__ == "__main__":
    run()
