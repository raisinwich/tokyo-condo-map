# tokyo-condo-map

東京都の中古マンション成約事例を地図と一覧で可視化する Web アプリケーション。

## データ出典

国土交通省 [不動産情報ライブラリ](https://www.reinfolib.mlit.go.jp/) API (XIT001)

## 構成

```
tokyo-condo-map/
  apps/
    web/          # Next.js フロントエンド (Vercel)
  services/
    ingest/       # Python データ取込スクリプト (Railway)
  sql/
    schema.sql    # PostgreSQL スキーマ定義
  .env.example
  README.md
```

### 技術スタック

| レイヤー | 技術 | デプロイ先 |
|---------|------|-----------|
| フロントエンド | Next.js (App Router) + TypeScript + Tailwind CSS | Vercel |
| 地図 | MapLibre GL JS + OpenStreetMap タイル | - |
| DB | PostgreSQL | Railway |
| データ取込 | Python | Railway (手動実行 or cron) |

## API 仕様と取得可能項目

国交省 XIT001 API から取得可能なフィールド:

| フィールド | 取得可否 | 備考 |
|-----------|---------|------|
| 取引価格 (TradePrice) | OK | |
| 面積 (Area) | OK | |
| 間取り (FloorPlan) | OK | |
| 建築年 (BuildingYear) | OK | 和暦/西暦テキスト → 西暦整数に変換 |
| 構造 (Structure) | OK | RC, SRC 等 |
| 市区町村 (Municipality) | OK | |
| 地区名 (DistrictName) | OK | |
| 取引時期 (Period) | OK | |
| Direction | OK | **注意: 住戸の向きではなく、前面道路の方位の可能性が高い** |
| 改装 (Renovation) | OK | |
| 最寄駅 (NearestStation) | **取得不可** | API レスポンスに含まれない |
| 駅距離 | **取得不可** | API レスポンスに含まれない |
| 階数 | **取得不可** | API レスポンスに含まれない |
| 緯度経度 | **取得不可** | ジオコーディングで近似座標を付与 |

### Direction (向き) について

API の `Direction` フィールドは、不動産取引価格情報における「前面道路の方位」であり、
住戸そのものの「向き」（バルコニー方位など）ではない可能性が高いです。
UI では「向き ※前面道路方位」と注記しています。

### 座標について

API は物件の緯度経度を返しません。
取込時に市区町村+地区名から Nominatim (OpenStreetMap) でジオコーディングし、
近似座標を付与しています。**厳密な物件位置ではありません。**

## セットアップ

### 前提条件

- Node.js 18+
- Python 3.10+
- PostgreSQL 15+
- 国交省 不動産情報ライブラリ API キー
  → [API利用申請](https://www.reinfolib.mlit.go.jp/api/request/)

### 1. リポジトリクローン

```bash
git clone https://github.com/<your-user>/tokyo-condo-map.git
cd tokyo-condo-map
cp .env.example .env
```

### 2. 環境変数設定

`.env` を編集:

```
MLIT_API_KEY=your_api_key_here
DATABASE_URL=postgresql://user:pass@localhost:5432/tokyo_condo_map
```

### 3. DB セットアップ

```bash
createdb tokyo_condo_map
psql tokyo_condo_map < sql/schema.sql
```

### 4. データ取込 (ingest)

```bash
cd services/ingest
pip install -r requirements.txt
python ingest.py
```

オプション:
```bash
# 特定四半期のみ
python ingest.py --year 2024 --quarter 3

# ジオコーディングなし (高速)
python ingest.py --skip-geocode

# 外部API不使用 (市区町村中心座標のみ)
python ingest.py --no-nominatim
```

### 5. フロントエンド起動

```bash
cd apps/web
npm install
npm run dev
```

http://localhost:3000 でアクセス。

## デプロイ

### Railway (DB + ingest)

1. Railway で新規プロジェクトを作成
2. PostgreSQL プラグインを追加
3. 環境変数を設定:
   - `DATABASE_URL`: Railway PostgreSQL の接続文字列 (自動設定される)
   - `MLIT_API_KEY`: 国交省 API キー
4. schema.sql を実行:
   ```bash
   psql $DATABASE_URL < sql/schema.sql
   ```
5. ingest を実行:
   - Railway CLI: `railway run python services/ingest/ingest.py`
   - または Railway Cron Job として設定

### Vercel (フロントエンド)

1. GitHub リポジトリを Vercel に接続
2. Root Directory を `apps/web` に設定
3. 環境変数を設定:
   - `DATABASE_URL`: Railway PostgreSQL の Public URL
4. デプロイ (push で自動デプロイ)

### 定期データ更新

Railway Cron Job で四半期ごとに取込を自動化可能:

```bash
# 毎月1日に最新四半期を取り込む
python services/ingest/ingest.py --count 2
```

## API エンドポイント

### GET /api/transactions

クエリパラメータ:
- `period_code` - 取引時期コード (e.g. "20241")
- `municipality_code` - 市区町村コード (e.g. "13103")
- `floor_plan` - 間取り (e.g. "2LDK")
- `building_age_min`, `building_age_max` - 築年数範囲
- `unit_price_min`, `unit_price_max` - ㎡単価範囲 (円)
- `area_min`, `area_max` - 面積範囲 (㎡)
- `sort_by` - ソート列
- `sort_order` - "asc" or "desc"
- `limit`, `offset` - ページネーション

### GET /api/filters

フィルタ UI の選択肢と統計情報を返す。

### GET /api/stats

フィルタ条件に合致するデータの統計情報を返す。

## 今後の改善案

1. **GeoJSON タイル API の活用** - 正確な座標データの取得
2. **クラスタリング** - 大量マーカーのパフォーマンス改善
3. **CSV エクスポート** - 一覧データのダウンロード機能
4. **価格推移グラフ** - 地域・間取り別の時系列分析
5. **お気に入り機能** - 気になる物件のブックマーク
6. **駅データの外部結合** - 駅マスタとの紐付けによる駅距離推定
7. **面グラフ表示** - 町丁目単位での平均㎡単価ヒートマップ

## ライセンス

MIT
