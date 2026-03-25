"""
Parse MLIT API response into database-ready dict.

国交省 不動産情報ライブラリ API (XIT001) のレスポンスをパースする。

取得可能フィールド:
  Type, Region, MunicipalityCode, Prefecture, Municipality, DistrictName,
  TradePrice, PricePerUnit, FloorPlan, Area, UnitPrice, TotalFloorArea,
  BuildingYear, Structure, Use, Purpose, Direction, Classification, Breadth,
  CityPlanning, CoverageRatio, FloorAreaRatio, Period, Renovation, Remarks,
  DistrictCode, PriceCategory

取得不可 (null になる):
  - NearestStation (最寄駅): APIレスポンスに含まれない
  - station_distance_minutes (駅距離): APIレスポンスに含まれない
  - floor_number (階数): APIレスポンスに含まれない

注意:
  - Direction は住戸の向きではなく、前面道路の方位である可能性が高い
  - 座標は API に含まれないため、別途ジオコーディングで付与する
"""

import re
import logging
from datetime import datetime
from typing import Any, Optional

logger = logging.getLogger(__name__)

CURRENT_YEAR = datetime.now().year

# 和暦→西暦変換テーブル
ERA_MAP = {
    "令和": 2018,    # 令和1年 = 2019年
    "平成": 1988,    # 平成1年 = 1989年
    "昭和": 1925,    # 昭和1年 = 1926年
    "大正": 1911,    # 大正1年 = 1912年
}


def parse_building_year(text: Optional[str]) -> Optional[int]:
    """
    BuildingYear テキストから西暦整数を抽出する。

    Examples:
      "2014年"       -> 2014
      "令和2年"      -> 2020
      "平成15年"     -> 2003
      "昭和55年"     -> 1980
      "戦前"         -> None
    """
    if not text:
        return None

    # 西暦パターン: "2014年"
    m = re.match(r"(\d{4})年", text)
    if m:
        return int(m.group(1))

    # 和暦パターン: "令和2年", "平成15年"
    for era, offset in ERA_MAP.items():
        m = re.match(rf"{era}(\d+)年", text)
        if m:
            return offset + int(m.group(1))

    logger.debug("Could not parse building year: %s", text)
    return None


def parse_period_code(period_text: Optional[str]) -> Optional[str]:
    """
    Period テキストから period_code を生成する。

    Example: "2024年第1四半期" -> "20241"
    """
    if not period_text:
        return None

    m = re.match(r"(\d{4})年第(\d)四半期", period_text)
    if m:
        return f"{m.group(1)}{m.group(2)}"

    return None


def safe_int(value: Any) -> Optional[int]:
    """文字列を int に変換。失敗時は None。"""
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def safe_float(value: Any) -> Optional[float]:
    """文字列を float に変換。失敗時は None。"""
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def parse_transaction(record: dict[str, Any]) -> dict[str, Any]:
    """
    APIレスポンスの1レコードをDB格納用dictに変換する。

    取得できないフィールドは None で返す。
    """
    trade_price = safe_int(record.get("TradePrice"))
    area = safe_float(record.get("Area"))
    building_year_text = record.get("BuildingYear")
    building_year_int = parse_building_year(building_year_text)
    period_text = record.get("Period")

    # ㎡単価: 自前計算 (APIの UnitPrice/PricePerUnit より正確)
    unit_price_per_sqm: Optional[int] = None
    if trade_price and area and area > 0:
        unit_price_per_sqm = int(trade_price / area)

    # 築年数
    building_age: Optional[int] = None
    if building_year_int:
        building_age = CURRENT_YEAR - building_year_int

    return {
        "period_code": parse_period_code(period_text),
        "period_display": period_text,
        "prefecture": record.get("Prefecture"),
        "municipality": record.get("Municipality"),
        "municipality_code": record.get("MunicipalityCode"),
        "district_name": record.get("DistrictName"),
        "district_code": record.get("DistrictCode"),
        "trade_price_yen": trade_price,
        "unit_price_per_sqm": unit_price_per_sqm,
        "area_sqm": area,
        "total_floor_area_sqm": safe_float(record.get("TotalFloorArea")),
        "floor_plan": record.get("FloorPlan"),
        "building_year_text": building_year_text,
        "building_year_int": building_year_int,
        "building_age": building_age,
        "structure": record.get("Structure"),
        # 最寄駅: API から取得不可 → None
        "nearest_station": record.get("NearestStation"),
        # 駅距離: API から取得不可 → None
        "station_distance_minutes": safe_int(record.get("TimeToNearestStation")),
        # 階数: API から取得不可 → None
        "floor_number": safe_int(record.get("FloorNumber")),
        # Direction: 前面道路の方位の可能性あり (住戸の向きではない場合がある)
        "direction": record.get("Direction"),
        "property_type": record.get("Type"),
        "use_category": record.get("Use"),
        "purpose": record.get("Purpose"),
        "city_planning": record.get("CityPlanning"),
        "renovation": record.get("Renovation"),
        "remarks": record.get("Remarks"),
        "lat": None,
        "lng": None,
        "raw_json": record,
    }
