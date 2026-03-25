#!/usr/bin/env python3
"""
地区名レベルのジオコーディング一括更新スクリプト。

ユニークな (municipality, district_name) ペアごとに Nominatim で座標を取得し、
全レコードを一括更新する。

Usage:
    DATABASE_URL=... python geocode_districts.py
"""

import logging
import os
import sys
import time

import psycopg2
import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("geocode_districts")

DATABASE_URL = os.environ.get("DATABASE_URL", "")

# 市区町村中心座標 (フォールバック)
MUNICIPALITY_COORDS = {
    "千代田区": (35.6940, 139.7536), "中央区": (35.6709, 139.7723),
    "港区": (35.6585, 139.7514), "新宿区": (35.6938, 139.7036),
    "文京区": (35.7081, 139.7522), "台東区": (35.7126, 139.7802),
    "墨田区": (35.7107, 139.8015), "江東区": (35.6729, 139.8172),
    "品川区": (35.6092, 139.7300), "目黒区": (35.6414, 139.6982),
    "大田区": (35.5613, 139.7160), "世田谷区": (35.6461, 139.6530),
    "渋谷区": (35.6640, 139.6982), "中野区": (35.7078, 139.6638),
    "杉並区": (35.6994, 139.6364), "豊島区": (35.7264, 139.7161),
    "北区": (35.7527, 139.7337), "荒川区": (35.7358, 139.7834),
    "板橋区": (35.7516, 139.7093), "練馬区": (35.7355, 139.6516),
    "足立区": (35.7748, 139.8047), "葛飾区": (35.7436, 139.8471),
    "江戸川区": (35.7067, 139.8683), "八王子市": (35.6664, 139.3160),
    "立川市": (35.7138, 139.4095), "武蔵野市": (35.7177, 139.5661),
    "三鷹市": (35.6836, 139.5596), "青梅市": (35.7880, 139.2756),
    "府中市": (35.6691, 139.4778), "昭島市": (35.7053, 139.3535),
    "調布市": (35.6517, 139.5413), "町田市": (35.5486, 139.4386),
    "小金井市": (35.6997, 139.5031), "小平市": (35.7283, 139.4775),
    "日野市": (35.6714, 139.3953), "東村山市": (35.7548, 139.4685),
    "国分寺市": (35.7104, 139.4622), "国立市": (35.6839, 139.4416),
    "福生市": (35.7387, 139.3266), "狛江市": (35.6345, 139.5787),
    "東大和市": (35.7452, 139.4266), "清瀬市": (35.7694, 139.5187),
    "東久留米市": (35.7587, 139.5296), "武蔵村山市": (35.7546, 139.3875),
    "多摩市": (35.6369, 139.4463), "稲城市": (35.6381, 139.5048),
    "羽村市": (35.7686, 139.3111), "あきる野市": (35.7293, 139.2946),
    "西東京市": (35.7252, 139.5386),
}

_last_call = 0.0


def geocode_nominatim(municipality: str, district_name: str):
    """Nominatim でジオコーディング。1.1秒間隔を守る。"""
    global _last_call
    elapsed = time.time() - _last_call
    if elapsed < 1.1:
        time.sleep(1.1 - elapsed)

    query = f"東京都 {municipality} {district_name}"
    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1, "countrycodes": "jp"},
            headers={"User-Agent": "tokyo-condo-map/1.0"},
            timeout=10,
        )
        _last_call = time.time()

        if resp.status_code == 200:
            results = resp.json()
            if results:
                return (float(results[0]["lat"]), float(results[0]["lon"]))
    except Exception as e:
        logger.warning("Nominatim failed for %s %s: %s", municipality, district_name, e)
        _last_call = time.time()

    return None


def main():
    if not DATABASE_URL:
        logger.error("DATABASE_URL is not set.")
        sys.exit(1)

    conn = psycopg2.connect(DATABASE_URL)

    # 1. ユニークな地区を取得
    with conn.cursor() as cur:
        cur.execute("""
            SELECT DISTINCT municipality, district_name
            FROM transactions
            WHERE district_name IS NOT NULL AND district_name != ''
            ORDER BY municipality, district_name
        """)
        districts = cur.fetchall()

    logger.info("Found %d unique districts to geocode", len(districts))

    success = 0
    fallback = 0
    failed = 0

    for i, (municipality, district_name) in enumerate(districts):
        coords = geocode_nominatim(municipality, district_name)

        if coords:
            lat, lng = coords
            source = "nominatim"
            success += 1
        else:
            # フォールバック: 市区町村中心
            fb = MUNICIPALITY_COORDS.get(municipality)
            if fb:
                lat, lng = fb
                source = "fallback"
                fallback += 1
            else:
                failed += 1
                continue

        # DB更新
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE transactions SET lat = %s, lng = %s WHERE municipality = %s AND district_name = %s",
                (lat, lng, municipality, district_name),
            )

        if (i + 1) % 50 == 0 or i == 0:
            conn.commit()
            logger.info(
                "  [%d/%d] %s %s -> (%.4f, %.4f) [%s]",
                i + 1, len(districts), municipality, district_name, lat, lng, source,
            )

    conn.commit()
    conn.close()

    logger.info(
        "Done. nominatim=%d, fallback=%d, failed=%d, total=%d",
        success, fallback, failed, len(districts),
    )


if __name__ == "__main__":
    main()
