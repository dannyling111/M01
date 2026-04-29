"""配置：路径 + API Key + 数据源"""
import os
from pathlib import Path

# dotenv 可选：未装则跳过
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# === 路径 ===
VAULT_ROOT = Path(r"C:\Users\Danny\OneDrive\Apps\remotely-save\a")
PREDICTION_CSV = VAULT_ROOT / "Topics" / "经济投资" / "3_Projects" / "预测核对系统" / "prediction_log.csv"
OUTPUT_DIR = VAULT_ROOT / "Topics" / "经济投资" / "4_Outputs" / "市场日报"
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DUCKDB_PATH = DATA_DIR / "allweather.duckdb"

# === API Key（从 .env 读取）===
FRED_API_KEY = os.getenv("FRED_API_KEY", "")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# === 数据源 ===
FRED_SERIES = {
    # 利率
    "DGS2": "2Y Treasury",
    "DGS10": "10Y Treasury",
    "DGS30": "30Y Treasury",
    "DFF": "Fed Funds Rate",
    # 通胀
    "CPIAUCSL": "CPI All Urban",
    "PCEPI": "PCE Price Index",
    "T5YIE": "5Y BEI",
    "T10YIE": "10Y BEI",
    # 增长
    "GDP": "Nominal GDP",
    "GDPC1": "Real GDP",
    "INDPRO": "Industrial Production",
    # 就业
    "UNRATE": "Unemployment",
    "ICSA": "Initial Jobless Claims",
    # 流动性
    "WALCL": "Fed Balance Sheet",
    "WTREGEN": "Treasury General Account",
    "RRPONTSYD": "Reverse Repo",
    "M2SL": "M2",
    # 信用
    "BAMLH0A0HYM2": "HY OAS",
    "BAMLC0A0CM": "IG OAS",
    # 估值
    "MULTPL_SHILLER_PE_RATIO_MONTH": "CAPE (proxy)",
}

YFINANCE_SYMBOLS = {
    "^GSPC": "S&P 500",
    "^NDX": "Nasdaq 100",
    "^DJI": "Dow Jones",
    "^VIX": "VIX",
    "^MOVE": "MOVE",
    "^SKEW": "SKEW",
    "GC=F": "Gold",
    "SI=F": "Silver",
    "HG=F": "Copper",
    "CL=F": "WTI Oil",
    "DX=F": "DXY",
}

CRYPTO_SYMBOLS = ["BTC/USDT", "ETH/USDT"]

# === AXIOM 配置 ===
HISTORY_LOOKBACK_DAYS = 365 * 30   # 30 年历史
ROLLING_BACKTEST_WINDOW = 60        # 60 月
PREDICT_HORIZON_DEFAULT = 12        # 12 月
