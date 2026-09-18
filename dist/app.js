const METRICS = {
  vitalityDemoScore: {
    label: "人口活力演示分",
    shortLabel: "活力演示分",
    status: "derived",
    statusLabel: "派生指标 · DERIVED",
    unit: "/ 100",
    low: "相对较低",
    high: "相对较高",
    format: (value) => (value == null ? "—" : value.toFixed(1)),
    explainer:
      "人口变化、劳动年龄人口与少儿比例的市内分位加权。它仅用于演示模型管线，没有结果或因果效度。",
    caveat:
      "这是人口结构演示分，不是“机会分”；不可跨城市比较，也不代表搬入该区会提高未来收入。",
  },
  population2020: {
    label: "2020 常住人口",
    shortLabel: "常住人口",
    status: "observed",
    statusLabel: "已发布观测 · OBSERVED",
    unit: "人",
    low: "较少",
    high: "较多",
    format: (value) => (value == null ? "—" : new Intl.NumberFormat("zh-CN").format(value)),
    explainer: "第七次全国人口普查口径的区级常住人口；颜色按当前城市内数值范围绘制。",
    caveat: "人口规模不是机会质量；该层用于理解区级人口基底，不能单独用于地区优劣判断。",
  },
  populationGrowthPct: {
    label: "2010–2020 人口变化",
    shortLabel: "十年变化",
    status: "derived",
    statusLabel: "派生指标 · DERIVED",
    unit: "%",
    low: "下降更多",
    high: "增长更多",
    format: (value) => (value == null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(1)}`),
    explainer: "由 2010 与 2020 常住人口计算： (2020 / 2010 − 1) × 100%。",
    caveat: "人口增长同时包含迁移、行政区调整与住房供给等机制，不能直接解释为机会改善。",
  },
  childShare: {
    label: "0–14 岁人口比例",
    shortLabel: "少儿比例",
    status: "observed",
    statusLabel: "已发布观测 · OBSERVED",
    unit: "%",
    low: "较低",
    high: "较高",
    format: (value) => (value == null ? "—" : value.toFixed(1)),
    explainer: "2020 年区级常住人口中 0–14 岁人口占比。缺失区保持空缺，不做插补。",
    caveat: "少儿比例反映人口结构，不等于教育资源质量，也不代表儿童个体结果。",
  },
  workingAgeShare: {
    label: "15–59 岁人口比例",
    shortLabel: "劳动年龄比例",
    status: "observed",
    statusLabel: "已发布观测 · OBSERVED",
    unit: "%",
    low: "较低",
    high: "较高",
    format: (value) => (value == null ? "—" : value.toFixed(1)),
    explainer: "2020 年区级常住人口中 15–59 岁人口占比，作为当期年龄与潜在劳动供给结构的背景量。",
    caveat: "年龄结构不是就业质量或收入水平；仅作为机会环境的一个背景维度。",
  },
  seniorShare: {
    label: "65 岁以上人口比例",
    shortLabel: "老年人口比例",
    status: "observed",
    statusLabel: "已发布观测 · OBSERVED",
    unit: "%",
    low: "较低",
    high: "较高",
    format: (value) => (value == null ? "—" : value.toFixed(1)),
    explainer: "2020 年区级常住人口中 65 岁及以上人口占比。地图按原始比例着色。",
    caveat: "老龄化没有价值方向；较高或较低都不应被解释为地区好坏。",
  },
  medianHouseholdIncome: {
    label: "2025 家庭月收入中位数",
    shortLabel: "家庭月收入中位数",
    status: "observed",
    statusLabel: "公开调查估计 · ESTIMATE",
    unit: "HK$ / 月",
    low: "较低",
    high: "较高",
    format: (value) => (value == null ? "—" : new Intl.NumberFormat("en-HK").format(value)),
    explainer: "香港政府统计处 API 发布的 2025 年按区家庭住户每月收入中位数调查估计。",
    caveat: "这是综合住户统计调查的点估计，存在抽样误差；区际数值差异不等于统计显著差异。年份、币种与大陆人口层不同，也不进行跨城市比较。",
  },
};

METRICS.scenarioScore = {
  ...METRICS.vitalityDemoScore,
  label: "自定义权重情景 · 实验", shortLabel: "情景演示分",
  statusLabel: "假设情景 · SCENARIO",
  explainer: "三项人口结构分位，按当前滑块权重计算。每项须有数据；得分不等于机会质量。",
  caveat: "改变权重会改变颜色。66 组情景衡量假设敏感性，不是抽样置信区间，也不验证这些指标与未来收入的关系。",
};

const PALETTE = ["#e2e9e7", "#aabfcd", "#6f91b4", "#385e98", "#142e56"];
const SVG_NS = "http://www.w3.org/2000/svg";

const state = {
  data: null,
  experiments: null,
  weights: [50, 30, 20],
  cityId: "beijing",
  metric: "childShare",
  districtId: null,
};

const elements = {
  cityTabs: document.querySelector("#city-tabs"),
  metricSelect: document.querySelector("#metric-select"),
  districtSelect: document.querySelector("#district-select"),
  mapPaths: document.querySelector("#map-paths"),
  mapSvg: document.querySelector("#district-map"),
  mapSvgTitle: document.querySelector("#map-svg-title"),
  mapSvgDescription: document.querySelector("#map-svg-description"),
  tooltip: document.querySelector("#map-tooltip"),
  mapCity: document.querySelector("#map-city"),
  mapCityEn: document.querySelector("#map-city-en"),
  mapMetric: document.querySelector("#map-metric"),
  metricStatus: document.querySelector("#metric-status"),
  legendLow: document.querySelector("#legend-low"),
  legendHigh: document.querySelector("#legend-high"),
  legendValues: document.querySelector("#legend-values"),
  missingKey: document.querySelector(".missing-key"),
  selectedCode: document.querySelector("#selected-code"),
  selectedRank: document.querySelector("#selected-rank"),
  selectedCityEn: document.querySelector("#selected-city-en"),
  selectedName: document.querySelector("#selected-name"),
  selectedValue: document.querySelector("#selected-value"),
  selectedUnit: document.querySelector("#selected-unit"),
  metricExplainer: document.querySelector("#metric-explainer"),
  districtFacts: document.querySelector("#district-facts"),
  coverageCard: document.querySelector("#coverage-card"),
  coverageValue: document.querySelector("#coverage-value"),
  coverageBar: document.querySelector("#coverage-bar"),
  coverageCopy: document.querySelector("#coverage-copy"),
  sourceLine: document.querySelector("#source-line"),
  rankingBlock: document.querySelector("#ranking-block"),
  ranking: document.querySelector("#district-ranking"),
  metricCaveat: document.querySelector("#metric-caveat"),
};

function currentCity() {
  return state.data.cities.find((city) => city.id === state.cityId);
}

function currentDistrict() {
  const city = currentCity();
  return city.districts.find((district) => district.id === state.districtId) || city.districts[0];
}

function addMissingPattern() {
  const defs = document.createElementNS(SVG_NS, "defs");
  const pattern = document.createElementNS(SVG_NS, "pattern");
  pattern.setAttribute("id", "missing-pattern");
  pattern.setAttribute("width", "8");
  pattern.setAttribute("height", "8");
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  pattern.setAttribute("patternTransform", "rotate(45)");
  const background = document.createElementNS(SVG_NS, "rect");
  background.setAttribute("width", "8");
  background.setAttribute("height", "8");
  background.setAttribute("fill", "#e5e3dc");
  const line = document.createElementNS(SVG_NS, "line");
  line.setAttribute("x1", "0");
  line.setAttribute("x2", "0");
  line.setAttribute("y2", "8");
  line.setAttribute("stroke", "#b5b4af");
  line.setAttribute("stroke-width", "2");
  pattern.append(background, line);
  defs.append(pattern);
  elements.mapSvg.insertBefore(defs, elements.mapSvg.firstChild);
}

function geometryRings(geometry) {
  return geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat();
}

function cityBounds(city) {
  const points = city.districts.flatMap((district) => geometryRings(district.geometry).flat());
  return points.reduce(
    (bounds, [x, y]) => ({
      minX: Math.min(bounds.minX, x),
      maxX: Math.max(bounds.maxX, x),
      minY: Math.min(bounds.minY, y),
      maxY: Math.max(bounds.maxY, y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
}

function projector(bounds) {
  const width = 820;
  const height = 590;
  const padding = 52;
  const middleLatitude = ((bounds.minY + bounds.maxY) / 2) * (Math.PI / 180);
  const longitudeScale = Math.cos(middleLatitude);
  const spanX = (bounds.maxX - bounds.minX) * longitudeScale || 1;
  const spanY = bounds.maxY - bounds.minY || 1;
  const scale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const offsetX = (width - spanX * scale) / 2;
  const offsetY = (height - spanY * scale) / 2;
  return ([x, y]) => [
    offsetX + (x - bounds.minX) * longitudeScale * scale,
    height - (offsetY + (y - bounds.minY) * scale),
  ];
}

function pathFromGeometry(geometry, project) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons
    .map((polygon) =>
      polygon
        .map((ring) =>
          ring
            .map((point, index) => {
              const [x, y] = project(point);
              return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(" ") + " Z",
        )
        .join(" "),
    )
    .join(" ");
}

function metricValues(city) {
  return city.districts
    .map((district) => district[state.metric])
    .filter((value) => value != null && Number.isFinite(value));
}

function colorFor(value, values) {
  if (value == null || values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const position = min === max ? 0.5 : (value - min) / (max - min);
  const index = Math.min(PALETTE.length - 1, Math.floor(position * PALETTE.length));
  return PALETTE[index];
}

function rankedDistricts(city) {
  return city.districts
    .filter((district) => district[state.metric] != null)
    .slice()
    .sort((a, b) => b[state.metric] - a[state.metric]);
}

function competitionRank(ranked, district) {
  const value = district[state.metric];
  if (value == null) return null;
  const firstIndex = ranked.findIndex((candidate) => candidate[state.metric] === value);
  return firstIndex < 0 ? null : firstIndex + 1;
}

function rankingAllowed() {
  return !["vitalityDemoScore", "scenarioScore", "medianHouseholdIncome"].includes(state.metric);
}

function renderCityTabs() {
  elements.cityTabs.innerHTML = "";
  state.data.cities.forEach((city, index) => {
    const button = document.createElement("button");
    button.className = "city-tab";
    button.type = "button";
    button.role = "radio";
    button.id = `city-tab-${city.id}`;
    button.dataset.cityId = city.id;
    button.setAttribute("aria-checked", String(city.id === state.cityId));
    button.tabIndex = city.id === state.cityId ? 0 : -1;
    button.textContent = city.name;
    button.addEventListener("click", () => selectCity(city.id));
    button.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = (index + (event.key === 'ArrowRight' ? 1 : -1) + state.data.cities.length) % state.data.cities.length;
      const nextCity = state.data.cities[nextIndex];
      selectCity(nextCity.id);
      document.querySelector(`#city-tab-${nextCity.id}`).focus();
    });
    elements.cityTabs.append(button);
  });
}

function updateCityTabs() {
  elements.cityTabs.querySelectorAll(".city-tab").forEach((button) => {
    const selected = button.dataset.cityId === state.cityId;
    button.setAttribute("aria-checked", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
}

function renderMetricOptions() {
  const city = currentCity();
  if (!city.availableMetrics.includes(state.metric)) {
    state.metric = city.availableMetrics[0];
  }
  elements.metricSelect.innerHTML = "";
  city.availableMetrics.forEach((metricKey) => {
    const option = document.createElement("option");
    option.value = metricKey;
    option.textContent = METRICS[metricKey].label;
    option.selected = metricKey === state.metric;
    elements.metricSelect.append(option);
  });
}

function renderDistrictOptions() {
  const city = currentCity();
  elements.districtSelect.innerHTML = "";
  city.districts
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
    .forEach((district) => {
      const option = document.createElement("option");
      option.value = district.id;
      option.textContent = district.name;
      option.selected = district.id === state.districtId;
      elements.districtSelect.append(option);
    });
}

function selectCity(cityId) {
  state.cityId = cityId;
  const city = currentCity();
  if (!city.availableMetrics.includes(state.metric)) state.metric = city.availableMetrics[0];
  state.districtId = city.defaultDistrictId;
  updateCityTabs();
  renderMetricOptions();
  renderDistrictOptions();
  renderAll();
}

function selectDistrict(districtId, restoreRankingFocus = false) {
  state.districtId = districtId;
  elements.districtSelect.value = districtId;
  elements.mapPaths.querySelectorAll(".district-path").forEach((path) => {
    path.classList.toggle("selected", path.dataset.districtId === districtId);
    path.setAttribute("aria-pressed", String(path.dataset.districtId === districtId));
  });
  renderInspector();
  renderRanking();
  renderSensitivity();
  saveLocation();
  if (restoreRankingFocus) {
    requestAnimationFrame(() => elements.ranking.querySelector(".ranking-button.active")?.focus());
  }
}

function positionTooltip(event) {
  const stage = event.currentTarget.closest(".map-stage");
  const stageRect = stage.getBoundingClientRect();
  const left = Math.min(stageRect.width - 155, Math.max(8, event.clientX - stageRect.left + 12));
  const top = Math.min(stageRect.height - 70, Math.max(8, event.clientY - stageRect.top + 12));
  elements.tooltip.style.left = `${left}px`;
  elements.tooltip.style.top = `${top}px`;
}

function showTooltip(event, district) {
  const metric = METRICS[state.metric];
  elements.tooltip.innerHTML = `<strong>${district.name}</strong>${metric.format(district[state.metric])} ${metric.unit}`;
  elements.tooltip.hidden = false;
  positionTooltip(event);
}

function renderMap() {
  const city = currentCity();
  const metric = METRICS[state.metric];
  const values = metricValues(city);
  const project = projector(cityBounds(city));
  elements.mapPaths.innerHTML = "";

  city.districts.forEach((district) => {
    const value = district[state.metric];
    const path = document.createElementNS(SVG_NS, "path");
    path.classList.add("district-path");
    if (value == null) path.classList.add("missing");
    if (district.id === state.districtId) path.classList.add("selected");
    path.dataset.districtId = district.id;
    path.setAttribute("d", pathFromGeometry(district.geometry, project));
    path.setAttribute("fill-rule", "evenodd");
    path.setAttribute("tabindex", "0");
    path.setAttribute("role", "button");
    path.setAttribute("aria-pressed", String(district.id === state.districtId));
    path.setAttribute(
      "aria-label",
      `${district.name}，${metric.label}：${metric.format(value)} ${metric.unit}`,
    );
    if (value != null) path.style.fill = colorFor(value, values);
    path.addEventListener("click", () => selectDistrict(district.id));
    path.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectDistrict(district.id);
      }
    });
    path.addEventListener("pointerenter", (event) => showTooltip(event, district));
    path.addEventListener("pointermove", positionTooltip);
    path.addEventListener("pointerleave", () => {
      elements.tooltip.hidden = true;
    });
    path.addEventListener("pointercancel", () => {
      elements.tooltip.hidden = true;
    });
    path.addEventListener("pointerup", () => {
      elements.tooltip.hidden = true;
    });
    elements.mapPaths.append(path);
  });

  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  elements.mapCity.textContent = city.name;
  elements.mapCityEn.textContent = city.nameEn.toUpperCase();
  elements.mapMetric.textContent = metric.label;
  elements.mapSvgTitle.textContent = `${city.name} ${metric.label}交互地图`;
  elements.mapSvgDescription.textContent = `显示${city.districts.length}个县级或区级统计单元。使用行政区下拉菜单、键盘 Tab 键或鼠标选择。`;
  elements.metricStatus.className = `status-badge ${metric.status}`;
  elements.metricStatus.textContent = metric.statusLabel;
  elements.legendLow.textContent = metric.low;
  elements.legendHigh.textContent = metric.high;
  const thresholds = min == null || max == null
    ? []
    : [0, 0.2, 0.4, 0.6, 0.8, 1].map((share) => min + (max - min) * share);
  elements.legendValues.textContent = thresholds.length
    ? `阈值 ${thresholds.map((value) => metric.format(value)).join(" · ")} ${metric.unit}`
    : "当前指标无可用值";
  elements.missingKey.hidden = values.length === city.districts.length;
}

function factsFor(district) {
  if (state.cityId === "hong-kong") {
    const incomeYear = currentCity().incomeYear;
    return [
      ["家庭月收入中位数", `HK$ ${METRICS.medianHouseholdIncome.format(district.medianHouseholdIncome)}`],
      ["数据年份", incomeYear],
      ["行政区范围", "香港 18 区"],
      ["比较口径", "仅香港区内"],
    ];
  }
  const population = METRICS.population2020.format(district.population2020);
  const growth = METRICS.populationGrowthPct.format(district.populationGrowthPct);
  const child = METRICS.childShare.format(district.childShare);
  const senior = METRICS.seniorShare.format(district.seniorShare);
  return [
    ["2020 常住人口", population === "—" ? "缺失" : `${population} 人`],
    ["十年人口变化", growth === "—" ? "缺失" : `${growth}%`],
    ["0–14 岁", child === "—" ? "缺失" : `${child}%`],
    ["65 岁以上", senior === "—" ? "缺失" : `${senior}%`],
  ];
}

function sourceFor(city) {
  if (state.metric === "medianHouseholdIncome") {
    return `© 香港特别行政区政府：政府统计处 ${city.incomeYear} API；民政事务总署 CSDI 18 区边界。`;
  }
  if (["vitalityDemoScore", "scenarioScore"].includes(state.metric)) {
    return "Dong et al. 中国县级人口普查面板 v1；本站三项人口结构分位与加权演示。";
  }
  if (state.metric === "populationGrowthPct") {
    return "2010/2020 人口普查区级常住人口；本站计算十年总变化率。";
  }
  return `${city.source}，2020。`;
}

function renderInspector() {
  const city = currentCity();
  const district = currentDistrict();
  const metric = METRICS[state.metric];
  const ranked = rankedDistricts(city);
  const rank = competitionRank(ranked, district);
  const value = district[state.metric];

  elements.selectedCode.textContent = district.id;
  if (value == null) {
    elements.selectedRank.textContent = "当前指标缺失";
  } else if (["vitalityDemoScore", "scenarioScore"].includes(state.metric)) {
    elements.selectedRank.textContent = "演示指标 · 不提供排名";
  } else if (state.metric === "medianHouseholdIncome") {
    elements.selectedRank.textContent = "抽样估计 · 不作显著性排名";
  } else {
    elements.selectedRank.textContent = `数值第 ${rank} / ${ranked.length}（并列同位）`;
  }
  elements.selectedCityEn.textContent = city.nameEn.toUpperCase();
  elements.selectedName.textContent = district.name;
  elements.selectedValue.textContent = metric.format(value);
  elements.selectedUnit.textContent = metric.unit;
  elements.metricExplainer.textContent = metric.explainer;
  elements.metricCaveat.textContent = metric.caveat;
  elements.sourceLine.textContent = sourceFor(city);
  elements.districtFacts.innerHTML = factsFor(district)
    .map(([label, fact]) => `<div><dt>${label}</dt><dd>${fact}</dd></div>`)
    .join("");

  const coverage =
    state.metric === "vitalityDemoScore" ? district.scoreCoverage : value == null ? 0 : 100;
  elements.coverageValue.textContent = `${coverage}%`;
  elements.coverageBar.style.width = `${coverage}%`;
  if (state.metric === "vitalityDemoScore") {
    elements.coverageCopy.textContent =
      value == null
        ? "三项组成指标未全部可用，演示分不显示，也不进行插补。"
        : "由 3 个已发布人口指标构成；不含个人收入预测。";
  } else if (state.metric === "medianHouseholdIncome") {
    elements.coverageCopy.textContent = "公开调查点估计；仅覆盖香港 18 区，不与大陆指标横向比较。";
  } else {
    elements.coverageCopy.textContent = value == null ? "原表缺失；保持空白，不做模型填补。" : "原始或直接计算值可用。";
  }
}

function renderRanking() {
  const allowed = rankingAllowed();
  elements.rankingBlock.hidden = !allowed;
  if (!allowed) {
    elements.ranking.innerHTML = "";
    return;
  }
  const metric = METRICS[state.metric];
  const ranked = rankedDistricts(currentCity());
  const visible = ranked.filter((district) => competitionRank(ranked, district) <= 6);
  const selected = ranked.find((district) => district.id === state.districtId);
  const selectedRank = selected ? competitionRank(ranked, selected) : null;
  if (selected && selectedRank > 6) visible.push(selected);
  elements.ranking.innerHTML = "";
  visible.forEach((district) => {
    const rank = competitionRank(ranked, district);
    if (rank > 6) {
      const separator = document.createElement("li");
      separator.className = "ranking-separator";
      separator.textContent = "… 当前选中单元 …";
      elements.ranking.append(separator);
    }
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `ranking-button${district.id === state.districtId ? " active" : ""}`;
    button.innerHTML = `<span>${String(rank).padStart(2, "0")}</span><b>${district.name}</b><span>${metric.format(district[state.metric])}</span>`;
    button.addEventListener("click", () => selectDistrict(district.id, true));
    item.append(button);
    elements.ranking.append(item);
  });
}

function renderAll() {
  updateScenario();
  renderMap();
  renderInspector();
  renderRanking();
  renderSensitivity();
  saveLocation();
}

elements.metricSelect.addEventListener("change", (event) => {
  state.metric = event.target.value;
  renderAll();
});

elements.districtSelect.addEventListener("change", (event) => {
  selectDistrict(event.target.value);
});

async function init() {
  try {
    const response = await fetch("./data/atlas-data.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
    state.data.cities.filter(c => c.id !== "hong-kong").forEach(c => c.availableMetrics.push("scenarioScore"));
    restoreLocation();
    const city = currentCity();
    if (!state.districtId) state.districtId = city.defaultDistrictId;
    addMissingPattern();
    renderCityTabs();
    renderMetricOptions();
    renderDistrictOptions();
    renderAll();
    try {
      const experimentResponse = await fetch("./data/experiments.json");
      if (!experimentResponse.ok) throw new Error("experiment data unavailable");
      state.experiments = await experimentResponse.json();
      renderSensitivity();
      renderBacktest();
    } catch (error) {
      document.querySelector("#backtest-summary").textContent = "实验数据未能加载，请刷新重试。地图仍可使用。";
    }
  } catch (error) {
    elements.mapPaths.innerHTML = "";
    elements.mapMetric.textContent = "数据加载失败";
    elements.metricExplainer.textContent = `无法读取地图数据：${error.message}`;
  }
}


const weightIds = ["growth", "working", "child"];

function updateScenario() {
  const city = currentCity();
  const scores = AtlasModel.scores(city, state.weights);
  city.districts.forEach(d => { d.scenarioScore = scores[d.id]; });
  const normalized = AtlasModel.normalized(state.weights);
  document.querySelector("#scenario-controls").hidden = state.metric !== "scenarioScore";
  document.querySelector("#weight-warning").hidden = normalized !== null;
  weightIds.forEach((id, i) => {
    document.querySelector(`#weight-${id}`).value = state.weights[i];
    document.querySelector(`#weight-${id}-label`).textContent = normalized ? `${(normalized[i] * 100).toFixed(1)}%` : "—";
  });
}

function renderSensitivity() {
  const card = document.querySelector("#sensitivity-card");
  card.hidden = !["scenarioScore", "vitalityDemoScore"].includes(state.metric);
  if (card.hidden) return;
  const city = state.experiments?.sensitivity[state.cityId];
  const row = city?.districts[state.districtId];
  document.querySelector("#sensitivity-result").textContent = !city ? "实验结果加载中…" : !row
    ? "缺少完整的三项指标，保留空缺，不参与情景排序。"
    : `${city.scenarioCount} 组权重下，情景次序在第 ${row.bestRank}–${row.worstRank} 位之间（完整数据单元 ${city.completeCount} 个）。`;
  document.querySelector("#sensitivity-detail").textContent = row
    ? `处于情景前 1/4 的占比：${(row.topQuarterShare * 100).toFixed(1)}%。权重以 10% 为步长，遍历所有非负且总和为 100% 的组合。`
    : "";
}

weightIds.forEach((id, i) => document.querySelector(`#weight-${id}`).addEventListener("input", event => {
  state.weights[i] = Number(event.target.value);
  renderAll();
}));
document.querySelector("#reset-weights").addEventListener("click", () => {
  state.weights = [50, 30, 20]; renderAll();
});

function saveLocation() {
  const url = new URL(location.href);
  url.searchParams.set("city", state.cityId);
  url.searchParams.set("district", state.districtId);
  url.searchParams.set("metric", state.metric);
  if (state.metric === "scenarioScore") url.searchParams.set("weights", state.weights.join(","));
  else url.searchParams.delete("weights");
  history.replaceState(null, "", url);
}
function restoreLocation() {
  const params = new URLSearchParams(location.search);
  const city = state.data.cities.find(c => c.id === params.get("city"));
  if (city) state.cityId = city.id;
  const active = currentCity();
  if (active.availableMetrics.includes(params.get("metric"))) state.metric = params.get("metric");
  if (active.districts.some(d => d.id === params.get("district"))) state.districtId = params.get("district");
  const weights = (params.get("weights") || "").split(",").map(Number);
  if (weights.length === 3 && weights.every(w => Number.isFinite(w) && w >= 0 && w <= 100)) state.weights = weights;
}

const money = value => new Intl.NumberFormat("en-HK", {maximumFractionDigits: 0}).format(value);
function renderBacktest() {
  const data = state.experiments.backtest;
  const baseline = data.models.find(m => m.id === "persistence");
  const selected = data.models.find(m => m.id === "shrinkage");
  const best = data.models.reduce((a, b) => a.mae < b.mae ? a : b);
  document.querySelector("#backtest-summary").textContent = `验证集选中各区趋势权重 ${(data.selectedWeight * 100).toFixed(0)}%。2025 年，“${best.name}”的 MAE 最低（HK$ ${money(best.mae)}）；收缩模型为 HK$ ${money(selected.mae)}，上年值基线为 HK$ ${money(baseline.mae)}。`;
  renderPrediction();
}
function renderPrediction() {
  if (!state.experiments) return;
  const data = state.experiments.backtest;
  const model = document.querySelector("#prediction-model").value;
  document.querySelector("#backtest-models").innerHTML = data.models.map(m =>
    `<tr class="${m.id === model ? "selected-model" : ""}"><th scope="row">${m.name}</th><td>${money(m.mae)}</td><td>${money(m.rmse)}</td></tr>`).join("");
  const svg = document.querySelector("#prediction-plot");
  svg.replaceChildren();
  const node = (tag, attributes, text, parent = svg) => {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([key, value]) => el.setAttribute(key, String(value)));
    if (text != null) el.textContent = text;
    parent.append(el); return el;
  };
  const all = data.districts.flatMap(d => [d.actual, d.predictions[model]]);
  const min = Math.floor(Math.min(...all) / 10000) * 10000;
  const max = Math.ceil(Math.max(...all) / 10000) * 10000;
  const x = value => 85 + 470 * (value - min) / (max - min);
  const y = value => 315 - 260 * (value - min) / (max - min);
  node("title", {}, "香港 18 区：2025 年家庭月收入预测与实际值");
  for (let value = min; value <= max; value += 10000) {
    node("line", {x1: x(value), x2: x(value), y1: 55, y2: 315, stroke: "#dce1e9"});
    node("line", {x1: 85, x2: 555, y1: y(value), y2: y(value), stroke: "#dce1e9"});
    node("text", {x: x(value), y: 339, "text-anchor": "middle"}, `${value / 1000}k`);
    node("text", {x: 72, y: y(value) + 5, "text-anchor": "end"}, `${value / 1000}k`);
  }
  node("line", {x1: 85, y1: 315, x2: 555, y2: 55, stroke: "#607086", "stroke-dasharray": "6 5"});
  node("text", {x: 85, y: 28}, "预测 · HK$/月");
  node("text", {x: 320, y: 379, "text-anchor": "middle"}, "实际 · HK$/月");
  for (const d of data.districts) {
    const circle = node("circle", {cx: x(d.actual), cy: y(d.predictions[model]), r: 6, fill: "#2654ff", "fill-opacity": .7, stroke: "white", "stroke-width": 1.5, tabindex: 0, "aria-label": `${d.name}，实际 ${money(d.actual)}，预测 ${money(d.predictions[model])}`});
    node("title", {}, `${d.name}: 实际 ${money(d.actual)} / 预测 ${money(d.predictions[model])}`, circle);
  }
  document.querySelector("#prediction-districts").innerHTML = data.districts.map(d =>
    `<tr><th scope="row">${d.name}</th><td>${money(d.actual)}</td><td>${money(d.predictions[model])}</td><td>${d.predictions[model] >= d.actual ? "+" : ""}${money(d.predictions[model] - d.actual)}</td></tr>`).join("");
}
document.querySelector("#prediction-model").addEventListener("change", renderPrediction);
init();
