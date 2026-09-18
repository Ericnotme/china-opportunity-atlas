# 数据来源与许可

最后核验：2026-09-17。

## 当前发布数据

### 1. 大陆五城市人口与区界

- 数据集：[leiii/census — China Census](https://github.com/leiii/census)
- 文件：`census_county_2010-2020_v1.csv`
- 锁定版本：Git commit `0ba0f1efae092f4aa6569ef38e53b3bb4d2f0087`。
- 输入 SHA-256：`fad846ca900fc6c15c0c81d2217efef3e41ac2d1cec25c693c28d6959fba56a8`。
- 原始来源说明：项目团队从地方政府与统计部门的 2020 人口普查公报中人工收集、交叉复核，并与 2010 人口普查和行政区调整匹配。
- 本站使用字段：2010/2020 常住人口、2020 年 0–14、15–59、65 岁以上人口比例、县区 WKT 边界。
- 许可：上游仓库 MIT License；完整版权与许可文本见 `THIRD_PARTY_NOTICES.md`。
- 引用：Lei Dong, Rui Du, and Yu Liu, *Mapping Evolving Population Geography in China*, 2022 working paper.

### 2. 香港 18 区边界

- 官方数据集：[District Boundary — CSDI / Home Affairs Department](https://portal.csdi.gov.hk/csdi-webpage/dataset/had_rcd_1634523272907_75218)
- 发布机构：香港特别行政区政府民政事务总署。
- 当前页面修订日期：2026-07-17；18 条记录。
- 快照下载：[官方 GeoJSON 压缩包](https://static.csdi.gov.hk/csdi-webpage/download/83cd933a39c7525581d6aa429a981c90/geojson)；压缩包 SHA-256 `3a64c780299cef7a12a2b489b80086158b564a06e2b0fec64cfccc935700d23d`。
- 官方转换 GeoJSON SHA-256：`c5b284814b534afaee66707868b493ebe18d6f7dc6d40635970d8e9753dadeeb`。
- 下载格式：官方转换 GeoJSON，WGS84 经度/纬度。
- 使用条款：[DATA.GOV.HK Terms and Conditions](https://data.gov.hk/en/terms-and-conditions)。
- 处理：仅保留区名、区码与经简化的几何，不在运行时调用第三方底图。
- 归因：© 香港特别行政区政府，民政事务总署；经 CSDI / DATA.GOV.HK 获取。

### 3. 香港家庭收入

- 官方表：[Table 130-06806 — Median monthly domestic household income by District Council district](https://www.censtatd.gov.hk/en/web_table.html?id=130-06806)
- 发布机构：香港特别行政区政府统计处。
- 本站层：2025 年家庭住户每月收入中位数公开调查估计，单位 HK$/月。
- 机器可读输入：仓库内 `data/source/hk-income-130-06806-api.json`，由官网表格生成的 GET API 快照；响应覆盖 2022–2025 年，本站筛选 `sv=MED_DH_INC`、`period=2025` 与 18 个非空区码。
- API 快照 SHA-256：`c357deec0b0d3346415955255bc961e5d95c758ba37b09f2205623842b483212`；响应中的查询参数与来源说明一并保留。
- 注意：数值来自综合住户统计调查，是存在抽样误差的点估计；区际差异不等于统计显著差异。该层与大陆人口层的年份、币种和统计对象不同，且本站不提供香港区际显著性排名。
- 时间错配：收入统计年份为 2025，当前区界快照修订于 2026；网站按官方区码连接，不声称使用完全同期边界。
- 归因：© 香港特别行政区政府，政府统计处；经 DATA.GOV.HK 获取。

## 文献与调查：用于方法约束，不直接绘图区值

### CFPS

- 官方页：[中国家庭追踪调查](https://www.isss.pku.edu.cn/cfps/)
- 抽样报告：[CFPS-2010 抽样设计](https://www.isss.pku.edu.cn/cfps/docs/20200520161539050175.pdf)
- 地理限制：公开数据省以下真实地理位置受限；抽样设计不能代表本项目六城每一个区。
- 本站不包含或再分发 CFPS 微观数据。

### CHFS

- 官方页：[中国家庭金融调查公开数据库](https://chfs.swufe.edu.cn/sjzx/gksjk.htm)
- 用途：家庭资产、负债、收入和金融行为的变量框架与后续机制研究路线。
- 本站不包含或再分发 CHFS 微观数据。

### 代际流动论文

- Ningning Guo, “The Sticky Floor and Ceiling of Big Cities: Intergenerational Mobility in Urban China,” *Journal of Economic Behavior & Organization* 246 (2026), 107544.
- [Elsevier 页面](https://www.sciencedirect.com/science/article/pii/S0167268126001307)
- 论文使用个体 CFPS 2010–2018 观测研究城市规模与代际流动；关键地理暴露/解释变量在城市层级，不能下推到区。本项目不把论文系数分配给区级单元。

### 美国 Opportunity Atlas

- [Opportunity Insights 项目与论文](https://opportunityinsights.org/paper/the-opportunity-atlas/)
- 用途：产品问题与因果验证路线的参照，不是本项目区级数值的来源。

## 许可边界

本仓库的 MIT License 只覆盖原创代码与原创文档。`dist/data/atlas-data.json` 中的第三方事实数据和区界继续受各上游来源条款约束。数据来源声明与 `THIRD_PARTY_NOTICES.md` 不得移除。

如面向中国大陆正式公开运营或商业化，应另行向自然资源主管部门确认地图审核与审图号要求；当前页面为六城独立区界的研究示意，不展示国界或海疆。
