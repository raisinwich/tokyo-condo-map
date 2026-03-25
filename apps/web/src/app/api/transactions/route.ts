import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

/**
 * GET /api/transactions
 *
 * クエリパラメータでフィルタリングした取引データを返す。
 * 地図表示と一覧表示の両方で使用。
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 0;

  function addCondition(sql: string, value: unknown) {
    paramIndex++;
    conditions.push(sql.replace("?", `$${paramIndex}`));
    values.push(value);
  }

  // フィルタ条件
  if (sp.get("period_code")) addCondition("period_code = ?", sp.get("period_code"));
  if (sp.get("municipality_code")) addCondition("municipality_code = ?", sp.get("municipality_code"));
  if (sp.get("district_name")) addCondition("district_name = ?", sp.get("district_name"));
  if (sp.get("floor_plan")) addCondition("floor_plan = ?", sp.get("floor_plan"));
  if (sp.get("direction")) addCondition("direction = ?", sp.get("direction"));

  if (sp.get("building_age_min")) addCondition("building_age >= ?", Number(sp.get("building_age_min")));
  if (sp.get("building_age_max")) addCondition("building_age <= ?", Number(sp.get("building_age_max")));
  if (sp.get("unit_price_min")) addCondition("unit_price_per_sqm >= ?", Number(sp.get("unit_price_min")));
  if (sp.get("unit_price_max")) addCondition("unit_price_per_sqm <= ?", Number(sp.get("unit_price_max")));
  if (sp.get("area_min")) addCondition("area_sqm >= ?", Number(sp.get("area_min")));
  if (sp.get("area_max")) addCondition("area_sqm <= ?", Number(sp.get("area_max")));
  if (sp.get("station_distance_min")) addCondition("station_distance_minutes >= ?", Number(sp.get("station_distance_min")));
  if (sp.get("station_distance_max")) addCondition("station_distance_minutes <= ?", Number(sp.get("station_distance_max")));
  if (sp.get("floor_number_min")) addCondition("floor_number >= ?", Number(sp.get("floor_number_min")));
  if (sp.get("floor_number_max")) addCondition("floor_number <= ?", Number(sp.get("floor_number_max")));
  if (sp.get("price_min")) addCondition("trade_price_yen >= ?", Number(sp.get("price_min")));
  if (sp.get("price_max")) addCondition("trade_price_yen <= ?", Number(sp.get("price_max")));

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // ソート
  const allowedSortColumns = [
    "trade_price_yen", "unit_price_per_sqm", "area_sqm",
    "building_age", "period_code", "municipality",
  ];
  const sortBy = allowedSortColumns.includes(sp.get("sort_by") ?? "")
    ? sp.get("sort_by")
    : "period_code";
  const sortOrder = sp.get("sort_order") === "asc" ? "ASC" : "DESC";

  // ページネーション
  const limit = Math.min(Number(sp.get("limit")) || 500, 5000);
  const offset = Number(sp.get("offset")) || 0;

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM transactions ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataResult = await pool.query(
      `SELECT
        id, period_code, period_display,
        prefecture, municipality, municipality_code,
        district_name,
        trade_price_yen, unit_price_per_sqm,
        area_sqm, floor_plan,
        building_year_text, building_year_int, building_age,
        structure,
        nearest_station, station_distance_minutes,
        floor_number, direction,
        renovation, remarks,
        lat, lng
      FROM transactions
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder} NULLS LAST
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}`,
      [...values, limit, offset]
    );

    return NextResponse.json({
      data: dataResult.rows,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Failed to query transactions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
