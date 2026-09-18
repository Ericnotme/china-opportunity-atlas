# Experiments: sensitivity and temporal validation

## What is identified?

The atlas describes district context. It does **not** estimate childhood exposure
effects, intergenerational mobility, or income at age 35. Present-day household
income is not a substitute label for those targets. Demographic growth and age
structure are not validated opportunity measures.

Both experiments run without private survey data or third-party Python packages:

```sh
python3 scripts/run_experiments.py
make test
```

Inputs, source SHA-256 hashes, all predictions and all validation scores are
available in `dist/data/experiments.json`. `notebooks/research_walkthrough.ipynb`
walks through the computations. The site uses the same committed outputs.

## 1. Exhaustive weight sensitivity

For each mainland city, transform population change, working-age share and child
share into within-city midrank percentiles. Ties receive the mean position; one
available observation receives 50. Percentiles use all available observations
for each feature. Composite scores require **all three** features, even when one
weight is zero. No missing value is imputed or silently reweighted.

`score_d(w) = sum_j w_j percentile_dj`, with nonnegative weights summing to one.

Enumerate the 66 points of the three-weight simplex on a 0.1 grid. At each point,
rank complete cases by score, sharing competition ranks for ties (numerical
tolerance 1e-9). Report best/worst ranks and the fraction of scenarios in which a
district has rank <= ceil(n_complete / 4). With ties this group can exceed 25% of
districts. The grid is a transparent design choice, **not** a probability law over
reasonable models. Ranges are not confidence intervals. Sliders permit additional
weights; their scores need not coincide with one of the 66 grid points.

This evaluates dependence on weights, not validity of the selected indicators.
The default 50/30/20 weights are illustrative. Changing feature definitions,
directions or geographical units could change results further.

## 2. Hong Kong income temporal benchmark

Target: the published 2025 median monthly domestic household income in each of
18 Hong Kong districts, from C&SD table 130-06806 (`MED_DH_INC`, HKD/month).
Only the 2022–2025 snapshot already in the repository is used. Figures are nominal,
rounded official survey estimates; their sampling error is not modeled.

For district d, compute mean annual log income change `g_d` over the training
window. Let `g_bar` be its equal-district mean. Predict one year ahead:

`prediction_d = last_income_d * exp(lambda*g_d + (1-lambda)*g_bar)`.

`g_bar` is NOT growth of the all-Hong-Kong income median. District medians cannot
be averaged to reconstruct that statistic.

Models:

| Model | Rule |
|---|---|
| Persistence baseline | Repeat last year's income |
| Pooled trend | lambda = 0 |
| Independent district trends | lambda = 1 |
| Shrinkage trend | Select lambda from 0, 0.1, …, 1 on 2024 MAE |

Training/selection sequence:

1. Use 2022–2023 to predict 2024 for each candidate lambda.
2. Select by equal-district MAE; ties prefer smaller lambda. Selected: **0.4**.
3. Freeze lambda, recompute trends with 2022–2024, and predict 2025.
4. Evaluate against 2025 only after generating predictions. Compare all four
   prespecified baseline/model families; do not reselect lambda on 2025.

This is a **retrospective temporal holdout**, not preregistration, not a real-time
forecast, and not an externally independent sample. Model families were designed
after the snapshot existed. A perturbation test verifies that changing 2025
outcomes cannot alter predictions or the selected lambda.

| Model | 2025 MAE, HKD/month | 2025 RMSE, HKD/month |
|---|---:|---:|
| Persistence | 738.89 | 1,052.25 |
| Pooled | 649.04 | 833.45 |
| Independent trends | 878.79 | 1,165.55 |
| Shrinkage (0.4) | 721.87 | 956.02 |

**Pooled trend has the lowest test error in this exercise.** The tuned model does
not beat that simpler comparator. We report this negative comparison explicitly.
Eighteen correlated districts and one test year do not establish a statistically
significant improvement or reliable future performance. No forecast interval is
reported because this exercise does not calibrate one.

## Research extension

To address intergenerational mobility, obtain authorized parent–child linked
outcomes and childhood geography, predefine cohorts and parent-income ranks,
fit a survey-design-aware multilevel model, validate on held-out geography and
cohorts, then separately identify exposure effects with a credible mover or
quasi-experimental design. No such data access or causal result is claimed here.
