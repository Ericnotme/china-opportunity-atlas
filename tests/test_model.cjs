const assert = require('node:assert/strict');
const fs = require('node:fs');
const {scores, normalized} = require('../dist/model.js');
const atlas = JSON.parse(fs.readFileSync(require('node:path').join(__dirname, '../dist/data/atlas-data.json')));
const experiments = JSON.parse(fs.readFileSync(require('node:path').join(__dirname, '../dist/data/experiments.json')));
assert.equal(normalized([0, 0, 0]), null);
assert.equal(normalized([-1, 1, 1]), null);
for (const city of atlas.cities.filter(c => c.id !== 'hong-kong')) {
  const baseline = scores(city, [50, 30, 20]);
  for (const d of city.districts) {
    if (d.vitalityDemoScore == null) assert.equal(baseline[d.id], null);
    else assert.ok(Math.abs(baseline[d.id] - d.vitalityDemoScore) <= .051);
  }
  const history = Object.fromEntries(Object.keys(experiments.sensitivity[city.id].districts).map(id => [id, []]));
  for (let a = 0; a <= 10; a++) for (let b = 0; b <= 10 - a; b++) {
    const s = scores(city, [a, b, 10 - a - b]);
    const values = Object.values(s).filter(Number.isFinite);
    for (const id of Object.keys(history)) history[id].push(1 + values.filter(v => v > s[id] + 1e-9).length);
  }
  for (const [id, ranks] of Object.entries(history)) {
    assert.equal(Math.min(...ranks), experiments.sensitivity[city.id].districts[id].bestRank);
    assert.equal(Math.max(...ranks), experiments.sensitivity[city.id].districts[id].worstRank);
  }
}
console.log('Passed: null safety, baseline parity, and all 66 scenarios across five cities.');
