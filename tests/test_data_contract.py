import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "dist/data/atlas-data.json").read_text(encoding="utf-8"))


class AtlasDataContract(unittest.TestCase):
    def test_expected_scope(self):
        counts = {city["id"]: len(city["districts"]) for city in DATA["cities"]}
        self.assertEqual(
            counts,
            {
                "beijing": 16,
                "shanghai": 16,
                "guangzhou": 11,
                "shenzhen": 9,
                "chengdu": 20,
                "hong-kong": 18,
            },
        )
        self.assertEqual(DATA["meta"]["districtCount"], 90)

    def test_ids_are_unique_and_defaults_exist(self):
        ids = [district["id"] for city in DATA["cities"] for district in city["districts"]]
        self.assertEqual(len(ids), len(set(ids)))
        for city in DATA["cities"]:
            self.assertIn(city["defaultDistrictId"], {d["id"] for d in city["districts"]})

    def test_metric_ranges_and_score_inputs(self):
        for city in DATA["cities"]:
            for district in city["districts"]:
                for key in ("childShare", "workingAgeShare", "seniorShare"):
                    value = district[key]
                    self.assertTrue(value is None or 0 <= value <= 100)
                score_inputs = [
                    district["populationGrowthPct"],
                    district["workingAgeShare"],
                    district["childShare"],
                ]
                self.assertEqual(district["vitalityDemoScore"] is not None, all(v is not None for v in score_inputs))

    def test_geometry_rings_are_closed(self):
        for city in DATA["cities"]:
            for district in city["districts"]:
                geometry = district["geometry"]
                rings = geometry["coordinates"] if geometry["type"] == "Polygon" else [
                    ring for polygon in geometry["coordinates"] for ring in polygon
                ]
                for ring in rings:
                    self.assertGreaterEqual(len(ring), 4)
                    self.assertEqual(ring[0], ring[-1])

    def test_provenance_is_locked(self):
        sources = {source["id"]: source for source in DATA["meta"]["sources"]}
        self.assertEqual(
            sources["china-census-county-panel"]["inputSha256"],
            "fad846ca900fc6c15c0c81d2217efef3e41ac2d1cec25c693c28d6959fba56a8",
        )
        self.assertEqual(
            sources["hk-had-csdi-district-boundary"]["inputSha256"],
            "c5b284814b534afaee66707868b493ebe18d6f7dc6d40635970d8e9753dadeeb",
        )
        self.assertEqual(
            sources["hk-censtatd-table-130-06806-api"]["inputSha256"],
            "c357deec0b0d3346415955255bc961e5d95c758ba37b09f2205623842b483212",
        )

    def test_hong_kong_income_snapshot_year(self):
        hong_kong = next(city for city in DATA["cities"] if city["id"] == "hong-kong")
        self.assertEqual(hong_kong["incomeYear"], "2025")
        self.assertEqual(len([d for d in hong_kong["districts"] if d["medianHouseholdIncome"]]), 18)


if __name__ == "__main__":
    unittest.main()
