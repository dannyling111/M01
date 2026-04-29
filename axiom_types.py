"""AXIOM 统一数据类型"""
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Literal, Optional
import json

TimeHorizon = Literal["tactical", "strategic", "structural"]
Direction = Literal[-1, 0, 1]


@dataclass
class Evidence:
    metric: str
    value: float
    percentile: float = 0.0
    threshold: Optional[float] = None
    source: str = ""
    date: str = ""


@dataclass
class EngineOutput:
    engine_id: str
    timestamp: datetime
    data_version: str = ""
    state: str = ""
    score: float = 0.0                 # [-1, +1]
    direction: Direction = 0
    confidence: float = 0.5            # [0, 1]
    reliability: float = 0.7
    time_horizon: TimeHorizon = "strategic"
    asset_scope: list = field(default_factory=list)
    evidence: list = field(default_factory=list)
    invalidation: str = ""
    conflicts_with: list = field(default_factory=list)

    @property
    def weighted_score(self) -> float:
        return self.score * self.reliability * self.confidence

    def to_dict(self) -> dict:
        d = asdict(self)
        d['timestamp'] = self.timestamp.isoformat()
        return d

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False, default=str)


def clamp(x: float, lo: float = -1, hi: float = 1) -> float:
    return max(lo, min(hi, x))


def sign(x: float) -> int:
    return 1 if x > 0 else (-1 if x < 0 else 0)


def percentile_rank(value: float, history: list[float]) -> float:
    """返回 value 在 history 分布中的百分位 [0, 1]"""
    sorted_h = sorted(history)
    n = len(sorted_h)
    if n == 0:
        return 0.5
    below = sum(1 for x in sorted_h if x < value)
    return below / n
