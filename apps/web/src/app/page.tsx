"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import FilterPanel from "@/components/FilterPanel";
import TransactionTable from "@/components/TransactionTable";
import StatsBar from "@/components/StatsBar";
import type {
  Transaction,
  FilterParams,
  FilterOptions,
  TransactionsResponse,
} from "@/types/transaction";

// MapLibre は SSR 不可なので dynamic import
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const PAGE_SIZE = 500;

function buildQuery(filters: FilterParams): string {
  const params = new URLSearchParams();
  if (filters.period_code) params.set("period_code", filters.period_code);
  if (filters.municipality_code) params.set("municipality_code", filters.municipality_code);
  if (filters.floor_plan) params.set("floor_plan", filters.floor_plan);
  if (filters.direction) params.set("direction", filters.direction);
  if (filters.building_age_min != null) params.set("building_age_min", String(filters.building_age_min));
  if (filters.building_age_max != null) params.set("building_age_max", String(filters.building_age_max));
  if (filters.unit_price_min != null) params.set("unit_price_min", String(filters.unit_price_min));
  if (filters.unit_price_max != null) params.set("unit_price_max", String(filters.unit_price_max));
  if (filters.area_min != null) params.set("area_min", String(filters.area_min));
  if (filters.area_max != null) params.set("area_max", String(filters.area_max));
  if (filters.station_distance_min != null) params.set("station_distance_min", String(filters.station_distance_min));
  if (filters.station_distance_max != null) params.set("station_distance_max", String(filters.station_distance_max));
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_order) params.set("sort_order", filters.sort_order);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.offset) params.set("offset", String(filters.offset));
  return params.toString();
}

interface StatsResponse {
  total_count: number;
  avg_unit_price: number | null;
  avg_price: number | null;
  avg_area: number | null;
  avg_age: number | null;
}

export default function HomePage() {
  const [filters, setFilters] = useState<FilterParams>({
    sort_by: "period_code",
    sort_order: "desc",
    limit: PAGE_SIZE,
    offset: 0,
  });
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [data, setData] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    totalCount: 0,
    avgUnitPrice: null as number | null,
    avgPrice: null as number | null,
    avgArea: null as number | null,
    avgAge: null as number | null,
  });
  const [loading, setLoading] = useState(true);
  const [, setSelected] = useState<Transaction | null>(null);

  // フィルタ選択肢を取得
  useEffect(() => {
    fetch("/api/filters")
      .then((r) => r.json())
      .then(setOptions)
      .catch((e) => console.error("Failed to load filters:", e));
  }, []);

  // データ取得
  useEffect(() => {
    setLoading(true);
    const query = buildQuery({ ...filters, offset: 0, limit: PAGE_SIZE });

    Promise.all([
      fetch(`/api/transactions?${query}`).then((r) => r.json()),
      fetch(`/api/stats?${query}`).then((r) => r.json()),
    ])
      .then(([txRes, statsRes]: [TransactionsResponse, StatsResponse]) => {
        setData(txRes.data);
        setTotal(txRes.total);
        setStats({
          totalCount: statsRes.total_count ?? txRes.total,
          avgUnitPrice: statsRes.avg_unit_price ?? null,
          avgPrice: statsRes.avg_price ?? null,
          avgArea: statsRes.avg_area ?? null,
          avgAge: statsRes.avg_age ?? null,
        });
      })
      .catch((e) => console.error("Failed to load data:", e))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.period_code,
    filters.municipality_code,
    filters.floor_plan,
    filters.direction,
    filters.building_age_min,
    filters.building_age_max,
    filters.unit_price_min,
    filters.unit_price_max,
    filters.area_min,
    filters.area_max,
    filters.station_distance_min,
    filters.station_distance_max,
    filters.sort_by,
    filters.sort_order,
  ]);

  const handleSort = useCallback(
    (column: string) => {
      setFilters((prev) => ({
        ...prev,
        sort_by: column,
        sort_order:
          prev.sort_by === column && prev.sort_order === "desc" ? "asc" : "desc",
      }));
    },
    []
  );

  const handleLoadMore = useCallback(() => {
    const nextOffset = data.length;
    const query = buildQuery({ ...filters, offset: nextOffset, limit: PAGE_SIZE });
    fetch(`/api/transactions?${query}`)
      .then((r) => r.json())
      .then((res: TransactionsResponse) => {
        setData((prev) => [...prev, ...res.data]);
      })
      .catch((e) => console.error("Failed to load more:", e));
  }, [data.length, filters]);

  const handleSelect = useCallback((t: Transaction) => {
    setSelected(t);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* ヘッダー */}
      <header className="bg-white border-b px-4 py-2 flex items-center justify-between shrink-0">
        <h1 className="font-bold text-lg">東京都 中古マンション成約マップ</h1>
        <span className="text-xs text-gray-400">
          出典: 国土交通省 不動産情報ライブラリ
        </span>
      </header>

      {/* 統計バー */}
      <StatsBar {...stats} />

      {/* メインコンテンツ */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左: フィルタパネル */}
        <aside className="w-64 shrink-0 border-r overflow-y-auto p-3 bg-white">
          <FilterPanel
            filters={filters}
            options={options}
            onChange={(f) => setFilters({ ...f, sort_by: filters.sort_by, sort_order: filters.sort_order, limit: PAGE_SIZE, offset: 0 })}
            resultCount={total}
          />
        </aside>

        {/* 右: 地図 + テーブル */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* 地図 */}
          <div className="flex-1 min-h-[300px] relative">
            {loading && (
              <div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
                <span className="text-sm text-gray-500">読み込み中...</span>
              </div>
            )}
            <MapView data={data} onSelect={handleSelect} />
          </div>

          {/* テーブル */}
          <div className="h-[300px] shrink-0 border-t overflow-hidden bg-white">
            <TransactionTable
              data={data}
              total={total}
              filters={filters}
              onSort={handleSort}
              onLoadMore={handleLoadMore}
              onSelect={handleSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
