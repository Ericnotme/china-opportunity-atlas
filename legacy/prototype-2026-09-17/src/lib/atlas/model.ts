import { CITY_BY_ID } from "./cities";
import type { District, Gender, Modeled, OutcomeId } from "./types";

/**
 * Neighborhood quality weights follow Chetty et al. (Opportunity Atlas):
 * schools, poverty, income mixing and social/job access dominate.
 * `inclusion` is the China-specific hukou / school-access term.
 */
const WEIGHTS = {
  school: 0.28,
  collegeHc: 0.16,
  povertyInv: 0.16,
  incomeMix: 0.12,
  highSkill: 0.12,
  inclusion: 0.08,
  transit: 0.08,
} as const;

/** Inverse standard-normal CDF (Acklam, 2003). */
function invNorm(pRaw: number): number {
  const p = Math.min(0.999, Math.max(0.001, pRaw));
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577459590407e2, -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];
  const plow = 0.02425;
  const phigh = 1 - plow;
  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p > phigh) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  const q = p - 0.5;
  const r = q * q;
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function neighborhoodQuality(d: District): number {
  const raw =
    WEIGHTS.school * d.school +
    WEIGHTS.collegeHc * d.collegeHc +
    WEIGHTS.povertyInv * d.povertyInv +
    WEIGHTS.incomeMix * d.incomeMix +
    WEIGHTS.highSkill * d.highSkill +
    WEIGHTS.inclusion * d.inclusion +
    WEIGHTS.transit * d.transit;
  return raw / 100;
}

/**
 * Rank-rank mapping in the spirit of Chetty, Hendren & Katz:
 *   R_c = 50 + ρ (p − 50) + θ(p) (Q − Q̄) · 100 + γ_g
 * Neighborhoods get a larger coefficient for children from poorer families.
 */
export function modelDistrict(
  d: District,
  parentPct: number,
  gender: Gender,
): Modeled {
  const city = CITY_BY_ID[d.cityId];
  const Q = neighborhoodQuality(d);
  const p = clamp(parentPct, 1, 99);
  const theta = 0.22 + 0.28 * (1 - p / 100);
  const persist = city.rho * (p - 50);
  const neigh = theta * (Q - 0.5) * 100;
  const g =
    gender === "female" ? -6 : gender === "male" ? 2.5 : 0;
  const childRank = clamp(50 + persist + neigh + g, 3, 97);

  const z = invNorm(childRank / 100);
  const female = gender === "female" ? city.femaleLogGap : 0;
  const logY = city.mu35 + city.sigma35 * z + female * 0.5;
  const hhIncome = Math.exp(logY);

  const college = clamp(
    0.18 + 0.55 * Q + 0.0045 * (p - 25) + (gender === "female" ? 0.04 : 0),
    0.05,
    0.95,
  );
  const topQuintile = clamp(
    1 / (1 + Math.exp(-( -2.35 + 3.4 * Q + 0.018 * (p - 25)))),
    0.02,
    0.72,
  );
  // Homeownership: opportunity raises income, but expensive districts price
  // low-income children out of local ownership — a Chetty-like tension.
  const priceBarrier = clamp((d.income - 50000) / 80000, 0, 1);
  const homeown = clamp(
    0.22 + 0.4 * Q - 0.28 * priceBarrier * (1 - p / 100) + 0.003 * (p - 50),
    0.06,
    0.82,
  );

  return { quality: Q, childRank, hhIncome, college, topQuintile, homeown };
}

export function outcomeValue(m: Modeled, outcome: OutcomeId): number {
  switch (outcome) {
    case "hhIncome":
      return m.hhIncome;
    case "college":
      return m.college;
    case "topQuintile":
      return m.topQuintile;
    case "homeown":
      return m.homeown;
  }
}

/**
 * Childhood exposure: Chetty & Hendren movers design.
 * Share of the place gap captured ≈ remaining childhood years / 18.
 */
export function exposureShare(moveAge: number): number {
  return clamp((18 - moveAge) / 18, 0, 1);
}

export function exposedIncome(
  origin: Modeled,
  dest: Modeled,
  moveAge: number,
): number {
  const s = exposureShare(moveAge);
  return origin.hhIncome + s * (dest.hhIncome - origin.hhIncome);
}

export const COVARIATE_KEYS = [
  "school",
  "collegeHc",
  "povertyInv",
  "incomeMix",
  "highSkill",
  "inclusion",
  "transit",
] as const;

export type CovariateKey = (typeof COVARIATE_KEYS)[number];
