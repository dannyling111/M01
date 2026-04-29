"""AXIOM 9 引擎 MVP 实现"""
from datetime import datetime
from axiom_types import EngineOutput, Evidence, clamp, sign, percentile_rank
from axiom_registry import reliability, ENGINES


# ---------- L1-02 时间框架 ----------
def pick_horizon(user_cfg: dict) -> EngineOutput:
    horizon = user_cfg.get("horizon", "strategic")
    return EngineOutput(
        engine_id="L1-02",
        timestamp=datetime.now(),
        state=f"horizon={horizon}",
        score=0.0,
        direction=0,
        confidence=1.0,
        reliability=reliability("L1-02"),
        time_horizon=horizon,
    )


# ---------- L2-03 美林时钟 ----------
def merrill_clock(gdp_yoy_recent: list[float], cpi_yoy_recent: list[float]) -> EngineOutput:
    """gdp_yoy_recent / cpi_yoy_recent: 最近 12 个月的 YoY 序列"""
    g_slope = (gdp_yoy_recent[-1] - gdp_yoy_recent[0]) / max(1, len(gdp_yoy_recent))
    i_slope = (cpi_yoy_recent[-1] - cpi_yoy_recent[0]) / max(1, len(cpi_yoy_recent))

    if g_slope > 0 and i_slope < 0:
        state, score = "复苏", 0.6
    elif g_slope > 0 and i_slope > 0:
        state, score = "过热", 0.2
    elif g_slope < 0 and i_slope > 0:
        state, score = "滞胀", -0.5
    else:
        state, score = "衰退", -0.7

    return EngineOutput(
        engine_id="L2-03",
        timestamp=datetime.now(),
        state=state,
        score=score,
        direction=sign(score),
        confidence=0.7,
        reliability=reliability("L2-03"),
        time_horizon="strategic",
        evidence=[
            Evidence("GDP_slope", g_slope),
            Evidence("CPI_slope", i_slope),
        ],
        invalidation="若 12M MA 斜率方向改变，重判象限",
    )


# ---------- L3-01 估值均值回归 ----------
def valuation_mean_reversion(cape: float, erp: float, buffett: float,
                              cape_history: list[float],
                              erp_history: list[float],
                              buffett_history: list[float]) -> EngineOutput:
    cape_pct = percentile_rank(cape, cape_history)
    erp_pct = percentile_rank(erp, erp_history)
    buffett_pct = percentile_rank(buffett, buffett_history)
    avg_pct = (cape_pct + (1 - erp_pct) + buffett_pct) / 3
    score = -2 * (avg_pct - 0.5)

    if avg_pct > 0.9:
        state = "极度高估"
    elif avg_pct > 0.7:
        state = "高估"
    elif avg_pct > 0.3:
        state = "正常"
    else:
        state = "低估"

    return EngineOutput(
        engine_id="L3-01",
        timestamp=datetime.now(),
        state=state,
        score=clamp(score),
        direction=sign(score),
        confidence=0.85,  # 估值是物理定律级
        reliability=reliability("L3-01"),
        time_horizon="structural",
        asset_scope=["SPX", "NDX"],
        evidence=[
            Evidence("CAPE", cape, cape_pct, threshold=38),
            Evidence("ERP", erp, erp_pct, threshold=0),
            Evidence("Buffett", buffett, buffett_pct, threshold=120),
        ],
        invalidation="若 CAPE > 50 持续 12 月，重新评估 regime（结构断裂）",
    )


# ---------- L3-02 利率-资产机制 ----------
def rate_regime(real_rate: float, curve_2s10s_bp: float, move_idx: float) -> EngineOutput:
    score = 0.0
    notes = []

    if curve_2s10s_bp < -50:
        state = "深度倒挂"
        score -= 0.6
        notes.append("曲线深度倒挂，衰退预警 12-18m")
    elif curve_2s10s_bp < 0:
        state = "倒挂"
        score -= 0.3
    elif curve_2s10s_bp < 30:
        state = "平坦"
        score -= 0.1
    else:
        state = "正常"

    if real_rate > 2:
        score -= 0.3
        notes.append("实际利率 > 2%，紧缩过度")

    if move_idx > 130:
        score -= 0.2
        notes.append("MOVE 高位，债市恐慌")

    return EngineOutput(
        engine_id="L3-02",
        timestamp=datetime.now(),
        state=state,
        score=clamp(score),
        direction=sign(score),
        confidence=0.8,
        reliability=reliability("L3-02"),
        time_horizon="strategic",
        evidence=[
            Evidence("Real_FFR", real_rate, threshold=2),
            Evidence("2s10s_bp", curve_2s10s_bp, threshold=-50),
            Evidence("MOVE", move_idx, threshold=130),
        ],
        invalidation="; ".join(notes) if notes else "",
    )


# ---------- L3-03 信用周期 ----------
def credit_cycle(credit_impulse: float, hy_oas_bp: float, slo_index: float = 0) -> EngineOutput:
    if credit_impulse < -2:
        state, score = "信用收缩", -0.7
    elif credit_impulse < 0:
        state, score = "信用减速", -0.3
    elif credit_impulse < 2:
        state, score = "信用扩张", 0.4
    else:
        state, score = "信用过热", 0.1

    if hy_oas_bp > 700:
        score = min(score, -0.5)
        state += " + 信用预警"

    return EngineOutput(
        engine_id="L3-03",
        timestamp=datetime.now(),
        state=state,
        score=clamp(score),
        direction=sign(score),
        confidence=0.7,
        reliability=reliability("L3-03"),
        time_horizon="strategic",
        evidence=[
            Evidence("Credit_Impulse", credit_impulse, threshold=-1),
            Evidence("HY_OAS_bp", hy_oas_bp, threshold=500),
        ],
    )


# ---------- L3-04 流动性 ----------
def liquidity(net_liq_yoy: float, m2_yoy: float, fci: float = 0) -> EngineOutput:
    if net_liq_yoy > 0.05 and m2_yoy > 0:
        state, score = "流动性充裕", 0.5
    elif net_liq_yoy < -0.05 or m2_yoy < -2:
        state, score = "流动性紧缩", -0.6
    else:
        state, score = "流动性中性", 0.0

    return EngineOutput(
        engine_id="L3-04",
        timestamp=datetime.now(),
        state=state,
        score=score,
        direction=sign(score),
        confidence=0.7,
        reliability=reliability("L3-04"),
        time_horizon="strategic",
        evidence=[
            Evidence("Net_Liquidity_YoY", net_liq_yoy),
            Evidence("M2_YoY_pct", m2_yoy),
        ],
    )


# ---------- L4-08 关键阈值 ----------
THRESHOLDS = {
    "CAPE":     {"watch": 25,  "warn": 32,  "trigger": 38},
    "ERP":      {"watch": 3,   "warn": 2,   "trigger": 1,   "inverted": True},
    "2s10s":    {"watch": -20, "warn": -50, "trigger": -80, "inverted": True},
    "AuOil":    {"watch": 20,  "warn": 30,  "trigger": 50},
    "MOVE_VIX": {"watch": 5,   "warn": 6,   "trigger": 7},
    "Sahm":     {"watch": 0.30,"warn": 0.40,"trigger": 0.50},
    "HY_OAS":   {"watch": 400, "warn": 500, "trigger": 700},
    "5Y5Y":     {"watch": 2.5, "warn": 2.8, "trigger": 3.0},
    "ISM_PMI":  {"watch": 50,  "warn": 47,  "trigger": 45,  "inverted": True},
}


def threshold_check(signals: dict) -> EngineOutput:
    triggered, warn, watch = [], [], []
    evidence = []

    for sig_id, val in signals.items():
        cfg = THRESHOLDS.get(sig_id)
        if cfg is None:
            continue
        inverted = cfg.get("inverted", False)

        if inverted:
            if val < cfg["trigger"]:
                triggered.append(sig_id)
                evidence.append(Evidence(sig_id, val, threshold=cfg["trigger"]))
            elif val < cfg["warn"]:
                warn.append(sig_id)
            elif val < cfg["watch"]:
                watch.append(sig_id)
        else:
            if val > cfg["trigger"]:
                triggered.append(sig_id)
                evidence.append(Evidence(sig_id, val, threshold=cfg["trigger"]))
            elif val > cfg["warn"]:
                warn.append(sig_id)
            elif val > cfg["watch"]:
                watch.append(sig_id)

    score = -0.2 * len(watch) - 0.4 * len(warn) - 0.7 * len(triggered)

    return EngineOutput(
        engine_id="L4-08",
        timestamp=datetime.now(),
        state=f"{len(triggered)}🔴 / {len(warn)}🟠 / {len(watch)}🟡",
        score=clamp(score),
        direction=sign(score),
        confidence=1.0,  # 阈值是确定性的
        reliability=reliability("L4-08"),
        time_horizon="tactical",
        evidence=evidence,
    )


# ---------- L5-01 滚动回测 ----------
def rolling_backtest(signal_series: list[float], asset_returns: list[float],
                     window: int = 60, predict_h: int = 12) -> dict:
    """返回回测统计"""
    if len(signal_series) < window + predict_h:
        return {"error": "insufficient history", "final_weight": 0.5}

    results = []
    for t in range(window, len(signal_series) - predict_h):
        train = signal_series[t - window:t]
        test_x = signal_series[t]
        test_y = sum(asset_returns[t:t + predict_h])
        mean_train = sum(train) / len(train)
        pred_dir = sign(test_x - mean_train)
        actual_dir = sign(test_y)
        results.append(int(pred_dir == actual_dir))

    n = len(results)
    win_rate = sum(results) / n if n else 0.5
    # 简化稳定性：滚动 24 期胜率方差
    if n >= 48:
        chunks = [sum(results[i:i + 24]) / 24 for i in range(0, n - 24, 24)]
        if len(chunks) > 1:
            mean_c = sum(chunks) / len(chunks)
            var = sum((c - mean_c) ** 2 for c in chunks) / len(chunks)
            stability = max(0, 1 - var ** 0.5)
        else:
            stability = 0.7
    else:
        stability = 0.6

    decay = (sum(results[-60:]) / 60) / (win_rate + 1e-6) if n >= 60 else 1.0

    return {
        "n": n,
        "oos_win_rate": win_rate,
        "stability": stability,
        "decay_trend": decay,
        "final_weight": win_rate * stability,
    }


# ---------- L6-01 情景概率矩阵 ----------
SCENARIOS = {
    "soft_landing":  {"name": "软着陆",   "growth": 1,  "inflation": -1, "stress": 0},
    "recession":     {"name": "周期衰退", "growth": -1, "inflation": -1, "stress": 1},
    "reflation":     {"name": "再通胀",   "growth": 1,  "inflation": 1,  "stress": 0},
    "stagflation":   {"name": "硬着陆/滞胀","growth": -1, "inflation": 1,  "stress": 1},
}


def scenario_matrix(outputs: list[EngineOutput]) -> dict:
    """简化版：根据各引擎 score 加权投票，softmax 归一化"""
    # 各引擎对维度的贡献（简化映射）
    DIM_MAP = {
        "L2-03": ("growth", "inflation"),
        "L3-01": ("growth",),         # 估值高 = 增长后劲不足
        "L3-02": ("growth", "stress"),
        "L3-03": ("growth", "stress"),
        "L3-04": ("growth",),
        "L4-08": ("stress",),
    }

    growth, inflation, stress = 0.0, 0.0, 0.0
    weight_sum = 1e-9
    for out in outputs:
        dims = DIM_MAP.get(out.engine_id, ())
        if not dims:
            continue
        w = out.reliability * out.confidence
        weight_sum += w
        for d in dims:
            if d == "growth":
                growth += out.score * w
            elif d == "inflation":
                inflation -= out.score * w  # 负 score 倾向通胀下行
            elif d == "stress":
                stress += -out.score * w    # 负 score = 压力大

    growth /= weight_sum
    inflation /= weight_sum
    stress /= weight_sum

    raw = {}
    for sid, sc in SCENARIOS.items():
        m = 1.0
        m *= 0.5 + 0.5 * (1 if sign(growth) == sc["growth"] else -1) * abs(growth)
        m *= 0.5 + 0.5 * (1 if sign(inflation) == sc["inflation"] else -1) * abs(inflation)
        m *= 0.5 + 0.5 * (1 if sign(stress) == sc["stress"] else -1) * abs(stress)
        raw[sid] = max(0.01, m)  # 防 0

    total = sum(raw.values())
    probs = {k: v / total for k, v in raw.items()}

    # top contributors: 取 weighted_score 绝对值 top 3
    sorted_outs = sorted(outputs, key=lambda o: abs(o.weighted_score), reverse=True)
    top = [(o.engine_id, round(o.weighted_score, 3)) for o in sorted_outs[:3]]

    return {
        "probabilities": probs,
        "dimensions": {"growth": growth, "inflation": inflation, "stress": stress},
        "top_contributors": top,
    }


# ---------- L6-03 贝叶斯更新 ----------
def bayes_update(prior: dict, new_outputs: list[EngineOutput]) -> dict:
    """根据新引擎输出贝叶斯更新情景概率"""
    new_matrix = scenario_matrix(new_outputs)
    likelihood = new_matrix["probabilities"]

    posterior = {}
    norm = sum(likelihood[k] * prior.get(k, 0.25) for k in SCENARIOS)
    for k in SCENARIOS:
        posterior[k] = likelihood[k] * prior.get(k, 0.25) / norm

    delta = {k: posterior[k] - prior.get(k, 0.25) for k in SCENARIOS}
    trigger_review = any(abs(d) > 0.05 for d in delta.values())

    return {
        "posterior": posterior,
        "delta": delta,
        "trigger_review": trigger_review,
    }


# ---------- 主入口 ----------
def run_mvp(inputs: dict) -> dict:
    """跑 MVP 9 引擎闭环；inputs 是聚合的数据字典"""
    outputs = []

    outputs.append(merrill_clock(
        inputs["gdp_yoy_recent"], inputs["cpi_yoy_recent"]))
    outputs.append(valuation_mean_reversion(
        inputs["cape"], inputs["erp"], inputs["buffett"],
        inputs["cape_history"], inputs["erp_history"], inputs["buffett_history"]))
    outputs.append(rate_regime(
        inputs["real_rate"], inputs["curve_2s10s_bp"], inputs["move_idx"]))
    outputs.append(credit_cycle(
        inputs["credit_impulse"], inputs["hy_oas_bp"]))
    outputs.append(liquidity(
        inputs["net_liq_yoy"], inputs["m2_yoy"]))
    outputs.append(threshold_check(inputs["signals"]))

    matrix = scenario_matrix(outputs)
    prior = inputs.get("prior_probs", {k: 0.25 for k in SCENARIOS})
    bayes = bayes_update(prior, outputs)

    return {
        "outputs": [o.to_dict() for o in outputs],
        "scenario_matrix": matrix,
        "bayes_update": bayes,
    }


if __name__ == "__main__":
    import sys, io
    # Windows 控制台 GBK → 强制 UTF-8 stdout
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True)
    # 占位 demo
    demo_inputs = {
        "gdp_yoy_recent": [2.8, 2.7, 2.5, 2.4, 2.3, 2.2, 2.1, 2.0, 1.9, 1.9, 1.9, 1.9],
        "cpi_yoy_recent": [3.5, 3.4, 3.3, 3.3, 3.2, 3.1, 3.0, 3.0, 2.9, 2.9, 2.8, 2.8],
        "cape": 36.5, "erp": -0.35, "buffett": 114,
        "cape_history": [10, 15, 20, 25, 30, 35, 40, 45],
        "erp_history": [-2, 0, 2, 4, 6],
        "buffett_history": [50, 80, 100, 120, 140],
        "real_rate": 0.93, "curve_2s10s_bp": 40, "move_idx": 95,
        "credit_impulse": 0.3, "hy_oas_bp": 300,
        "net_liq_yoy": -0.02, "m2_yoy": 4.6,
        "signals": {
            "CAPE": 36.5, "ERP": -0.35, "2s10s": 40,
            "AuOil": 66.3, "Sahm": 0.35, "HY_OAS": 300,
        },
    }
    result = run_mvp(demo_inputs)
    import json
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
