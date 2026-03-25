/**
 * 表示用フォーマッタ
 */

/** 価格を万円表示 */
export function formatPrice(yen: number | null): string {
  if (yen == null) return "-";
  const man = Math.round(yen / 10000);
  return `${man.toLocaleString()}万円`;
}

/** 1坪 = 3.30579㎡ */
const TSUBO_PER_SQM = 3.30579;

/** ㎡単価から坪単価(万円/坪)を計算して表示 */
export function formatTsuboPrice(yenPerSqm: number | null): string {
  if (yenPerSqm == null) return "-";
  const yenPerTsubo = yenPerSqm * TSUBO_PER_SQM;
  const man = Math.round(yenPerTsubo / 10000);
  return `${man.toLocaleString()}万円/坪`;
}

/** ㎡単価(円)から坪単価(円)に変換 */
export function sqmToTsubo(yenPerSqm: number | null): number | null {
  if (yenPerSqm == null) return null;
  return Math.round(yenPerSqm * TSUBO_PER_SQM);
}

/** 坪単価(円)から㎡単価(円)に変換 */
export function tsuboToSqm(yenPerTsubo: number | null): number | null {
  if (yenPerTsubo == null) return null;
  return Math.round(yenPerTsubo / TSUBO_PER_SQM);
}

/** 面積を表示 */
export function formatArea(sqm: number | null): string {
  if (sqm == null) return "-";
  return `${sqm}㎡`;
}

/** 築年数を表示 */
export function formatAge(age: number | null): string {
  if (age == null) return "-";
  if (age <= 0) return "新築";
  return `築${age}年`;
}

/** 駅距離を表示 */
export function formatStationDistance(min: number | null): string {
  if (min == null) return "-";
  return `徒歩${min}分`;
}
