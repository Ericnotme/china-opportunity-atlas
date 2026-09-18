/* Pure sensitivity functions shared by the UI and Node validation. */
(function (root) {
  "use strict";
  const features = ["populationGrowthPct", "workingAgeShare", "childShare"];
  function normalized(weights) {
    if (weights.length !== 3 || weights.some(w => !Number.isFinite(w) || w < 0)) return null;
    const sum = weights.reduce((a, b) => a + b, 0);
    return sum ? weights.map(w => w / sum) : null;
  }
  function scores(city, weights) {
    const w = normalized(weights);
    const ranks = features.map(key => {
      const values = city.districts.map(d => d[key]).filter(Number.isFinite).sort((a, b) => a - b);
      return Object.fromEntries(city.districts.filter(d => Number.isFinite(d[key])).map(d => {
        const positions = values.map((v, i) => v === d[key] ? i : -1).filter(i => i >= 0);
        return [d.id, values.length === 1 ? 50 : 100 * positions.reduce((a, b) => a + b, 0) / positions.length / (values.length - 1)];
      }));
    });
    return Object.fromEntries(city.districts.map(d => [d.id,
      w && features.every(key => Number.isFinite(d[key]))
        ? w.reduce((sum, weight, i) => sum + weight * ranks[i][d.id], 0) : null]));
  }
  const api = { features, normalized, scores };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.AtlasModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
