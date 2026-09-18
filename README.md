# China Opportunity Context Atlas · 中国城市机会环境图谱

[Live interactive atlas](https://china-opportunity-atlas.weijiaxian.chatgpt.site/) · [Methods](METHODOLOGY.md) · [Experiments](EXPERIMENTS.md) · [Research notebook](notebooks/research_walkthrough.ipynb) · [Data provenance](DATA_SOURCES.md)

A reproducible, AI-assisted research software prototype by **Weijia Xian**.
Six Chinese cities, 90 statistical district/county units, auditable data transformations,
weight sensitivity analysis, and a retrospective Hong Kong household-income benchmark.

**Research question:** What can a district-level opportunity atlas responsibly show
when linked parent–child administrative records are unavailable?

**Answer:** Show observable context; expose dependence on assumptions; evaluate the
predictions for which labels actually exist. Do not invent income-at-35 estimates.

## Run locally

Requires Python 3.10+; no Python package installation or frontend dependency install.
Node.js 18+ is needed only for JavaScript validation.

```sh
git clone https://github.com/Ericnotme/china-opportunity-atlas.git
cd china-opportunity-atlas
python3 -m http.server 4173 --directory dist
```

Open `http://localhost:4173`. The committed `dist/` directory is the complete website,
not a placeholder build. It has no remote JavaScript, map tiles, analytics, or runtime API requirement.

```sh
python3 scripts/run_experiments.py   # Reproduce experiments and the CSV export
make test                          # Data contracts, no-leakage checks, JS/Python parity
```

## Explore

- Select Beijing, Shanghai, Guangzhou, Shenzhen, Chengdu or Hong Kong; click a
  district or use keyboard controls. Values retain source, year and missingness.
- Select **自定义权重情景** in a mainland city; move three weights and inspect
  sensitivity across 66 weight combinations. Missing components stay missing.
- Open **实验室** to compare four 2025 income prediction models, inspect 18 district
  predictions and errors, and download the underlying JSON or six-city CSV.
- City, district, metric and weights persist in the page URL for reproducible sharing.

## Modeling evidence

| Evidence | Implementation |
|---|---|
| Geospatial ETL | WKT/GeoJSON parsing, administrative matching, simplification and provenance hashes |
| Transparent assumptions | Midrank percentiles, strict complete-case scores, 66-scenario sensitivity |
| Temporal validation | 2022–2023 fit → 2024 hyperparameter selection → 2025 holdout |
| Baseline discipline | Persistence, pooled trend, local trend and shrinkage compared on MAE/RMSE |
| Reproducibility | Standard-library Python, committed input snapshot, notebook, CI and parity tests |
| Product engineering | Responsive SVG atlas, keyboard selection, error states and shareable parameters |

In the historical benchmark, the pooled trend has MAE **HK$649/month**, compared
with **HK$739** for persistence and **HK$722** for tuned shrinkage. The more complex
model does not win. These 18 districts and one test year do not establish
statistical significance or generalizable forecasting performance.

The benchmark target is current district household income, **not** children's
future income, upward mobility or a causal neighborhood effect. Demographic
indicators are contextual features, not validated opportunity proxies.

## Coverage and boundary definitions

| City | Units | Current displayed statistics |
|---|---:|---|
| Beijing | 16 | 2010/2020 population and 2020 age structure |
| Shanghai | 16 | Same mainland census panel |
| Guangzhou | 11 | Same mainland census panel |
| Shenzhen | 9 | Same; Longgang and Dapeng combined in source |
| Chengdu | 20 | Same; several development zones combined in source |
| Hong Kong | 18 | 2025 household income; 2022–2025 model panel |

These are **90 source-defined statistical units**, not a claim that every present-day
administrative district is separately resolved. Chengdu's Wuhou/Hi-tech,
Shuangliu/Tianfu, Pidu/Hi-tech and Jianyang/Eastern New Area combinations preserve
the published input. Hong Kong and mainland layers differ in year and definition
and are never put in one ranking. See [DATA_SOURCES.md](DATA_SOURCES.md).

## Repository map

```text
dist/                         Complete, deployable static site
  app.js, model.js, styles.css Interface and pure scoring functions
  data/atlas-data.json         Six-city values and simplified district geometries
  data/experiments.json        Sensitivity + full forecast validation outputs
  data/districts.csv           Flat export, missing values left empty
scripts/build_atlas_data.py    Upstream census / boundary ETL
scripts/run_experiments.py     Reproducible experiments and CSV export
notebooks/                    Executed research walkthrough
data/source/                  Official Hong Kong API response snapshot
tests/                        Data contracts, leakage prevention and parity tests
.github/workflows/            Automatic validation
legacy/prototype-2026-09-17/   Preserved earlier GitHub implementation, not current entrypoint
```

## Authorship and responsible presentation

This project was developed with generative-AI coding assistance. The repository
records implemented methods and reproducible results; it is not a claim of
unassisted authorship, access to restricted CFPS/CHFS microdata, or causal discovery.
For an application or interview, be prepared to reproduce the notebook, explain
why the target differs from Opportunity Atlas, diagnose the simple model's better
performance, and modify the weighting or validation design yourself.

## Rebuild original atlas inputs

1. 下载 [leiii/census](https://github.com/leiii/census) 的县级 2010–2020 面板。
2. 从香港政府 [CSDI District Boundary](https://portal.csdi.gov.hk/csdi-webpage/dataset/had_rcd_1634523272907_75218) 下载 GeoJSON。
3. 运行：

```bash
python scripts/build_atlas_data.py \
  --census-csv /path/to/census_county_2010-2020_v1.csv \
  --hk-geojson /path/to/DCD_converted.geojson \
  --hk-income-json data/source/hk-income-130-06806-api.json \
  --hk-income-period 2025 \
  --census-revision 0ba0f1efae092f4aa6569ef38e53b3bb4d2f0087 \
  --hk-boundary-revision 2026-07-17 \
  --retrieved-at 2026-09-17 \
  --output dist/data/atlas-data.json
```

脚本会解析大陆 WKT、多边形与多重多边形，执行仅供可视化的 Ramer–Douglas–Peucker 简化，审计缺失字段，并在城市内计算分位与人口活力演示分。数据契约会验证城市/单元数量、唯一 ID、指标范围与闭合几何环；输入 SHA-256 会写入成品元数据。

提交到 GitHub 后，Actions 会自动执行 JavaScript 语法检查与数据契约测试；本地可运行 `python -m unittest discover -s tests -v`。

当前可复现快照：

| 输入 | 上游版本 | SHA-256 |
|---|---|---|
| `census_county_2010-2020_v1.csv` | `leiii/census@0ba0f1ef…` | `fad846ca900fc6c15c0c81d2217efef3e41ac2d1cec25c693c28d6959fba56a8` |
| `DCD_gdb_DCD_converted.geojson` | CSDI 2026-07-17 | `c5b284814b534afaee66707868b493ebe18d6f7dc6d40635970d8e9753dadeeb` |
| `hk-income-130-06806-api.json` | C&SD 表 130-06806 API，2022–2025 | `c357deec0b0d3346415955255bc961e5d95c758ba37b09f2205623842b483212` |


## Next research steps

1. Add verified district education and service-access indicators with consistent years.
2. Acquire authorized parent–child outcomes and geography; estimate small-area
   results with survey-design-aware pooling and calibrated uncertainty.
3. Validate across cohorts/geography and separately evaluate causal exposure designs.

## License

Original code and documentation are MIT licensed. Upstream data and boundaries
retain their original terms; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
