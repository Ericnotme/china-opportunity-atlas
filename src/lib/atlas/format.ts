import { CITY_BY_ID } from "./cities";
import type { CityId, District, OutcomeId } from "./types";

export function formatIncome(value: number, cityId: CityId, compact = false): string {
  const cur = CITY_BY_ID[cityId].currency;
  if (cur === "HKD") {
    if (compact) return `HK$${Math.round(value / 1000)}k`;
    return `HK$${Math.round(value).toLocaleString("en-HK")}`;
  }
  if (value >= 10000) {
    const wan = value / 10000;
    return compact ? `${wan.toFixed(wan >= 10 ? 0 : 1)}万` : `${wan.toFixed(1)} 万元`;
  }
  return `¥${Math.round(value).toLocaleString("zh-CN")}`;
}

export function formatPct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

export function formatOutcome(
  value: number,
  outcome: OutcomeId,
  cityId: CityId,
  compact = false,
): string {
  if (outcome === "hhIncome") return formatIncome(value, cityId, compact);
  return formatPct(value);
}

export function parentIncomeLabel(d: District, parentPct: number): string {
  // Map percentile onto observed district-mean income loosely for display only.
  const scale = Math.exp((parentPct - 50) / 40);
  if (d.incomeKind === "hkd_hh_m") {
    const monthly = d.income * scale;
    return `约 HK$${Math.round(monthly).toLocaleString("en-HK")}/月`;
  }
  return `约 ${Math.round((d.income * scale) / 1000) / 10} 万元/年·人均`;
}
