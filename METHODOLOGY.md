# Methods

This atlas is a **research prototype**, not an official statistic.

The US [Opportunity Atlas](https://www.opportunityatlas.org) (Chetty, Friedman, Hendren, Jones & Porter) links ~20 million people born 1978–83 back to childhood census tracts using IRS–Census administrative data, and reports mean household income at age 35 by parental income, race and sex.

China does not publish parent–child linked tax records at neighborhood scale. This project therefore asks the *same interactive question* with a transparent structural mapping from **public district covariates**.

## Neighborhood quality

Each district \(d\) has expert-coded and yearbook-linked traits in \([0,100]\). The quality index is

\[
Q_d = 0.28\,\text{school} + 0.16\,\text{university} + 0.16\,\text{inverse poverty}
+ 0.12\,\text{income mix} + 0.12\,\text{high-skill jobs}
+ 0.08\,\text{hukou/school inclusion} + 0.08\,\text{transit}.
\]

Weights follow Opportunity Atlas correlational facts (schools and poverty dominate). Inclusion is the China-specific term: how open local schools are to children without local hukou (Hong Kong: immigrant / public-housing inclusion).

## Rank–rank mapping

Let \(p\) be the parent’s percentile in the city income distribution. The child’s rank \(R\) in the urban age-35 household-income distribution is

\[
R = 50 + \rho_c (p-50) + \theta(p)\,(Q_d-0.5)\cdot 100 + \gamma_g,
\qquad
\theta(p)=0.22+0.28(1-p/100).
\]

- \(\rho_c\) is a city-specific rank–rank slope, calibrated to published urban-China IGE (CFPS/CHIP), about 0.40–0.46.
- \(\theta(p)\) is larger for poorer parents — Chetty’s central fact that neighborhoods matter more for low-income children.
- \(\gamma_g\) is a small gender adjustment.

Household income at 35 is the city-specific lognormal inverse \(Y = \exp(\mu_c + \sigma_c \Phi^{-1}(R/100))\). College attendance, \(P(\text{top quintile})\) and homeownership are logistics in \(Q\) and \(p\). Homeownership penalizes expensive districts for low-\(p\) children (they gain earnings but are priced out of local owner-occupation).

## Childhood exposure

Following Chetty & Hendren’s movers design, the share of a place gap captured by moving at age \(a\) is \((18-a)/18\). The map panel reports “move at birth” versus “move at age 10” from the city’s lowest-\(Q\) district.

## Data

| Layer | Source |
| --- | --- |
| Boundaries | Official PRC / Hong Kong district GeoJSON |
| Mainland income | 2023 disposable income: yearbooks, statistical bulletins, published district rankings |
| Hong Kong income | 2021 Census monthly household median, 18 districts |
| School / jobs / inclusion | 0–100 scores coded from public education reputation, industrial structure, hukou tightness |

Every row in `public/data/districts.csv` carries a `source` flag: `official`, `yearbook`, `census`, or `compiled`.

## What this is not

1. **Not causal.** There is no movers quasi-experiment here. Colors are observational mappings.
2. **Not tract-level.** Pudong, Chaoyang and Longgang contain gaps as large as the between-district gaps we plot.
3. **Not PPP-aligned.** Mainland figures are CNY household income; Hong Kong is HKD. The choropleth scale is relative across the six cities.
4. **Not a substitute for administrative microdata.** A true Chinese Opportunity Atlas would need linked tax or social-security records that are not public.

## Code

The mapping lives in `src/lib/atlas/model.ts`. City parameters are in `src/lib/atlas/cities.ts`. Rebuild the JSON/CSV with `python3 scripts/build-district-data.py`.

## References

- Chetty, R., Friedman, J. N., Hendren, N., Jones, M. R., & Porter, S. *The Opportunity Atlas: Mapping the Childhood Roots of Social Mobility.*
- Chetty, R. & Hendren, N. (2018). *The Impacts of Neighborhoods on Intergenerational Mobility.* QJE.
- Fan, Yi, Zhang and related CFPS/CHIP estimates of China’s intergenerational elasticity.
- Hong, Q. & Gruijters, R. (2024). *A lost land of opportunity? The geography of intergenerational educational mobility in China.* Population, Space and Place.
