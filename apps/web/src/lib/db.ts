/**
 * PostgreSQL connection pool (server-side only).
 *
 * Neon の接続文字列から channel_binding パラメータを除去する。
 * pg ライブラリが channel_binding=require に対応していないため。
 */
import { Pool } from "pg";

function sanitizeConnectionString(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return url;
  }
}

const pool = new Pool({
  connectionString: sanitizeConnectionString(process.env.DATABASE_URL),
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

export default pool;
