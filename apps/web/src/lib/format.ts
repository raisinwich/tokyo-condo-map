/**
 * 表示用フォーマッタ
 */

/** 価格を万円表示 */
export function formatPrice(yen: number | null): string {
  if (yen == null) return "-";
  const man = Math.round(yen / 10000);
  return `${man.toLocaleString()}万円`;
}

/** ㎡単価を万円/㎡表示 */
export function formatUnitPrice(yen: number | null): string {
  if (yen == null) return "-";
  const man = Math.round(yen / 10000);
  return `${man.toLocaleString()}万円/㎡`;
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
