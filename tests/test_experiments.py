import copy
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from run_experiments import benchmark, forecasts, load_income, sensitivity


class ExperimentsTest(unittest.TestCase):
    def test_future_outcomes_cannot_change_selected_weight_or_predictions(self):
        panel, names = load_income(ROOT / "data/source/hk-income-130-06806-api.json")
        original = benchmark(panel, names)
        changed = copy.deepcopy(panel)
        for code in changed:
            changed[code][2025] *= 4
        perturbed = benchmark(changed, names)
        self.assertEqual(original["selectedWeight"], perturbed["selectedWeight"])
        self.assertEqual([d["predictions"] for d in original["districts"]],
                         [d["predictions"] for d in perturbed["districts"]])
        self.assertNotEqual(original["models"][0]["mae"], perturbed["models"][0]["mae"])

    def test_constant_series_predicts_constant(self):
        panel = {"A": {2022: 100, 2023: 100}, "B": {2022: 200, 2023: 200}}
        for weight in (0, .4, 1):
            self.assertEqual(forecasts(panel, 2024, weight), {"A": 100, "B": 200})

    def test_missing_rows_excluded_ties_share_rank(self):
        complete = {"populationGrowthPct": 1, "workingAgeShare": 60, "childShare": 10}
        city = {"districts": [dict(complete, id="a"), dict(complete, id="b"),
                              dict(complete, id="missing", childShare=None)]}
        result = sensitivity(city)
        self.assertEqual(result["scenarioCount"], 66)
        self.assertEqual(result["completeCount"], 2)
        self.assertNotIn("missing", result["districts"])
        self.assertEqual(result["districts"]["a"]["worstRank"], 1)
        self.assertEqual(result["districts"]["b"]["worstRank"], 1)

    def test_committed_benchmark_matches_recomputation(self):
        panel, names = load_income(ROOT / "data/source/hk-income-130-06806-api.json")
        stored = json.loads((ROOT / "dist/data/experiments.json").read_text())
        self.assertEqual(json.loads(json.dumps(benchmark(panel, names))), stored["backtest"])


if __name__ == "__main__":
    unittest.main()
