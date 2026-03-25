"use client";

import { formatPrice, formatUnitPrice, formatArea } from "@/lib/format";

interface StatsBarProps {
  totalCount: number;
  avgUnitPrice: number | null;
  avgPrice: number | null;
  avgArea: number | null;
  avgAge: number | null;
}

export default function StatsBar({
  totalCount,
  avgUnitPrice,
  avgPrice,
  avgArea,
  avgAge,
}: StatsBarProps) {
  const items = [
    { label: "件数", value: `${totalCount.toLocaleString()}件` },
    { label: "平均価格", value: formatPrice(avgPrice) },
    { label: "平均㎡単価", value: formatUnitPrice(avgUnitPrice) },
    { label: "平均面積", value: formatArea(avgArea) },
    { label: "平均築年数", value: avgAge != null ? `${avgAge.toFixed(1)}年` : "-" },
  ];

  return (
    <div className="flex gap-4 flex-wrap text-xs text-gray-600 bg-gray-50 px-4 py-2 border-b">
      {items.map((item) => (
        <div key={item.label}>
          <span className="text-gray-400 mr-1">{item.label}:</span>
          <span className="font-medium text-gray-800">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
