import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Chrome } from "@/components/atlas/Chrome";
import { CITIES, CITY_BY_ID } from "@/lib/atlas/cities";
import { DISTRICTS, DISTRICT_BY_ADCODE } from "@/lib/atlas/districts";
import { formatOutcome } from "@/lib/atlas/format";
import { COPY } from "@/lib/atlas/i18n";
import {
  COVARIATE_KEYS,
  exposedIncome,
  modelDistrict,
  neighborhoodQuality,
} from "@/lib/atlas/model";
import { useAtlas } from "@/lib/atlas/store";
import type { District } from "@/lib/atlas/types";

type Search = { a?: string; b?: string };

export const Route = createFileRoute("/compare")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    a: typeof s.a === "string" ? s.a : undefined,
    b: typeof s.b === "string" ? s.b : undefined,
  }),
  component: ComparePage,
});

function ComparePage() {
  const { a, b } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { parentPct, gender, lang } = useAtlas();
  const t = COPY[lang];
  const left = a ? DISTRICT_BY_ADCODE[a] : undefined;
  const right = b ? DISTRICT_BY_ADCODE[b] : undefined;

  return (
    <Chrome>
      <div className="mx-auto h-full max-w-5xl overflow-y-auto px-4 py-6">
        <h1 className="font-display text-2xl text-paper">{t.compareTitle}</h1>
        <p className="mt-1 mb-5 text-sm text-muted">{t.comparePick}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <Picker
            label={lang === "zh" ? "区 A" : "District A"}
            value={a}
            onChange={(v) => navigate({ search: (prev) => ({ ...prev, a: v }) })}
          />
          <Picker
            label={lang === "zh" ? "区 B" : "District B"}
            value={b}
            onChange={(v) => navigate({ search: (prev) => ({ ...prev, b: v }) })}
          />
        </div>
        {left && right ? (
          <CompareBody left={left} right={right} parentPct={parentPct} gender={gender} />
        ) : (
          <p className="mt-8 text-sm text-muted">{t.click}</p>
        )}
      </div>
    </Chrome>
  );
}

function Picker({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  const lang = useAtlas((s) => s.lang);
  return (
    <label className="block text-xs text-muted">
      {label}
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-11 w-full rounded-sm border border-line bg-ink-2 px-2 text-sm text-paper"
      >
        <option value="">{lang === "zh" ? "选择…" : "Select…"}</option>
        {CITIES.map((c) => (
          <optgroup key={c.id} label={lang === "zh" ? c.nameZh : c.nameEn}>
            {DISTRICTS.filter((d) => d.cityId === c.id).map((d) => (
              <option key={d.adcode} value={d.adcode}>
                {lang === "zh" ? d.nameZh : d.nameEn}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function CompareBody({
  left,
  right,
  parentPct,
  gender,
}: {
  left: District;
  right: District;
  parentPct: number;
  gender: "all" | "female" | "male";
}) {
  const lang = useAtlas((s) => s.lang);
  const t = COPY[lang];
  const lm = useMemo(() => modelDistrict(left, parentPct, gender), [left, parentPct, gender]);
  const rm = useMemo(() => modelDistrict(right, parentPct, gender), [right, parentPct, gender]);
  const gap = rm.hhIncome - lm.hhIncome;

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-3 md:grid-cols-3">
        <Big
          label={lang === "zh" ? left.nameZh : left.nameEn}
          value={formatOutcome(lm.hhIncome, "hhIncome", left.cityId)}
          sub={CITY_BY_ID[left.cityId][lang === "zh" ? "nameZh" : "nameEn"]}
        />
        <Big
          label={lang === "zh" ? "差距（B − A）" : "Gap (B − A)"}
          value={`${gap >= 0 ? "+" : ""}${formatOutcome(Math.abs(gap), "hhIncome", right.cityId)}`}
          sub={t.outcomes.hhIncome}
        />
        <Big
          label={lang === "zh" ? right.nameZh : right.nameEn}
          value={formatOutcome(rm.hhIncome, "hhIncome", right.cityId)}
          sub={CITY_BY_ID[right.cityId][lang === "zh" ? "nameZh" : "nameEn"]}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label={t.moveBirth}
          value={formatOutcome(exposedIncome(lm, rm, 0), "hhIncome", right.cityId, true)}
        />
        <Stat
          label={t.move10}
          value={formatOutcome(exposedIncome(lm, rm, 10), "hhIncome", right.cityId, true)}
        />
        <Stat
          label={lang === "zh" ? "质量指数 Q" : "Quality Q"}
          value={`${Math.round(neighborhoodQuality(left) * 100)} → ${Math.round(neighborhoodQuality(right) * 100)}`}
        />
      </div>

      <div>
        <div className="mb-2 text-[11px] tracking-wide text-muted uppercase">{t.covariates}</div>
        <div className="space-y-2">
          {COVARIATE_KEYS.map((k) => (
            <div key={k} className="grid grid-cols-[8rem_1fr_auto] items-center gap-2 text-[11px] md:grid-cols-[12rem_1fr_auto]">
              <span className="text-muted">{t.cov[k]}</span>
              <div className="relative h-2 rounded-full bg-paper/10">
                <span
                  className="absolute top-0 h-2 w-1.5 rounded-full bg-low"
                  style={{ left: `calc(${left[k]}% - 3px)` }}
                />
                <span
                  className="absolute top-0 h-2 w-1.5 rounded-full bg-high"
                  style={{ left: `calc(${right[k]}% - 3px)` }}
                />
              </div>
              <span className="tabular-nums text-paper-2">
                {left[k]} / {right[k]}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-faint">
          {lang === "zh" ? "红点为 A，蓝点为 B。" : "Terracotta = A, steel = B."}
        </p>
      </div>
    </div>
  );
}

function Big({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-line bg-ink-2 px-4 py-4">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="font-display text-2xl tabular-nums text-paper">{value}</div>
      <div className="text-xs text-faint">{sub}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line px-3 py-2">
      <div className="text-[10px] text-muted">{label}</div>
      <div className="font-display text-lg tabular-nums">{value}</div>
    </div>
  );
}
