import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

/**
 * GET /api/stats
 *
 * フィルタ条件に合致するデータの統計情報を返す。
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

  if (sp.get("period_code")) addCondition("period_code = ?", sp.get("period_code"));
  if (sp.get("municipality_code")) addCondition("municipality_code = ?", sp.get("municipality_code"));
  if (sp.get("floor_plan")) addCondition("floor_plan = ?", sp.get("floor_plan"));
  if (sp.get("building_age_min")) addCondition("building_age >= ?", Number(sp.get("building_age_min")));
  if (sp.get("building_age_max")) addCondition("building_age <= ?", Number(sp.get("building_age_max")));
  if (sp.get("unit_price_min")) addCondition("unit_price_per_sqm >= ?", Number(sp.get("unit_price_min")));
  if (sp.get("unit_price_max")) addCondition("unit_price_per_sqm <= ?", Number(sp.get("unit_price_max")));
  if (sp.get("area_min")) addCondition("area_sqm >= ?", Number(sp.get("area_min")));
  if (sp.get("area_max")) addCondition("area_sqm <= ?", Number(sp.get("area_max")));

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const result = await pool.query(
      `SELECT
         COUNT(*) as total_count,
         ROUND(AVG(unit_price_per_sqm)) as avg_unit_price,
         ROUND(AVG(trade_price_yen)) as avg_price,
         ROUND(AVG(area_sqm)::numeric, 1) as avg_area,
         ROUND(AVG(building_age)::numeric, 1) as avg_age
       FROM transactions
       ${whereClause}`,
      values
    );

    const row = result.rows[0];
    return NextResponse.json({
      total_count: parseInt(row.total_count, 10),
      avg_unit_price: row.avg_unit_price ? parseInt(row.avg_unit_price, 10) : null,
      avg_price: row.avg_price ? parseInt(row.avg_price, 10) : null,
      avg_area: row.avg_area ? parseFloat(row.avg_area) : null,
      avg_age: row.avg_age ? parseFloat(row.avg_age) : null,
    });
  } catch (error) {
    console.error("Failed to query stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
