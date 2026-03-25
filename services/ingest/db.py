"""
Database operations for transaction data.
"""

import json
import logging
from typing import Any

import psycopg2
import psycopg2.extras

from config import DATABASE_URL

logger = logging.getLogger(__name__)


def get_connection():
    """Create a new database connection."""
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set.")
    return psycopg2.connect(DATABASE_URL)


def init_schema(conn) -> None:
    """Run schema.sql to create tables if not exists."""
    import os

    schema_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "sql", "schema.sql"
    )
    schema_path = os.path.abspath(schema_path)

    with open(schema_path, "r", encoding="utf-8") as f:
        sql = f.read()

    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    logger.info("Schema initialized.")


def upsert_transactions(conn, records: list[dict[str, Any]]) -> tuple[int, int]:
    """
    Insert transactions with ON CONFLICT DO NOTHING (dedup by unique index).

    Returns:
        (inserted_count, skipped_count)
    """
    if not records:
        return (0, 0)

    insert_sql = """
        INSERT INTO transactions (
            period_code, period_display,
            prefecture, municipality, municipality_code,
            district_name, district_code,
            trade_price_yen, unit_price_per_sqm,
            area_sqm, total_floor_area_sqm,
            floor_plan, building_year_text, building_year_int, building_age,
            structure,
            nearest_station, station_distance_minutes,
            floor_number, direction,
            property_type, use_category, purpose,
            city_planning, renovation, remarks,
            lat, lng,
            raw_json
        ) VALUES (
            %(period_code)s, %(period_display)s,
            %(prefecture)s, %(municipality)s, %(municipality_code)s,
            %(district_name)s, %(district_code)s,
            %(trade_price_yen)s, %(unit_price_per_sqm)s,
            %(area_sqm)s, %(total_floor_area_sqm)s,
            %(floor_plan)s, %(building_year_text)s, %(building_year_int)s, %(building_age)s,
            %(structure)s,
            %(nearest_station)s, %(station_distance_minutes)s,
            %(floor_number)s, %(direction)s,
            %(property_type)s, %(use_category)s, %(purpose)s,
            %(city_planning)s, %(renovation)s, %(remarks)s,
            %(lat)s, %(lng)s,
            %(raw_json)s
        )
        ON CONFLICT ON CONSTRAINT uix_transactions_dedup DO NOTHING
    """

    inserted = 0
    skipped = 0

    with conn.cursor() as cur:
        for rec in records:
            # raw_json を JSON文字列に変換
            params = {**rec}
            params["raw_json"] = json.dumps(params["raw_json"], ensure_ascii=False)

            try:
                cur.execute(insert_sql, params)
                if cur.rowcount > 0:
                    inserted += 1
                else:
                    skipped += 1
            except psycopg2.Error as e:
                logger.warning("Insert failed for record: %s — %s", rec.get("district_name"), e)
                conn.rollback()
                skipped += 1
                continue

    conn.commit()
    return (inserted, skipped)
