import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CITY_BY_ID } from "@/lib/atlas/cities";
import { DISTRICTS, DISTRICT_BY_ADCODE, districtsInCity } from "@/lib/atlas/districts";
import { formatOutcome } from "@/lib/atlas/format";
import { COPY } from "@/lib/atlas/i18n";
import {
  COVARIATE_KEYS,
  exposedIncome,
  modelDistrict,
  outcomeValue,
} from "@/lib/atlas/model";
import { useAtlas } from "@/lib/atlas/store";

export function DistrictDetail({ onClose }: { onClose?: () => void }) {
  const { selected, parentPct, gender, outcome, lang, cityId } = useAtlas();
  const t = COPY[lang];
  const d = selected ? DISTRICT_BY_ADCODE[selected] : undefined;
  if (!d) {
    const city = CITY_BY_ID[cityId];
    const cityDs = districtsInCity(cityId);
    const models = cityDs.map((x) => ({ d: x, m: modelDistrict(x, parentPct, gender) }));
    const sorted = [...models].sort((a, b) => b.m.hhIncome - a.m.hhIncome);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const mid = sorted[Math.floor(sorted.length / 2)];
    return (
      <div className="flex h-full flex-col gap-4 p-5">
        <div>
          <div className="text-[11px] text-muted">{t.click}</div>
          <h2 className="font-display text-2xl text-paper">
            {lang === "zh" ? city.nameZh : city.nameEn}
          </h2>
          <p className="text-xs text-muted">
            {cityDs.length} {lang === "zh" ? "个区级单元" : "districts"}
          </p>
        </div>
        {mid && best && worst && (
          <div className="grid grid-cols-1 gap-2">
            <Stat
              label={lang === "zh" ? "本市中位估计" : "City median"}
              value={formatOutcome(mid.m.hhIncome, "hhIncome", cityId, true)}
            />
            <Stat
              label={lang === "zh" ? `最高 · ${best.d.nameZh}` : `Highest · ${best.d.nameEn}`}
              value={formatOutcome(best.m.hhIncome, "hhIncome", cityId, true)}
            />
            <Stat
              label={lang === "zh" ? `最低 · ${worst.d.nameZh}` : `Lowest · ${worst.d.nameEn}`}
              value={formatOutcome(worst.m.hhIncome, "hhIncome", cityId, true)}
            />
          </div>
        )}
        <p className="mt-auto text-[11px] leading-relaxed text-faint">{t.disclaimer}</p>
      </div>
    );
  }

  const m = modelDistrict(d, parentPct, gender);
  const cityDs = districtsInCity(d.cityId);
  const cityModels = cityDs.map((x) => ({
    d: x,
    m: modelDistrict(x, parentPct, gender),
  }));
  const sortedCity = [...cityModels].sort(
    (a, b) => outcomeValue(b.m, outcome) - outcomeValue(a.m, outcome),
  );
  const cityRank = sortedCity.findIndex((x) => x.d.adcode === d.adcode) + 1;
  const allSorted = DISTRICTS.map((x) => ({
    d: x,
    m: modelDistrict(x, parentPct, gender),
  })).sort((a, b) => outcomeValue(b.m, outcome) - outcomeValue(a.m, outcome));
  const allRank = allSorted.findIndex((x) => x.d.adcode === d.adcode) + 1;
  const worst = [...cityModels].sort((a, b) => a.m.hhIncome - b.m.hhIncome)[0];
  const city = CITY_BY_ID[d.cityId];
  const cityName = lang === "zh" ? city.nameZh : city.nameEn;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <div className="text-[11px] text-muted">
            {cityName}
            <span className="mx-1.5 text-faint">/</span>
            {d.adcode}
          </div>
          <h2 className="font-display text-xl leading-tight">
            {lang === "zh" ? d.nameZh : d.nameEn}
          </h2>
          <div className="text-xs text-muted">{lang === "zh" ? d.nameEn : d.nameZh}</div>
        </div>
        {onClose && (
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        )}
      </div>

      <div className="space-y-5 px-4 py-4">
        <div>
          <div className="text-[11px] tracking-wide text-muted uppercase">
            {t.outcomes[outcome]}
          </div>
          <div className="font-display text-3xl tabular-nums tracking-tight">
            {formatOutcome(outcomeValue(m, outcome), outcome, d.cityId)}
          </div>
          <div className="mt-1 text-xs text-muted">
            {t.cityRank} {cityRank}/{cityDs.length}
            <span className="mx-1.5 text-faint">·</span>
            {t.allRank} {allRank}/{DISTRICTS.length}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat label={t.quality} value={`${Math.round(m.quality * 100)}`} />
          <Stat label={t.rank} value={`P${Math.round(m.childRank)}`} />
        </div>

        <div>
          <div className="mb-2 text-[11px] tracking-wide text-muted uppercase">
            {t.covariates}
          </div>
          <div className="space-y-1.5">
            {COVARIATE_KEYS.map((k) => (
              <div key={k} className="flex items-center gap-2 text-[11px]">
                <span className="w-[7.5rem] shrink-0 text-muted">{t.cov[k]}</span>
                <div className="h-1.5 flex-1 rounded-full bg-paper/10">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${String(d[k])}%` }}
                  />
                </div>
                <span className="w-7 text-right tabular-nums text-paper-2">{d[k]}</span>
              </div>
            ))}
          </div>
        </div>

        {worst && worst.d.adcode !== d.adcode && (
          <div>
            <div className="mb-1 text-[11px] tracking-wide text-muted uppercase">
              {t.exposure}
            </div>
            <p className="mb-2 text-[11px] leading-snug text-faint">{t.exposureHint}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat
                label={t.moveBirth}
                value={formatOutcome(exposedIncome(worst.m, m, 0), "hhIncome", d.cityId, true)}
              />
              <Stat
                label={t.move10}
                value={formatOutcome(exposedIncome(worst.m, m, 10), "hhIncome", d.cityId, true)}
              />
            </div>
            <div className="mt-1 text-[11px] text-faint">
              {lang === "zh" ? "对照区" : "Origin"}:{" "}
              {lang === "zh" ? worst.d.nameZh : worst.d.nameEn}
            </div>
          </div>
        )}

        <p className="text-xs leading-relaxed text-paper-2">
          {lang === "zh" ? d.noteZh : d.noteEn}
        </p>

        <div className="text-[11px] text-muted">
          {t.source}: {t.sources[d.source]}
          <span className="mx-1.5 text-faint">·</span>
          {lang === "zh" ? "常住人口约" : "Population ~"} {d.popWan}
          {lang === "zh" ? " 万" : "0k"}
        </div>

        <Link
          to="/compare"
          search={{ a: d.adcode }}
          className="block rounded-sm bg-paper px-3 py-2 text-center text-sm text-ink"
        >
          {t.compare}
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-ink px-3 py-2">
      <div className="text-[10px] text-muted">{label}</div>
      <div className="font-display text-lg tabular-nums">{value}</div>
    </div>
  );
}

export function DistrictPanel() {
  const { setSelected } = useAtlas();
  return <DistrictDetail onClose={() => setSelected(null)} />;
}

export function MobileDistrictSheet() {
  const { selected, setSelected } = useAtlas();
  if (!selected) return null;
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 max-h-[62%] overflow-hidden rounded-t-xl border-t border-line bg-ink-2 shadow-2xl lg:hidden">
      <DistrictDetail onClose={() => setSelected(null)} />
    </div>
  );
}
