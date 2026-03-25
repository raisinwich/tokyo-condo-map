#!/usr/bin/env python3
"""
地区レベルのジオコーディング（国土地理院 住所検索API使用）

国土地理院の住所検索APIを使って、各(市区町村, 地区名)ペアの座標を取得し、
トランザクションテーブルの lat/lng を更新する。

API仕様: https://msearch.gsi.go.jp/address-search/AddressSearch
- 無料・APIキー不要
- レート制限は明示されていないが、0.5秒間隔で呼ぶ
"""

import os
import sys
import json
import time
import hashlib
import logging
import urllib.request
import urllib.parse
import psycopg2
from psycopg2.extras import execute_values

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://ogawa@localhost:5432/tokyo_condo_map")
GSI_API_URL = "https://msearch.gsi.go.jp/address-search/AddressSearch"
REQUEST_INTERVAL = 0.5  # seconds between requests


def geocode_gsi(query: str) -> tuple[float, float] | None:
    """国土地理院APIで住所を座標に変換する"""
    try:
        url = f"{GSI_API_URL}?q={urllib.parse.quote(query)}"
        req = urllib.request.Request(url, headers={"User-Agent": "tokyo-condo-map/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
        if data and len(data) > 0:
            coords = data[0]["geometry"]["coordinates"]
            # GSI returns [lng, lat] (GeoJSON format)
            return (coords[1], coords[0])
        return None
    except Exception as e:
        logger.warning(f"GSI geocoding failed for '{query}': {e}")
        return None


def get_unique_districts(cur) -> list[tuple[str, str]]:
    """座標が市区町村中心のままの地区を取得"""
    # 同じ市区町村内で全レコードが同一座標 → 中心座標のまま
    cur.execute("""
        SELECT DISTINCT municipality, district_name
        FROM transactions
        WHERE municipality IS NOT NULL
          AND district_name IS NOT NULL
          AND district_name != ''
        ORDER BY municipality, district_name
    """)
    return cur.fetchall()


def add_jitter(lat: float, lng: float, district_name: str) -> tuple[float, float]:
    """同一地区内の物件が完全に重ならないよう、地区名ベースの微小オフセットを加える"""
    # ±0.001度 ≈ ±100m のランダムオフセット
    h = hashlib.md5(district_name.encode()).hexdigest()
    dlat = (int(h[:4], 16) / 65535 - 0.5) * 0.002
    dlng = (int(h[4:8], 16) / 65535 - 0.5) * 0.002
    return (lat + dlat, lng + dlng)


def main():
    logger.info("=== 国土地理院APIによる地区レベルジオコーディング ===")

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    districts = get_unique_districts(cur)
    logger.info(f"対象地区数: {len(districts)}")

    success = 0
    failed = 0
    skipped = 0

    for i, (municipality, district_name) in enumerate(districts, 1):
        query = f"東京都{municipality}{district_name}"

        result = geocode_gsi(query)

        if result:
            lat, lng = result
            # 同じ地区の全レコードを更新
            cur.execute("""
                UPDATE transactions
                SET lat = %s, lng = %s, updated_at = NOW()
                WHERE municipality = %s AND district_name = %s
            """, (lat, lng, municipality, district_name))
            updated = cur.rowcount
            success += 1
            if i % 50 == 0 or i <= 5:
                logger.info(f"  [{i}/{len(districts)}] {municipality} {district_name} -> ({lat:.4f}, {lng:.4f}) [{updated}件更新]")
        else:
            # GSIで見つからない場合、市区町村名だけで再試行
            result2 = geocode_gsi(f"東京都{municipality}")
            if result2:
                lat, lng = add_jitter(result2[0], result2[1], district_name)
                cur.execute("""
                    UPDATE transactions
                    SET lat = %s, lng = %s, updated_at = NOW()
                    WHERE municipality = %s AND district_name = %s
                """, (lat, lng, municipality, district_name))
                skipped += 1
                if i % 50 == 0:
                    logger.info(f"  [{i}/{len(districts)}] {municipality} {district_name} -> jitter fallback ({lat:.4f}, {lng:.4f})")
            else:
                failed += 1
                logger.warning(f"  [{i}/{len(districts)}] {municipality} {district_name} -> FAILED")

        # コミットは100件ごと
        if i % 100 == 0:
            conn.commit()
            logger.info(f"  ... {i}/{len(districts)} processed (success={success}, jitter={skipped}, failed={failed})")

        time.sleep(REQUEST_INTERVAL)

    conn.commit()

    # 結果サマリー
    cur.execute("SELECT COUNT(DISTINCT (lat, lng)) FROM transactions WHERE lat IS NOT NULL")
    unique_coords = cur.fetchone()[0]

    logger.info(f"=== 完了 ===")
    logger.info(f"  成功: {success}")
    logger.info(f"  ジッターフォールバック: {skipped}")
    logger.info(f"  失敗: {failed}")
    logger.info(f"  ユニーク座標数: {unique_coords}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
