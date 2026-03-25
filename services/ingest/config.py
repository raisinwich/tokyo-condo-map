"""Configuration loaded from environment variables."""

import os
from dotenv import load_dotenv

load_dotenv()

MLIT_API_KEY: str = os.environ.get("MLIT_API_KEY", "")
DATABASE_URL: str = os.environ.get("DATABASE_URL", "")

# 国交省 不動産情報ライブラリ API
MLIT_API_BASE = "https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001"

# 東京都の都道府県コード
TOKYO_AREA_CODE = "13"

# 取得対象の物件種別
TARGET_PROPERTY_TYPE = "中古マンション等"

# priceClassification: 01=取引価格のみ
PRICE_CLASSIFICATION = "01"
