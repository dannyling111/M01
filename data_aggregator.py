"""L1 数据层：多源拉取 → DuckDB"""
import argparse
import hashlib
from datetime import datetime, timedelta
import duckdb
import pandas as pd
from config import DUCKDB_PATH, FRED_API_KEY, FRED_SERIES, YFINANCE_SYMBOLS, CRYPTO_SYMBOLS


def init_db():
    con = duckdb.connect(str(DUCKDB_PATH))
    con.execute("""
        CREATE TABLE IF NOT EXISTS assets (
            symbol TEXT PRIMARY KEY,
            name TEXT, asset_type TEXT, region TEXT, source TEXT, freq TEXT
        );
        CREATE TABLE IF NOT EXISTS timeseries (
            symbol TEXT, ts DATE, value DOUBLE,
            PRIMARY KEY (symbol, ts)
        );
        CREATE TABLE IF NOT EXISTS derived_ratios (
            ratio_id TEXT, ts DATE, value DOUBLE,
            PRIMARY KEY (ratio_id, ts)
        );
        CREATE TABLE IF NOT EXISTS signals_daily (
            ts DATE, signal_id TEXT, value DOUBLE, percentile DOUBLE,
            state TEXT, threshold_watch DOUBLE, threshold_warn DOUBLE, threshold_trigger DOUBLE,
            PRIMARY KEY (ts, signal_id)
        );
        CREATE TABLE IF NOT EXISTS engine_outputs (
            run_id TEXT, ts TIMESTAMP, engine_id TEXT, data_version TEXT,
            state TEXT, score DOUBLE, direction INTEGER,
            confidence DOUBLE, reliability DOUBLE, time_horizon TEXT,
            evidence_json TEXT, invalidation TEXT,
            PRIMARY KEY (run_id, engine_id)
        );
        CREATE TABLE IF NOT EXISTS data_snapshots (
            snapshot_hash TEXT PRIMARY KEY, ts TIMESTAMP, source_versions JSON
        );
    """)
    con.close()


def fetch_fred(series_id: str) -> pd.DataFrame:
    """需要 fredapi: pip install fredapi"""
    from fredapi import Fred
    fred = Fred(api_key=FRED_API_KEY)
    s = fred.get_series(series_id)
    df = s.reset_index()
    df.columns = ["ts", "value"]
    df["symbol"] = series_id
    return df[["symbol", "ts", "value"]]


def fetch_yfinance(symbol: str, period: str = "30y") -> pd.DataFrame:
    """需要 yfinance: pip install yfinance"""
    import yfinance as yf
    df = yf.Ticker(symbol).history(period=period)
    df = df[["Close"]].reset_index()
    df.columns = ["ts", "value"]
    df["symbol"] = symbol
    df["ts"] = pd.to_datetime(df["ts"]).dt.date
    return df[["symbol", "ts", "value"]]


def fetch_crypto(pair: str = "BTC/USDT", limit: int = 365 * 5) -> pd.DataFrame:
    """需要 ccxt: pip install ccxt"""
    import ccxt
    ex = ccxt.binance()
    ohlcv = ex.fetch_ohlcv(pair, timeframe="1d", limit=limit)
    df = pd.DataFrame(ohlcv, columns=["ts", "o", "h", "l", "c", "v"])
    df["ts"] = pd.to_datetime(df["ts"], unit="ms").dt.date
    df["symbol"] = pair.replace("/", "")
    df["value"] = df["c"]
    return df[["symbol", "ts", "value"]]


def upsert_timeseries(con, df: pd.DataFrame):
    if df.empty:
        return
    con.execute("CREATE TEMP TABLE _staging AS SELECT * FROM df")
    con.execute("""
        INSERT INTO timeseries SELECT * FROM _staging
        ON CONFLICT (symbol, ts) DO UPDATE SET value = EXCLUDED.value
    """)
    con.execute("DROP TABLE _staging")


def upsert_asset(con, symbol: str, name: str, asset_type: str,
                 region: str = "US", source: str = "yf", freq: str = "daily"):
    con.execute("""
        INSERT INTO assets VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (symbol) DO NOTHING
    """, [symbol, name, asset_type, region, source, freq])


def make_snapshot_hash(con) -> str:
    df = con.execute("SELECT MAX(ts) FROM timeseries").fetchone()
    payload = f"{df}_{datetime.now().date()}"
    return hashlib.sha256(payload.encode()).hexdigest()[:16]


def run_full():
    print("[init] DB...")
    init_db()
    con = duckdb.connect(str(DUCKDB_PATH))

    # FRED
    if FRED_API_KEY:
        for sid, name in FRED_SERIES.items():
            try:
                print(f"[FRED] {sid} {name}")
                df = fetch_fred(sid)
                upsert_asset(con, sid, name, "macro", source="FRED",
                             freq="monthly" if sid in {"GDP", "GDPC1", "CPIAUCSL"} else "daily")
                upsert_timeseries(con, df)
            except Exception as e:
                print(f"  ! FRED {sid} failed: {e}")
    else:
        print("[skip] FRED_API_KEY not set")

    # yfinance
    for sym, name in YFINANCE_SYMBOLS.items():
        try:
            print(f"[YF]   {sym} {name}")
            df = fetch_yfinance(sym)
            asset_type = "equity" if sym.startswith("^") else (
                "commodity" if "=" in sym else "fx")
            upsert_asset(con, sym, name, asset_type, source="yfinance")
            upsert_timeseries(con, df)
        except Exception as e:
            print(f"  ! YF {sym} failed: {e}")

    # crypto
    for pair in CRYPTO_SYMBOLS:
        try:
            print(f"[CCXT] {pair}")
            df = fetch_crypto(pair)
            upsert_asset(con, pair.replace("/", ""), pair, "crypto", source="binance")
            upsert_timeseries(con, df)
        except Exception as e:
            print(f"  ! CCXT {pair} failed: {e}")

    h = make_snapshot_hash(con)
    con.execute("INSERT INTO data_snapshots VALUES (?, ?, ?)",
                [h, datetime.now(), '{"v": 1}'])
    print(f"[done] snapshot_hash = {h}")
    con.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--full", action="store_true", help="Full pull")
    args = parser.parse_args()
    if args.full:
        run_full()
    else:
        init_db()
        print("DB initialized at", DUCKDB_PATH)
