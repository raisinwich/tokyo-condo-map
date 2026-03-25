import { NextResponse } from "next/server";
import pool from "@/lib/db";

/**
 * GET /api/filters
 *
 * フィルタUIの選択肢と統計情報を返す。
 */
export async function GET() {
  try {
    const [periodsRes, municipalitiesRes, floorPlansRes, directionsRes, statsRes] =
      await Promise.all([
        pool.query(
          `SELECT DISTINCT period_code as code, period_display as display
           FROM transactions
           WHERE period_code IS NOT NULL
           ORDER BY period_code DESC`
        ),
        pool.query(
          `SELECT DISTINCT municipality_code as code, municipality as name
           FROM transactions
           WHERE municipality_code IS NOT NULL AND municipality IS NOT NULL
           ORDER BY municipality_code`
        ),
        pool.query(
          `SELECT DISTINCT floor_plan
           FROM transactions
           WHERE floor_plan IS NOT NULL AND floor_plan != ''
           ORDER BY floor_plan`
        ),
        pool.query(
          `SELECT DISTINCT direction
           FROM transactions
           WHERE direction IS NOT NULL AND direction != ''
           ORDER BY direction`
        ),
        pool.query(
          `SELECT
             COUNT(*) as total_count,
             ROUND(AVG(unit_price_per_sqm)) as avg_unit_price,
             MIN(unit_price_per_sqm) as min_unit_price,
             MAX(unit_price_per_sqm) as max_unit_price
           FROM transactions`
        ),
      ]);

    return NextResponse.json({
      periods: periodsRes.rows,
      municipalities: municipalitiesRes.rows,
      floor_plans: floorPlansRes.rows.map((r: { floor_plan: string }) => r.floor_plan),
      directions: directionsRes.rows.map((r: { direction: string }) => r.direction),
      stats: {
        total_count: parseInt(statsRes.rows[0].total_count, 10),
        avg_unit_price: statsRes.rows[0].avg_unit_price
          ? parseInt(statsRes.rows[0].avg_unit_price, 10)
          : null,
        min_unit_price: statsRes.rows[0].min_unit_price
          ? parseInt(statsRes.rows[0].min_unit_price, 10)
          : null,
        max_unit_price: statsRes.rows[0].max_unit_price
          ? parseInt(statsRes.rows[0].max_unit_price, 10)
          : null,
      },
    });
  } catch (error) {
    console.error("Failed to query filters:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
