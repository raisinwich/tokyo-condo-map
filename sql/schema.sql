-- tokyo-condo-map: Schema for condominium transaction data
-- Target DB: PostgreSQL (Railway)

CREATE TABLE IF NOT EXISTS transactions (
    id                      SERIAL PRIMARY KEY,

    -- 取引時期
    period_code             VARCHAR(10),       -- e.g. "20241" = 2024年Q1
    period_display          VARCHAR(30),       -- e.g. "2024年第1四半期"

    -- 地域
    prefecture              VARCHAR(10),       -- "東京都"
    municipality            VARCHAR(30),       -- "港区"
    municipality_code       VARCHAR(10),       -- "13103"
    district_name           VARCHAR(100),      -- "麻布台"
    district_code           VARCHAR(20),       -- DistrictCode from API

    -- 価格
    trade_price_yen         BIGINT,            -- 取引価格(円)
    unit_price_per_sqm      INTEGER,           -- ㎡単価(円) = trade_price_yen / area_sqm

    -- 物件情報
    area_sqm                NUMERIC(10,2),     -- 面積(㎡)
    total_floor_area_sqm    NUMERIC(10,2),     -- 延床面積(㎡) — 参考値
    floor_plan              VARCHAR(30),       -- 間取り e.g. "2LDK"
    building_year_text      VARCHAR(20),       -- "2014年" etc.
    building_year_int       INTEGER,           -- 西暦整数 e.g. 2014
    building_age            INTEGER,           -- 築年数 = current_year - building_year_int
    structure               VARCHAR(30),       -- 構造 e.g. "RC", "SRC"

    -- 最寄駅 (APIから取得不可の場合 null)
    nearest_station         VARCHAR(50),
    station_distance_minutes INTEGER,

    -- 階数 (APIから取得不可の場合 null)
    floor_number            INTEGER,

    -- 向き
    -- NOTE: APIの Direction は住戸の向きではなく前面道路の方位の可能性あり
    direction               VARCHAR(10),

    -- その他
    property_type           VARCHAR(30),       -- "中古マンション等"
    use_category            VARCHAR(30),       -- 用途
    purpose                 VARCHAR(30),       -- 利用目的
    city_planning           VARCHAR(30),       -- 都市計画区分
    renovation              VARCHAR(50),       -- 改装状況
    remarks                 TEXT,              -- 備考

    -- 位置情報 (ジオコーディングによる近似値)
    lat                     NUMERIC(10,7),
    lng                     NUMERIC(11,7),

    -- 生データ保持 (将来拡張用)
    raw_json                JSONB,

    -- タイムスタンプ
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 重複防止用ユニーク制約
-- 同一の取引時期・地区・価格・面積・間取りの組み合わせで重複を防ぐ
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uix_transactions_dedup'
    ) THEN
        ALTER TABLE transactions ADD CONSTRAINT uix_transactions_dedup
            UNIQUE (period_code, municipality_code, district_name, trade_price_yen, area_sqm, floor_plan);
    END IF;
END $$;

-- 検索用インデックス
CREATE INDEX IF NOT EXISTS idx_transactions_period       ON transactions (period_code);
CREATE INDEX IF NOT EXISTS idx_transactions_municipality ON transactions (municipality_code);
CREATE INDEX IF NOT EXISTS idx_transactions_price        ON transactions (trade_price_yen);
CREATE INDEX IF NOT EXISTS idx_transactions_unit_price   ON transactions (unit_price_per_sqm);
CREATE INDEX IF NOT EXISTS idx_transactions_area         ON transactions (area_sqm);
CREATE INDEX IF NOT EXISTS idx_transactions_age          ON transactions (building_age);
CREATE INDEX IF NOT EXISTS idx_transactions_floor_plan   ON transactions (floor_plan);
CREATE INDEX IF NOT EXISTS idx_transactions_latlng       ON transactions (lat, lng);

-- updated_at 自動更新用トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
