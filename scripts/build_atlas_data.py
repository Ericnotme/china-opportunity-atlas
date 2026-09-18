#!/usr/bin/env python3
"""Build the browser-ready atlas dataset from open census and boundary files.

The script intentionally keeps the data pipeline explicit: observed values are
copied as-is, derived values are calculated here, and no survey microdata is
redistributed.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
from pathlib import Path


CITIES = {
    "北京市": {"id": "beijing", "zh": "北京", "en": "Beijing", "default": "海淀区"},
    "上海市": {"id": "shanghai", "zh": "上海", "en": "Shanghai", "default": "浦东新区"},
    "广州市": {"id": "guangzhou", "zh": "广州", "en": "Guangzhou", "default": "天河区"},
    "深圳市": {"id": "shenzhen", "zh": "深圳", "en": "Shenzhen", "default": "南山区"},
    "成都市": {"id": "chengdu", "zh": "成都", "en": "Chengdu", "default": "武侯区+高新区四个街道"},
}

EXPECTED_COUNTS = {"beijing": 16, "shanghai": 16, "guangzhou": 11, "shenzhen": 9, "chengdu": 20, "hong-kong": 18}

HK_NAME_SIMPLIFIED = {
    "元朗區": "元朗区",
    "南區": "南区",
    "灣仔區": "湾仔区",
    "中西區": "中西区",
    "東區": "东区",
    "離島區": "离岛区",
    "油尖旺區": "油尖旺区",
    "觀塘區": "观塘区",
    "深水埗區": "深水埗区",
    "九龍城區": "九龙城区",
    "黃大仙區": "黄大仙区",
    "葵青區": "葵青区",
    "荃灣區": "荃湾区",
    "屯門區": "屯门区",
    "沙田區": "沙田区",
    "西貢區": "西贡区",
    "大埔區": "大埔区",
    "北區": "北区",
}

NAME_OVERRIDES = {
    "武侯区+高新区四个街道": "武侯—高新片区",
    "双流区+天府新区+高新区一个街道": "双流—天府片区",
    "郫都区+高新区两个街道": "郫都—高新片区",
    "简阳市+东部新区": "简阳—东部新区",
    "龙岗区+大鹏新区": "龙岗—大鹏片区",
}

FLOAT_TOKEN = re.compile(r"-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[(),]")


def number(value: str | None) -> float | None:
    if value in (None, ""):
        return None
    return float(value)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_wkt(wkt: str) -> dict:
    geometry_type = wkt.split("(", 1)[0].strip().title()
    tokens = FLOAT_TOKEN.findall(wkt[wkt.index("(") :])
    position = 0

    def parse_group():
        nonlocal position
        if tokens[position] != "(":
            raise ValueError("Malformed WKT: expected opening parenthesis")
        position += 1
        values = []
        while position < len(tokens):
            token = tokens[position]
            if token == "(":
                values.append(parse_group())
            elif token == ")":
                position += 1
                return values
            elif token == ",":
                position += 1
            else:
                x = float(token)
                y = float(tokens[position + 1])
                position += 2
                values.append([x, y])
        raise ValueError("Malformed WKT: unclosed parenthesis")

    return {"type": geometry_type, "coordinates": parse_group()}


def point_segment_distance(point, start, end):
    px, py = point
    sx, sy = start
    ex, ey = end
    dx, dy = ex - sx, ey - sy
    if dx == 0 and dy == 0:
        return math.hypot(px - sx, py - sy)
    t = max(0, min(1, ((px - sx) * dx + (py - sy) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (sx + t * dx), py - (sy + t * dy))


def rdp(points, tolerance):
    if len(points) <= 2:
        return points
    best_index, best_distance = 0, 0.0
    for index in range(1, len(points) - 1):
        distance = point_segment_distance(points[index], points[0], points[-1])
        if distance > best_distance:
            best_index, best_distance = index, distance
    if best_distance > tolerance:
        left = rdp(points[: best_index + 1], tolerance)
        right = rdp(points[best_index:], tolerance)
        return left[:-1] + right
    return [points[0], points[-1]]


def simplify_ring(ring, tolerance=0.0012):
    if len(ring) < 5:
        return ring
    closed = ring[0] == ring[-1]
    core = ring[:-1] if closed else ring
    simplified = rdp(core, tolerance)
    if len(simplified) < 3:
        simplified = core[:3]
    if simplified[0] != simplified[-1]:
        simplified.append(simplified[0])
    return [[round(x, 5), round(y, 5)] for x, y in simplified]


def simplify_geometry(geometry):
    if geometry["type"] == "Polygon":
        coordinates = [simplify_ring(ring) for ring in geometry["coordinates"]]
    elif geometry["type"] == "Multipolygon" or geometry["type"] == "MultiPolygon":
        coordinates = [
            [simplify_ring(ring) for ring in polygon]
            for polygon in geometry["coordinates"]
        ]
    else:
        raise ValueError(f"Unsupported geometry: {geometry['type']}")
    return {"type": "MultiPolygon" if geometry["type"].lower() == "multipolygon" else "Polygon", "coordinates": coordinates}


def percentile_map(records, key, inverse=False):
    values = sorted(record[key] for record in records if record[key] is not None)
    if not values:
        return {}
    output = {}
    for record in records:
        value = record[key]
        if value is None:
            continue
        positions = [index for index, candidate in enumerate(values) if candidate == value]
        rank = sum(positions) / len(positions)
        percentile = 50.0 if len(values) == 1 else rank / (len(values) - 1) * 100
        output[record["id"]] = 100 - percentile if inverse else percentile
    return output


def add_derived_metrics(records):
    definitions = [
        ("populationGrowthPct", 0.50, False),
        ("workingAgeShare", 0.30, False),
        ("childShare", 0.20, False),
    ]
    ranks = {key: percentile_map(records, key, inverse) for key, _, inverse in definitions}
    for record in records:
        parts = []
        for key, weight, _ in definitions:
            if record["id"] in ranks[key]:
                parts.append((ranks[key][record["id"]], weight))
        coverage = sum(weight for _, weight in parts)
        record["vitalityDemoScore"] = (
            round(sum(value * weight for value, weight in parts) / coverage, 1)
            if len(parts) == len(definitions)
            else None
        )
        record["scoreCoverage"] = round(coverage * 100)


def mainland_cities(census_csv: Path):
    with census_csv.open(encoding="utf-8-sig", newline="") as handle:
        all_rows = list(csv.DictReader(handle))

    cities = []
    for city_name, config in CITIES.items():
        records = []
        for row in all_rows:
            if row["city"] != city_name:
                continue
            population_2020 = number(row["popu_2020"])
            population_2010 = number(row["popu_2010"])
            growth = (
                (population_2020 / population_2010 - 1) * 100
                if population_2020 is not None and population_2010
                else None
            )
            records.append(
                {
                    "id": str(row["county_code"]),
                    "name": NAME_OVERRIDES.get(row["county"], row["county"]),
                    "officialName": row["county"],
                    "population2020": round(population_2020) if population_2020 is not None else None,
                    "population2010": round(population_2010) if population_2010 is not None else None,
                    "populationGrowthPct": round(growth, 1) if growth is not None else None,
                    "childShare": number(row["age_0_14_2020"]),
                    "workingAgeShare": number(row["age_15_59_2020"]),
                    "seniorShare": number(row["age_65_2020"]),
                    "medianHouseholdIncome": None,
                    "geometry": simplify_geometry(parse_wkt(row["coord"])),
                }
            )
        add_derived_metrics(records)
        default_id = next(
            (record["id"] for record in records if record["officialName"] == config["default"]),
            records[0]["id"],
        )
        cities.append(
            {
                "id": config["id"],
                "name": config["zh"],
                "nameEn": config["en"],
                "defaultDistrictId": default_id,
                "availableMetrics": [
                    "childShare",
                    "population2020",
                    "populationGrowthPct",
                    "workingAgeShare",
                    "seniorShare",
                    "vitalityDemoScore",
                ],
                "districts": records,
                "source": "China Census county panel v1 (Dong et al.; official census bulletins digitized)",
                "boundaryNote": "2010–2020 comparable county boundaries supplied with the census panel",
            }
        )
    return cities


def load_hk_income(hk_income_json: Path, requested_period: str):
    payload = json.loads(hk_income_json.read_text(encoding="utf-8"))
    status = payload.get("header", {}).get("status", {})
    if status.get("code") != 0:
        raise ValueError(f"Hong Kong income API snapshot failed: {status}")
    income_rows = [
        row for row in payload["dataSet"]
        if row["sv"] == "MED_DH_INC" and row["DC"]
    ]
    available_periods = sorted({row["period"] for row in income_rows})
    period = available_periods[-1] if requested_period == "latest" else requested_period
    if period not in available_periods:
        raise ValueError(f"Hong Kong income period {period} not in {available_periods}")
    values = {row["DC"]: round(float(row["figure"])) for row in income_rows if row["period"] == period}
    if len(values) != 18:
        raise ValueError(f"Expected 18 Hong Kong income records for {period}; got {len(values)}")
    return values, period


def hong_kong_city(hk_geojson: Path, hk_income_json: Path, hk_income_period: str):
    source = json.loads(hk_geojson.read_text(encoding="utf-8"))
    income_by_code, income_period = load_hk_income(hk_income_json, hk_income_period)
    records = []
    for feature in source["features"]:
        properties = feature["properties"]
        traditional_name = properties["NAME_TC"]
        name = HK_NAME_SIMPLIFIED[traditional_name]
        income_code = properties["AREA_ID"]
        if income_code not in income_by_code:
            raise ValueError(f"Missing Hong Kong income value for {income_code} / {name}")
        records.append(
            {
                "id": f"HK-{properties['AREA_CODE']}",
                "name": name,
                "nameTc": traditional_name,
                "nameEn": properties["NAME_EN"].replace(" District", ""),
                "officialName": traditional_name,
                "population2020": None,
                "population2010": None,
                "populationGrowthPct": None,
                "childShare": None,
                "workingAgeShare": None,
                "seniorShare": None,
                "vitalityDemoScore": None,
                "scoreCoverage": 0,
                "medianHouseholdIncome": income_by_code[income_code],
                "geometry": simplify_geometry(feature["geometry"]),
            }
        )
    default_id = next(record["id"] for record in records if record["name"] == "中西区")
    return {
        "id": "hong-kong",
        "name": "香港",
        "nameEn": "Hong Kong",
        "defaultDistrictId": default_id,
        "availableMetrics": ["medianHouseholdIncome"],
        "districts": records,
        "source": f"Hong Kong Census and Statistics Department, {income_period} district household income",
        "incomeYear": income_period,
        "boundaryNote": "Official Home Affairs Department CSDI 18 District boundary, revised 2026-07-17",
        "boundarySourceUrl": "https://portal.csdi.gov.hk/csdi-webpage/dataset/had_rcd_1634523272907_75218",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--census-csv", required=True, type=Path)
    parser.add_argument("--hk-geojson", required=True, type=Path)
    parser.add_argument("--hk-income-json", required=True, type=Path)
    parser.add_argument("--hk-income-period", default="latest")
    parser.add_argument("--output", type=Path, default=Path("dist/data/atlas-data.json"))
    parser.add_argument("--census-revision", default="unrecorded")
    parser.add_argument("--hk-boundary-revision", default="unrecorded")
    parser.add_argument("--retrieved-at", default="unrecorded")
    args = parser.parse_args()

    cities = mainland_cities(args.census_csv)
    cities.append(hong_kong_city(args.hk_geojson, args.hk_income_json, args.hk_income_period))
    payload = {
        "meta": {
            "version": "0.3.0",
            "transformationVersion": "build_atlas_data.py@0.3.0",
            "districtCount": sum(len(city["districts"]) for city in cities),
            "cityCount": len(cities),
            "comparability": "Values and ranks are comparable within a selected city only.",
            "sources": [
                {
                    "id": "china-census-county-panel",
                    "revision": args.census_revision,
                    "inputSha256": sha256_file(args.census_csv),
                    "retrievedAt": args.retrieved_at,
                },
                {
                    "id": "hk-had-csdi-district-boundary",
                    "revision": args.hk_boundary_revision,
                    "inputSha256": sha256_file(args.hk_geojson),
                    "retrievedAt": args.retrieved_at,
                },
                {
                    "id": "hk-censtatd-table-130-06806-api",
                    "revision": "API snapshot",
                    "inputSha256": sha256_file(args.hk_income_json),
                    "retrievedAt": args.retrieved_at,
                },
            ],
        },
        "cities": cities,
    }
    assert payload["meta"]["districtCount"] == 90, "Expected exactly 90 statistical units"
    assert {city["id"]: len(city["districts"]) for city in cities} == EXPECTED_COUNTS
    all_ids = [district["id"] for city in cities for district in city["districts"]]
    assert len(all_ids) == len(set(all_ids)), "District IDs must be globally unique"
    for city in cities:
        assert any(district["id"] == city["defaultDistrictId"] for district in city["districts"])
        for district in city["districts"]:
            for key in ("childShare", "workingAgeShare", "seniorShare"):
                value = district[key]
                assert value is None or 0 <= value <= 100, f"Invalid {key}: {city['name']} {district['name']}"
            for ring in (
                district["geometry"]["coordinates"]
                if district["geometry"]["type"] == "Polygon"
                else [ring for polygon in district["geometry"]["coordinates"] for ring in polygon]
            ):
                assert len(ring) >= 4 and ring[0] == ring[-1], f"Invalid ring: {city['name']} {district['name']}"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )
    print(
        f"Wrote {payload['meta']['districtCount']} districts across "
        f"{payload['meta']['cityCount']} cities to {args.output}"
    )


if __name__ == "__main__":
    main()
