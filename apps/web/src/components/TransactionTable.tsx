"use client";

import { Transaction, FilterParams } from "@/types/transaction";
import { formatPrice, formatUnitPrice, formatArea, formatAge, formatStationDistance } from "@/lib/format";

interface TransactionTableProps {
  data: Transaction[];
  total: number;
  filters: FilterParams;
  onSort: (column: string) => void;
  onLoadMore: () => void;
  onSelect: (t: Transaction) => void;
}

type SortableColumn = {
  key: string;
  label: string;
  sortable: boolean;
  render: (t: Transaction) => string;
};

const COLUMNS: SortableColumn[] = [
  { key: "period_code", label: "時期", sortable: true, render: (t) => t.period_display ?? "-" },
  { key: "municipality", label: "区市町村", sortable: false, render: (t) => t.municipality ?? "-" },
  { key: "district_name", label: "地区名", sortable: false, render: (t) => t.district_name ?? "-" },
  { key: "trade_price_yen", label: "価格", sortable: true, render: (t) => formatPrice(t.trade_price_yen) },
  { key: "unit_price_per_sqm", label: "㎡単価", sortable: true, render: (t) => formatUnitPrice(t.unit_price_per_sqm) },
  { key: "area_sqm", label: "面積", sortable: true, render: (t) => formatArea(t.area_sqm) },
  { key: "building_age", label: "築年数", sortable: true, render: (t) => formatAge(t.building_age) },
  { key: "floor_plan", label: "間取り", sortable: false, render: (t) => t.floor_plan ?? "-" },
  { key: "structure", label: "構造", sortable: false, render: (t) => t.structure ?? "-" },
  { key: "nearest_station", label: "最寄駅", sortable: false, render: (t) => t.nearest_station ?? "-" },
  { key: "station_distance", label: "駅距離", sortable: false, render: (t) => formatStationDistance(t.station_distance_minutes) },
  { key: "floor_number", label: "階数", sortable: false, render: (t) => t.floor_number != null ? `${t.floor_number}階` : "-" },
  { key: "direction", label: "向き", sortable: false, render: (t) => t.direction ?? "-" },
];

export default function TransactionTable({
  data,
  total,
  filters,
  onSort,
  onLoadMore,
  onSelect,
}: TransactionTableProps) {
  const safeData = data ?? [];
  const hasMore = safeData.length < total;

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-white z-10">
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`border-b px-2 py-1.5 text-left whitespace-nowrap ${
                    col.sortable ? "cursor-pointer hover:bg-gray-50" : ""
                  }`}
                  onClick={() => col.sortable && onSort(col.key)}
                >
                  {col.label}
                  {col.sortable && filters.sort_by === col.key && (
                    <span className="ml-0.5">
                      {filters.sort_order === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {safeData.map((t) => (
              <tr
                key={t.id}
                className="hover:bg-blue-50 cursor-pointer transition"
                onClick={() => onSelect(t)}
              >
                {COLUMNS.map((col) => (
                  <td key={col.key} className="border-b px-2 py-1 whitespace-nowrap">
                    {col.render(t)}
                  </td>
                ))}
              </tr>
            ))}
            {safeData.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="text-center py-8 text-gray-400">
                  データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div className="py-2 text-center border-t">
          <button
            className="text-blue-600 hover:underline text-xs"
            onClick={onLoadMore}
          >
            さらに読み込む（{safeData.length} / {total.toLocaleString()}件）
          </button>
        </div>
      )}
    </div>
  );
}
