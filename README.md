# China Opportunity Atlas · 中国机会地图

District-level interactive atlas of how childhood neighborhoods in **Shanghai, Beijing, Shenzhen, Guangzhou, Chengdu and Hong Kong** shape modeled household income at age 35.

A research-prototype counterpart to Chetty, Friedman, Hendren, Jones & Porter’s [Opportunity Atlas](https://www.opportunityatlas.org), built as a public demonstration of **data-driven modeling, geospatial visualization, and research communication**.

> China does **not** publish parent–child linked tax records at neighborhood scale. This atlas is an honest structural mapping from public district covariates — not an official statistic. See [Methods](#methods).

## What you can do

- Choropleth map of 90 districts, colored by modeled adult outcomes
- Filters: city, parent income percentile (Chetty’s headline is P25), gender, outcome
- Click a district for quality index, covariate breakdown, and a Chetty–Hendren **childhood-exposure moving experiment**
- Rank table and district-vs-district comparison
- Bilingual UI (中文 / English)
- Downloadable covariate CSV (`public/data/districts.csv`)

## Stack

React 19 · TypeScript · TanStack Start · Tailwind v4 · MapLibre GL · Zustand

## Model (short)

Neighborhood quality

```
Q = 0.28 school + 0.16 university + 0.16 inverse-poverty
  + 0.12 income-mix + 0.12 high-skill jobs
  + 0.08 hukou / school inclusion + 0.08 transit
```

Child rank in the urban age-35 income distribution

```
R = 50 + ρ_city (p − 50) + θ(p) (Q − 0.5)·100 + γ_gender
θ(p) = 0.22 + 0.28 (1 − p/100)
```

ρ is calibrated to published urban-China IGE (~0.40–0.46 from CFPS/CHIP). θ(p) is larger for poorer parents — Chetty’s central fact that neighborhoods matter more for low-income children. R is inverted through a city-specific lognormal to household income at 35.

Childhood exposure (movers design): share of the place gap captured ≈ `(18 − age at move) / 18`.

## Data

| Layer | Source |
| --- | --- |
| District boundaries | Official PRC / HK administrative GeoJSON |
| Mainland income | 2023 disposable income from statistical yearbooks, bulletins, published rankings |
| Hong Kong income | 2021 Census monthly household median (18 districts) |
| School / jobs / inclusion scores | Expert-coded 0–100 from public education reputation, industrial structure, hukou tightness — tagged `official` / `yearbook` / `census` / `compiled` in the CSV |

## Limits (please keep these in any application essay)

1. No movers quasi-experiment — colors are **not** causal treatment effects.
2. Districts are coarse. Pudong, Chaoyang and Longgang contain tract-sized gaps.
3. Current income mixes selection and causation through housing prices.
4. Gender gaps are calibrated, not district-level micro estimates.
5. Mainland figures are CNY household income; Hong Kong is HKD.

## Repository layout

```
src/lib/atlas/     types, city params, rank-rank model, i18n
src/components/    map, controls, district panel
src/routes/        map / rankings / compare / methodology
public/geo/        simplified district polygons
public/data/       districts.csv
scripts/build-district-data.py
```

## Run locally

```bash
npm install
npm run dev
```

## References

- Chetty, Friedman, Hendren, Jones, Porter. *The Opportunity Atlas: Mapping the Childhood Roots of Social Mobility.* AER.
- Chetty & Hendren. *The Impacts of Neighborhoods on Intergenerational Mobility.* QJE, 2018.
- Fan, Yi, Zhang and related CFPS/CHIP estimates of China’s intergenerational elasticity.
- Hong & Gruijters. *A lost land of opportunity? The geography of intergenerational educational mobility in China.* Population, Space and Place, 2024.
