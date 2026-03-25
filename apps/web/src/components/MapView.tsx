"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Transaction } from "@/types/transaction";
import { formatPrice, formatTsuboPrice, formatArea, formatAge } from "@/lib/format";

interface MapViewProps {
  data: Transaction[];
  onSelect: (t: Transaction) => void;
}

// 東京都の中心座標
const TOKYO_CENTER: [number, number] = [139.6917, 35.6895];
const TOKYO_ZOOM = 10.5;

/**
 * ㎡単価に応じた色を返す (ヒートマップ的な色分け)
 */
function getPriceColor(unitPrice: number | null): string {
  if (unitPrice == null) return "#888888";
  const man = unitPrice / 10000;
  if (man < 30) return "#3b82f6";   // blue - 安い
  if (man < 60) return "#22c55e";   // green
  if (man < 100) return "#eab308";  // yellow
  if (man < 150) return "#f97316";  // orange
  return "#ef4444";                  // red - 高い
}

/**
 * IDベースの決定論的ジッター。同じ地区座標を持つ点を散らす。
 * 地区レベルの座標に対して ±0.0008度 (約80m) のオフセットを加える。
 * 国交省APIは厳密な物件位置を返さないため、あくまで視覚的な散布用。
 */
function jitter(id: number): [number, number] {
  const a = Math.sin(id * 127.1) * 43758.5453;
  const b = Math.sin(id * 269.5) * 76543.2109;
  const dx = (a - Math.floor(a) - 0.5) * 0.0016;
  const dy = (b - Math.floor(b) - 0.5) * 0.0016;
  return [dx, dy];
}

export default function MapView({ data, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // マップ初期化
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: TOKYO_CENTER,
      zoom: TOKYO_ZOOM,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // マーカー更新
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 既存マーカーを削除
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 座標のあるデータのみマーカー表示 (パフォーマンスのため最大2000件)
    if (!data || !Array.isArray(data)) return;
    const withCoords = data
      .filter((t) => t.lat != null && t.lng != null)
      .slice(0, 2000);

    withCoords.forEach((t) => {
      const el = document.createElement("div");
      el.style.width = "10px";
      el.style.height = "10px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = getPriceColor(t.unit_price_per_sqm);
      el.style.border = "1px solid rgba(255,255,255,0.8)";
      el.style.cursor = "pointer";

      const popup = new maplibregl.Popup({ offset: 10, maxWidth: "280px" }).setHTML(`
        <div style="font-size:12px;line-height:1.5">
          <div style="font-weight:bold;margin-bottom:4px">
            ${t.municipality ?? ""} ${t.district_name ?? ""}
          </div>
          <div>価格: ${formatPrice(t.trade_price_yen)}</div>
          <div>坪単価: ${formatTsuboPrice(t.unit_price_per_sqm)}</div>
          <div>面積: ${formatArea(t.area_sqm)}</div>
          <div>間取り: ${t.floor_plan ?? "-"}</div>
          <div>${formatAge(t.building_age)} / ${t.structure ?? "-"}</div>
          <div style="color:#888;margin-top:2px">${t.period_display ?? ""}</div>
        </div>
      `);

      // IDベースのジッターで同一座標の点を散らす
      // PostgreSQL NUMERIC型が文字列で返される場合があるため Number() で変換
      const [dx, dy] = jitter(t.id);
      const lng = Number(t.lng) + dx;
      const lat = Number(t.lat) + dy;
      if (isNaN(lng) || isNaN(lat)) return;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener("click", () => onSelect(t));
      markersRef.current.push(marker);
    });
  }, [data, onSelect]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[400px]" />
  );
}
