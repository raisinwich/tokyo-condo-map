#!/usr/bin/env python3
"""
ローカルDBのジオコーディング済み座標をNeon DBに同期する。
地区ごとにバッチ更新で高速処理。
"""

import os
import sys
import logging
import psycopg2

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

LOCAL_DB = os.environ.get("LOCAL_DATABASE_URL", "postgresql://ogawa@localhost:5432/tokyo_condo_map")
NEON_DB = os.environ.get("NEON_DATABASE_URL", "")


def main():
    if not NEON_DB:
        logger.error("NEON_DATABASE_URL is not set")
        sys.exit(1)

    logger.info("Connecting to local DB...")
    local_conn = psycopg2.connect(LOCAL_DB)
    local_cur = local_conn.cursor()

    logger.info("Connecting to Neon DB...")
    neon_conn = psycopg2.connect(NEON_DB)
    neon_cur = neon_conn.cursor()

    # ローカルDBから地区ごとのユニーク座標を取得
    local_cur.execute("""
        SELECT DISTINCT municipality, district_name, lat, lng
        FROM transactions
        WHERE lat IS NOT NULL AND lng IS NOT NULL
          AND municipality IS NOT NULL AND district_name IS NOT NULL
        ORDER BY municipality, district_name
    """)
    districts = local_cur.fetchall()
    logger.info(f"Found {len(districts)} district coordinates to sync")

    updated_total = 0
    for i, (mun, dist, lat, lng) in enumerate(districts, 1):
        neon_cur.execute("""
            UPDATE transactions
            SET lat = %s, lng = %s, updated_at = NOW()
            WHERE municipality = %s AND district_name = %s
              AND (lat IS NULL OR lng IS NULL OR lat != %s OR lng != %s)
        """, (lat, lng, mun, dist, lat, lng))
        updated = neon_cur.rowcount
        updated_total += updated

        if i % 100 == 0:
            neon_conn.commit()
            logger.info(f"  [{i}/{len(districts)}] processed, {updated_total} records updated")

    neon_conn.commit()
    logger.info(f"=== Done: {updated_total} records updated across {len(districts)} districts ===")

    local_cur.close()
    local_conn.close()
    neon_cur.close()
    neon_conn.close()


if __name__ == "__main__":
    main()
