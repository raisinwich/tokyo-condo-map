#!/usr/bin/env python3
"""
Main ingest script: fetch Tokyo condo transactions from MLIT API and store in PostgreSQL.

Usage:
    # 直近8四半期を取り込む (デフォルト)
    python ingest.py

    # 特定の四半期を取り込む
    python ingest.py --year 2024 --quarter 3

    # 年を指定して4四半期分取り込む
    python ingest.py --year 2024

    # ジオコーディングをスキップ (高速化)
    python ingest.py --skip-geocode

環境変数:
    MLIT_API_KEY   - 国交省 不動産情報ライブラリ APIキー
    DATABASE_URL   - PostgreSQL 接続文字列
"""

import argparse
import logging
import sys
import time
from datetime import datetime

from config import MLIT_API_KEY, DATABASE_URL
from db import get_connection, init_schema, upsert_transactions
from fetcher import fetch_quarter
from geocode import geocode_district
from parser import parse_transaction

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ingest")


def get_recent_quarters(count: int = 8) -> list[tuple[int, int]]:
    """直近 count 四半期の (year, quarter) リストを返す。"""
    now = datetime.now()
    current_q = (now.month - 1) // 3 + 1
    current_y = now.year

    quarters = []
    y, q = current_y, current_q
    for _ in range(count):
        # 1四半期戻す (直近はデータ未公開の可能性があるため)
        q -= 1
        if q < 1:
            q = 4
            y -= 1
        quarters.append((y, q))

    return list(reversed(quarters))


def run_ingest(
    quarters: list[tuple[int, int]],
    skip_geocode: bool = False,
    use_nominatim: bool = True,
) -> None:
    """メイン取込処理。"""
    # 事前チェック
    if not MLIT_API_KEY:
        logger.error("MLIT_API_KEY is not set.")
        sys.exit(1)
    if not DATABASE_URL:
        logger.error("DATABASE_URL is not set.")
        sys.exit(1)

    conn = get_connection()
    try:
        init_schema(conn)

        total_inserted = 0
        total_skipped = 0

        for year, quarter in quarters:
            try:
                raw_records = fetch_quarter(year, quarter)
            except Exception as e:
                logger.error("Failed to fetch %dQ%d: %s", year, quarter, e)
                continue

            if not raw_records:
                continue

            # Parse and geocode
            parsed = []
            for raw in raw_records:
                rec = parse_transaction(raw)

                if not skip_geocode and rec["lat"] is None:
                    coords = geocode_district(
                        rec.get("municipality", ""),
                        rec.get("district_name", ""),
                        use_nominatim=use_nominatim,
                    )
                    if coords:
                        rec["lat"], rec["lng"] = coords

                parsed.append(rec)

            # Upsert
            inserted, skipped = upsert_transactions(conn, parsed)
            total_inserted += inserted
            total_skipped += skipped

            logger.info(
                "  %dQ%d: inserted=%d, skipped(dup)=%d",
                year, quarter, inserted, skipped,
            )

            # API rate limit 対策
            time.sleep(1)

        logger.info(
            "Ingest complete. Total inserted=%d, skipped=%d",
            total_inserted, total_skipped,
        )
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description="Ingest Tokyo condo transactions")
    parser.add_argument("--year", type=int, help="Target year (e.g. 2024)")
    parser.add_argument("--quarter", type=int, choices=[1, 2, 3, 4], help="Target quarter (1-4)")
    parser.add_argument("--count", type=int, default=8, help="Number of recent quarters (default: 8)")
    parser.add_argument("--skip-geocode", action="store_true", help="Skip geocoding (faster)")
    parser.add_argument("--no-nominatim", action="store_true", help="Use only static coords (no external API)")
    args = parser.parse_args()

    if args.year and args.quarter:
        quarters = [(args.year, args.quarter)]
    elif args.year:
        quarters = [(args.year, q) for q in range(1, 5)]
    else:
        quarters = get_recent_quarters(args.count)

    logger.info("Target quarters: %s", quarters)

    run_ingest(
        quarters=quarters,
        skip_geocode=args.skip_geocode,
        use_nominatim=not args.no_nominatim,
    )


if __name__ == "__main__":
    main()
