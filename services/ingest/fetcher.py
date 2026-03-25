"""
Fetch transaction data from MLIT Real Estate Information Library API (XIT001).
"""

import logging
from typing import Any

import requests

from config import (
    MLIT_API_BASE,
    MLIT_API_KEY,
    PRICE_CLASSIFICATION,
    TARGET_PROPERTY_TYPE,
    TOKYO_AREA_CODE,
)

logger = logging.getLogger(__name__)


def fetch_quarter(year: int, quarter: int) -> list[dict[str, Any]]:
    """
    指定した年・四半期の東京都の中古マンション取引データを取得する。

    Args:
        year: 西暦年 (e.g. 2024)
        quarter: 四半期 (1-4)

    Returns:
        中古マンション等の取引データのリスト

    Raises:
        requests.HTTPError: API呼び出し失敗時
    """
    if not MLIT_API_KEY:
        raise RuntimeError(
            "MLIT_API_KEY is not set. "
            "Apply at https://www.reinfolib.mlit.go.jp/api/request/"
        )

    params = {
        "year": str(year),
        "quarter": str(quarter),
        "area": TOKYO_AREA_CODE,
        "priceClassification": PRICE_CLASSIFICATION,
    }

    headers = {
        "Ocp-Apim-Subscription-Key": MLIT_API_KEY,
        "Accept-Encoding": "gzip",
    }

    logger.info("Fetching %dQ%d from MLIT API ...", year, quarter)
    resp = requests.get(MLIT_API_BASE, params=params, headers=headers, timeout=60)

    if resp.status_code == 404:
        logger.warning("No data for %dQ%d (HTTP 404)", year, quarter)
        return []

    resp.raise_for_status()

    body = resp.json()
    status = body.get("status")
    if status != "OK":
        logger.error("API returned status=%s for %dQ%d", status, year, quarter)
        return []

    all_records: list[dict[str, Any]] = body.get("data", [])

    # 中古マンション等のみフィルタリング
    condo_records = [
        r for r in all_records
        if r.get("Type") == TARGET_PROPERTY_TYPE
    ]

    logger.info(
        "  %dQ%d: total=%d, condos=%d",
        year, quarter, len(all_records), len(condo_records),
    )

    return condo_records
