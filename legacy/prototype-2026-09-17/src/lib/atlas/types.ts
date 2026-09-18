export type CityId =
  | "beijing"
  | "shanghai"
  | "guangzhou"
  | "shenzhen"
  | "chengdu"
  | "hongkong";

export type Gender = "all" | "female" | "male";

export type OutcomeId =
  | "hhIncome"
  | "college"
  | "topQuintile"
  | "homeown";

export type IncomeKind = "cny_pc" | "hkd_hh_m";
export type DataSource = "official" | "yearbook" | "census" | "compiled";

export type District = {
  adcode: string;
  cityId: CityId;
  nameZh: string;
  nameEn: string;
  income: number;
  incomeKind: IncomeKind;
  school: number;
  collegeHc: number;
  povertyInv: number;
  incomeMix: number;
  highSkill: number;
  inclusion: number;
  transit: number;
  popWan: number;
  source: DataSource;
  noteZh: string;
  noteEn: string;
};

export type CityDef = {
  id: CityId;
  nameZh: string;
  nameEn: string;
  /** Rank-rank slope (intergenerational persistence). */
  rho: number;
  /** Mean log household income at age 35 (native currency). */
  mu35: number;
  /** SD of log household income at age 35. */
  sigma35: number;
  /** Currency of modeled age-35 household income. */
  currency: "CNY" | "HKD";
  /** Female earnings gap at age 35 (log points, negative). */
  femaleLogGap: number;
  geo: string;
  /** Default map zoom seed. */
  center: [number, number];
};

export type Modeled = {
  quality: number;
  childRank: number;
  hhIncome: number;
  college: number;
  topQuintile: number;
  homeown: number;
};
