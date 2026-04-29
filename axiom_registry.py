"""AXIOM 引擎注册表 + reliability 动态配置"""
from typing import Dict

# base_grade: 物理定律 0.90 / 强规律 0.70 / 统计倾向 0.45 / 框架 1.00
ENGINES: Dict[str, dict] = {
    # L0
    "L0-01": {"name": "Regime 检测",      "base_grade": 0.70, "active": False},
    "L0-02": {"name": "冲突裁决",          "base_grade": 1.00, "active": False},
    "L0-03": {"name": "数据版本与校准",     "base_grade": 0.90, "active": True},
    # L1
    "L1-01": {"name": "资产宇宙",          "base_grade": 0.90, "active": True},
    "L1-02": {"name": "时间框架",          "base_grade": 0.90, "active": True},
    "L1-03": {"name": "精度与置信分层",     "base_grade": 0.90, "active": True},
    # L2 历史知识
    "L2-01": {"name": "长周期定位",         "base_grade": 0.70, "active": False},
    "L2-02": {"name": "中周期分类",         "base_grade": 0.70, "active": False},
    "L2-03": {"name": "美林时钟/象限",      "base_grade": 0.70, "active": True},
    "L2-04": {"name": "危机模式库",         "base_grade": 0.45, "active": False},
    "L2-05": {"name": "风险传导链",         "base_grade": 0.45, "active": False},
    "L2-06": {"name": "政策响应函数",       "base_grade": 0.70, "active": False},
    "L2-07": {"name": "地缘政治情景",       "base_grade": 0.45, "active": False},
    "L2-08": {"name": "结构性趋势",         "base_grade": 0.70, "active": False},
    # L3 底层逻辑
    "L3-01": {"name": "估值均值回归",       "base_grade": 0.90, "active": True},
    "L3-02": {"name": "利率-资产机制",      "base_grade": 0.90, "active": True},
    "L3-03": {"name": "信用周期",           "base_grade": 0.70, "active": True},
    "L3-04": {"name": "流动性",             "base_grade": 0.70, "active": True},
    "L3-05": {"name": "美元",               "base_grade": 0.70, "active": False},
    "L3-06": {"name": "资产比率",           "base_grade": 0.70, "active": False},
    "L3-07": {"name": "商品超级周期",       "base_grade": 0.45, "active": False},
    "L3-08": {"name": "波动率结构",         "base_grade": 0.70, "active": False},
    # L4 领先指标
    "L4-01": {"name": "经济领先指标",       "base_grade": 0.70, "active": False},
    "L4-02": {"name": "通胀预期锚定",       "base_grade": 0.70, "active": False},
    "L4-03": {"name": "央行政策路径",       "base_grade": 0.70, "active": False},
    "L4-04": {"name": "信用市场预警",       "base_grade": 0.70, "active": False},
    "L4-05": {"name": "情绪与仓位",         "base_grade": 0.45, "active": False},
    "L4-06": {"name": "跨资产信号",         "base_grade": 0.70, "active": False},
    "L4-07": {"name": "资产现状仪表盘",     "base_grade": 0.90, "active": False},
    "L4-08": {"name": "关键信号阈值",       "base_grade": 0.70, "active": True},
    # L5 回测验证
    "L5-01": {"name": "滚动窗口回测",       "base_grade": 0.90, "active": True},
    "L5-02": {"name": "样本外交叉验证",     "base_grade": 0.90, "active": False},
    "L5-03": {"name": "压力测试",           "base_grade": 0.70, "active": False},
    "L5-04": {"name": "信号衰减检测",       "base_grade": 0.70, "active": False},
    # L6 情景输出
    "L6-01": {"name": "情景概率矩阵",       "base_grade": 1.00, "active": True},
    "L6-02": {"name": "决策树",             "base_grade": 1.00, "active": False},
    "L6-03": {"name": "贝叶斯更新",         "base_grade": 0.70, "active": True},
    "L6-04": {"name": "配置输出",           "base_grade": 1.00, "active": False},
}

# 由 L0-01 写入（默认 1.0）
REGIME_PENALTY: float = 1.0

# 由 L5-04 + 预测核对系统反馈写入（默认 1.0）
OOS_HEALTH: Dict[str, float] = {eng_id: 1.0 for eng_id in ENGINES}


def reliability(engine_id: str) -> float:
    cfg = ENGINES.get(engine_id, {})
    base = cfg.get("base_grade", 0.5)
    return base * REGIME_PENALTY * OOS_HEALTH.get(engine_id, 1.0)


def active_engines() -> list[str]:
    return [eid for eid, cfg in ENGINES.items() if cfg.get("active")]


# === MVP 9 闭环 ===
MVP_9 = ["L1-02", "L2-03", "L3-02", "L3-03", "L3-04", "L4-08", "L5-01", "L6-01", "L6-03"]
