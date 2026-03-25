"use client";

import { FilterOptions, FilterParams } from "@/types/transaction";
import { sqmToTsubo, tsuboToSqm } from "@/lib/format";

interface FilterPanelProps {
  filters: FilterParams;
  options: FilterOptions | null;
  onChange: (filters: FilterParams) => void;
  resultCount: number;
}

export default function FilterPanel({
  filters,
  options,
  onChange,
  resultCount,
}: FilterPanelProps) {
  function update(partial: Partial<FilterParams>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base">フィルタ</h2>
        <span className="text-xs text-gray-500">
          {(resultCount ?? 0).toLocaleString()}件
        </span>
      </div>

      {/* 取引時期 */}
      <fieldset>
        <label className="block font-medium mb-1">取引時期</label>
        <select
          className="w-full border rounded px-2 py-1.5"
          value={filters.period_code ?? ""}
          onChange={(e) => update({ period_code: e.target.value || undefined })}
        >
          <option value="">すべて</option>
          {options?.periods?.map((p) => (
            <option key={p.code} value={p.code}>
              {p.display}
            </option>
          ))}
        </select>
      </fieldset>

      {/* 区市町村 */}
      <fieldset>
        <label className="block font-medium mb-1">区市町村</label>
        <select
          className="w-full border rounded px-2 py-1.5"
          value={filters.municipality_code ?? ""}
          onChange={(e) =>
            update({ municipality_code: e.target.value || undefined })
          }
        >
          <option value="">すべて</option>
          {options?.municipalities?.map((m) => (
            <option key={m.code} value={m.code}>
              {m.name}
            </option>
          ))}
        </select>
      </fieldset>

      {/* 間取り */}
      <fieldset>
        <label className="block font-medium mb-1">間取り</label>
        <select
          className="w-full border rounded px-2 py-1.5"
          value={filters.floor_plan ?? ""}
          onChange={(e) => update({ floor_plan: e.target.value || undefined })}
        >
          <option value="">すべて</option>
          {options?.floor_plans?.map((fp) => (
            <option key={fp} value={fp}>
              {fp}
            </option>
          ))}
        </select>
      </fieldset>

      {/* 築年数 */}
      <fieldset>
        <label className="block font-medium mb-1">築年数</label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="下限"
            className="w-full border rounded px-2 py-1.5"
            value={filters.building_age_min ?? ""}
            onChange={(e) =>
              update({
                building_age_min: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
          />
          <span>〜</span>
          <input
            type="number"
            placeholder="上限"
            className="w-full border rounded px-2 py-1.5"
            value={filters.building_age_max ?? ""}
            onChange={(e) =>
              update({
                building_age_max: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
          />
        </div>
      </fieldset>

      {/* 坪単価 (万円/坪) — 内部では㎡単価(円)で保持 */}
      <fieldset>
        <label className="block font-medium mb-1">坪単価（万円/坪）</label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="下限"
            className="w-full border rounded px-2 py-1.5"
            value={
              filters.unit_price_min
                ? Math.round((sqmToTsubo(filters.unit_price_min) ?? 0) / 10000)
                : ""
            }
            onChange={(e) =>
              update({
                unit_price_min: e.target.value
                  ? tsuboToSqm(Number(e.target.value) * 10000) ?? undefined
                  : undefined,
              })
            }
          />
          <span>〜</span>
          <input
            type="number"
            placeholder="上限"
            className="w-full border rounded px-2 py-1.5"
            value={
              filters.unit_price_max
                ? Math.round((sqmToTsubo(filters.unit_price_max) ?? 0) / 10000)
                : ""
            }
            onChange={(e) =>
              update({
                unit_price_max: e.target.value
                  ? tsuboToSqm(Number(e.target.value) * 10000) ?? undefined
                  : undefined,
              })
            }
          />
        </div>
      </fieldset>

      {/* 面積 */}
      <fieldset>
        <label className="block font-medium mb-1">面積（㎡）</label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="下限"
            className="w-full border rounded px-2 py-1.5"
            value={filters.area_min ?? ""}
            onChange={(e) =>
              update({
                area_min: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
          <span>〜</span>
          <input
            type="number"
            placeholder="上限"
            className="w-full border rounded px-2 py-1.5"
            value={filters.area_max ?? ""}
            onChange={(e) =>
              update({
                area_max: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      </fieldset>

      {/* 駅距離 (APIから取得不可の場合は非表示の可能性あり) */}
      <fieldset>
        <label className="block font-medium mb-1">
          駅距離（分）
          <span className="text-xs text-gray-400 ml-1">※データがある場合のみ</span>
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="下限"
            className="w-full border rounded px-2 py-1.5"
            value={filters.station_distance_min ?? ""}
            onChange={(e) =>
              update({
                station_distance_min: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
          />
          <span>〜</span>
          <input
            type="number"
            placeholder="上限"
            className="w-full border rounded px-2 py-1.5"
            value={filters.station_distance_max ?? ""}
            onChange={(e) =>
              update({
                station_distance_max: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
          />
        </div>
      </fieldset>

      {/* 向き */}
      {options?.directions && options.directions.length > 0 && (
        <fieldset>
          <label className="block font-medium mb-1">
            向き
            <span className="text-xs text-gray-400 ml-1">※前面道路方位</span>
          </label>
          <select
            className="w-full border rounded px-2 py-1.5"
            value={filters.direction ?? ""}
            onChange={(e) =>
              update({ direction: e.target.value || undefined })
            }
          >
            <option value="">すべて</option>
            {options.directions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </fieldset>
      )}

      {/* リセット */}
      <button
        className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm transition"
        onClick={() => onChange({})}
      >
        条件をリセット
      </button>
    </div>
  );
}
