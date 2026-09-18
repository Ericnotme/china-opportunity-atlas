#!/usr/bin/env python3
"""Deterministic sensitivity analysis and a retrospective temporal benchmark.

Python standard library only. No individual outcomes or causal effects are fitted.
All paths are relative to this repository; run from any working directory.
"""
import csv
import hashlib
import json
import math
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parents[1]
FEATURES = ("populationGrowthPct", "workingAgeShare", "childShare")
MODEL_NAMES = {
    "persistence": "上年值基线",
    "pooled": "共同趋势",
    "local": "各区独立趋势",
    "shrinkage": "收缩趋势",
}


def percentiles(districts, key):
    values = sorted(d[key] for d in districts if d[key] is not None)
    return {
        d["id"]: (50 if len(values) == 1 else 100 * mean(
            i for i, v in enumerate(values) if v == d[key]) / (len(values) - 1))
        for d in districts if d[key] is not None
    }


def sensitivity(city):
    districts = city["districts"]
    ranks = [percentiles(districts, key) for key in FEATURES]
    complete = [d for d in districts if all(d[key] is not None for key in FEATURES)]
    grid = [(a / 10, b / 10, (10 - a - b) / 10)
            for a in range(11) for b in range(11 - a)]
    history = {d["id"]: [] for d in complete}
    for weights in grid:
        scores = {d["id"]: sum(w * r[d["id"]] for w, r in zip(weights, ranks))
                  for d in complete}
        for district_id, score in scores.items():
            history[district_id].append(1 + sum(v > score + 1e-9 for v in scores.values()))
    return {"scenarioCount": len(grid), "completeCount": len(complete),
            "totalCount": len(districts), "districts": {
                d["id"]: {"bestRank": min(history[d["id"]]),
                           "worstRank": max(history[d["id"]]),
                           "topQuarterShare": round(mean(
                               r <= math.ceil(len(complete) / 4) for r in history[d["id"]]), 4),
                           "percentiles": [r[d["id"]] for r in ranks]}
                for d in complete}}


def load_income(path):
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload["header"]["status"]["code"] == 0
    panel, names = {}, {}
    for row in payload["dataSet"]:
        if row["sv"] != "MED_DH_INC" or not row["DC"]:
            continue
        year = int(row["period"])
        if year not in range(2022, 2026):
            continue
        value = float(row["figure"])
        if value <= 0:
            raise ValueError("Income must be positive for log changes")
        code = row["DC"]
        if year in panel.setdefault(code, {}):
            raise ValueError("Duplicate district/year")
        panel[code][year] = value
        names[code] = row["DCDesc"]
    assert len(panel) == 18 and all(set(v) == set(range(2022, 2026)) for v in panel.values())
    return panel, names


def forecasts(history, target_year, weight):
    """Only consume years before target_year; weight=0 pools, weight=1 is local."""
    trends = {}
    for code, series in history.items():
        years = sorted(year for year in series if year < target_year)
        if not years or years[-1] != target_year - 1 or len(years) < 2:
            raise ValueError("Need at least two preceding annual observations")
        trends[code] = mean(math.log(series[b] / series[a]) / (b - a)
                            for a, b in zip(years, years[1:]))
    common = mean(trends.values())  # Equal district weights; NOT all-HK median growth.
    return {code: series[target_year - 1] * math.exp(
        weight * trends[code] + (1 - weight) * common) for code, series in history.items()}


def errors(predictions, actual):
    residuals = [predictions[code] - actual[code] for code in sorted(actual)]
    return {"mae": mean(abs(e) for e in residuals),
            "rmse": math.sqrt(mean(e * e for e in residuals)),
            "bias": mean(residuals)}


def benchmark(panel, names):
    training = {code: {y: v for y, v in series.items() if y <= 2023}
                for code, series in panel.items()}
    validation = {code: series[2024] for code, series in panel.items()}
    candidates = []
    for i in range(11):
        weight = i / 10
        candidates.append({"weight": weight, **errors(forecasts(training, 2024, weight), validation)})
    # On a tie prefer more pooling; no 2025 values enter selection or fitting.
    selected = min(candidates, key=lambda item: (item["mae"], item["weight"]))["weight"]
    history = {code: {y: v for y, v in series.items() if y <= 2024}
               for code, series in panel.items()}
    actual = {code: series[2025] for code, series in panel.items()}
    predictions = {
        "persistence": {code: series[2024] for code, series in history.items()},
        "pooled": forecasts(history, 2025, 0),
        "local": forecasts(history, 2025, 1),
        "shrinkage": forecasts(history, 2025, selected),
    }
    return {
        "target": "2025 district median monthly domestic household income, HKD",
        "design": "Retrospective temporal holdout; not a preregistered or real-time forecast",
        "trainingYears": [2022, 2023], "validationYear": 2024, "testYear": 2025,
        "districtCount": len(panel), "selectedWeight": selected,
        "validation": candidates,
        "models": [{"id": key, "name": MODEL_NAMES[key], **errors(pred, actual)}
                   for key, pred in predictions.items()],
        "districts": [{"code": code, "name": names[code],
                       "history": panel[code], "actual": actual[code],
                       "predictions": {key: pred[code] for key, pred in predictions.items()}}
                      for code in sorted(panel)],
    }


def build():
    atlas_path = ROOT / "dist/data/atlas-data.json"
    income_path = ROOT / "data/source/hk-income-130-06806-api.json"
    atlas = json.loads(atlas_path.read_text(encoding="utf-8"))
    panel, names = load_income(income_path)
    result = {
        "version": "0.4.0",
        "inputs": {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
                   for p in (atlas_path, income_path)},
        "sensitivity": {c["id"]: sensitivity(c) for c in atlas["cities"] if c["id"] != "hong-kong"},
        "backtest": benchmark(panel, names),
    }
    output = ROOT / "dist/data/experiments.json"
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    fields = ["city", "id", "name", "officialName", "population2010", "population2020",
              "populationGrowthPct", "childShare", "workingAgeShare", "seniorShare",
              "medianHouseholdIncome", "incomeYear", "source"]
    with (ROOT / "dist/data/districts.csv").open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for city in atlas["cities"]:
            for district in city["districts"]:
                writer.writerow({key: city["name"] if key == "city" else city.get(key, district.get(key, ""))
                                 for key in fields})
    return result


if __name__ == "__main__":
    result = build()
    print(json.dumps({"selectedWeight": result["backtest"]["selectedWeight"],
                      "models": result["backtest"]["models"]}, ensure_ascii=False, indent=2))
