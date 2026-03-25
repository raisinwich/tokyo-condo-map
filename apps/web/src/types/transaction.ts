/**
 * 取引データの型定義
 */
export interface Transaction {
  id: number;
  period_code: string | null;
  period_display: string | null;
  prefecture: string | null;
  municipality: string | null;
  municipality_code: string | null;
  district_name: string | null;
  district_code: string | null;
  trade_price_yen: number | null;
  unit_price_per_sqm: number | null;
  area_sqm: number | null;
  total_floor_area_sqm: number | null;
  floor_plan: string | null;
  building_year_text: string | null;
  building_year_int: number | null;
  building_age: number | null;
  structure: string | null;
  /** APIから取得不可の場合 null */
  nearest_station: string | null;
  /** APIから取得不可の場合 null */
  station_distance_minutes: number | null;
  /** APIから取得不可の場合 null */
  floor_number: number | null;
  /**
   * 前面道路の方位の可能性あり（住戸の向きではない場合がある）
   * @see README.md
   */
  direction: string | null;
  property_type: string | null;
  use_category: string | null;
  purpose: string | null;
  city_planning: string | null;
  renovation: string | null;
  remarks: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * フィルタ条件
 */
export interface FilterParams {
  period_code?: string;
  building_age_min?: number;
  building_age_max?: number;
  unit_price_min?: number;
  unit_price_max?: number;
  area_min?: number;
  area_max?: number;
  station_distance_min?: number;
  station_distance_max?: number;
  floor_number_min?: number;
  floor_number_max?: number;
  direction?: string;
  floor_plan?: string;
  municipality_code?: string;
  district_name?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/**
 * フィルタ選択肢
 */
export interface FilterOptions {
  periods: { code: string; display: string }[];
  municipalities: { code: string; name: string }[];
  districts: string[];
  floor_plans: string[];
  directions: string[];
  stats: {
    total_count: number;
    avg_unit_price: number | null;
    min_unit_price: number | null;
    max_unit_price: number | null;
  };
}

/**
 * API レスポンス
 */
export interface TransactionsResponse {
  data: Transaction[];
  total: number;
  limit: number;
  offset: number;
}
