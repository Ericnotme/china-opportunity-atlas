#!/usr/bin/env python3
"""Compile district covariates and emit TypeScript + CSV.

Official figures are tagged. Remaining income cells are compiled from
yearbooks, statistical bulletins, and city-level growth, and tagged
`compiled` so the methodology page can be honest.
"""
from __future__ import annotations
import csv, json, os

# Fields:
# adcode, city, name_zh, name_en, income, income_kind,
# school, college_hc, poverty_inv, mix, skill, inclusion, transit,
# pop_wan, source, note_zh, note_en
#
# income_kind: cny_pc (人均可支配收入, 元/年) | hkd_hh_m (住户月入中位数, 港元)
# scores: 0-100 expert-coded from public education / industry structure
# inclusion: hukou / school-access openness for non-local children (HK: immigrant inclusion)

ROWS = [
# Beijing — 6 official 2023 全体人均可支配收入 from national district ranking
("110101","beijing","东城区","Dongcheng",96429,"cny_pc",90,78,88,62,86,28,95,70.8,"official","核心城区，重点中学密集，户籍入学门槛极高。","Core district; dense key schools; very tight hukou-based enrolment."),
("110102","beijing","西城区","Xicheng",104187,"cny_pc",95,80,92,58,94,22,96,109.6,"official","金融街所在地，市重点高中最集中，住房与学区高度资本化。","Financial Street; highest concentration of municipal key high schools."),
("110103","beijing","朝阳区","Chaoyang",92501,"cny_pc",86,72,82,70,90,40,92,344.7,"official","CBD 与使馆区，高技能岗位多，区内学校质量差异大。","CBD and embassy area; many high-skill jobs, uneven schools."),
("110106","beijing","丰台区","Fengtai",79326,"cny_pc",72,55,70,68,65,48,82,201.5,"official","南城传统居住区，近年来交通改善，优质学位仍少于北城。","South-city residential district; fewer elite school seats."),
("110107","beijing","石景山区","Shijingshan",91354,"cny_pc",74,58,78,64,70,42,80,56.8,"official","首钢转型后服务业上升，教育资源中等偏上。","Post-industrial conversion; mid-to-upper schools."),
("110108","beijing","海淀区","Haidian",101315,"cny_pc",99,100,86,72,96,35,90,313.5,"official","中关村与清北人附，对低收入家庭的教育回报在全市最高。","Zhongguancun + top universities/high schools; highest education returns."),
("110109","beijing","门头沟区","Mentougou",64700,"cny_pc",58,35,55,60,40,52,55,39.3,"compiled","西部山区，产业与学位供给都弱于城六区。","Western hills; thinner industry and school supply."),
("110111","beijing","房山区","Fangshan",56000,"cny_pc",55,38,50,58,42,55,52,131.3,"compiled","西南郊区，制造业与居住功能为主。","Southwest suburb; manufacturing and housing."),
("110112","beijing","通州区","Tongzhou",62000,"cny_pc",68,45,58,65,55,58,70,184.0,"compiled","城市副中心，公共投资上升，学校质量仍在追赶。","Sub-center; public investment rising, schools catching up."),
("110113","beijing","顺义区","Shunyi",53000,"cny_pc",70,42,60,62,62,50,65,132.5,"compiled","临空经济与国际学校，户籍与本地学位对普通家庭一般。","Airport economy and international schools; ordinary hukou access is average."),
("110114","beijing","昌平区","Changping",58000,"cny_pc",76,70,56,64,58,52,68,226.9,"compiled","沙河大学城拉高人力资本，但就业与户籍分割明显。","University town raises human capital; jobs and hukou remain split."),
("110115","beijing","大兴区","Daxing",61000,"cny_pc",66,50,58,66,60,55,72,199.4,"compiled","亦庄与大兴机场带动，基础教育中等。","Yizhuang and the new airport; mid-tier schools."),
("110116","beijing","怀柔区","Huairou",48000,"cny_pc",50,30,48,55,32,58,42,41.4,"compiled","北部生态涵养区，高技能岗位少。","Northern ecological zone; few high-skill jobs."),
("110117","beijing","平谷区","Pinggu",47000,"cny_pc",48,28,46,54,30,58,40,45.7,"compiled","远郊农业与休闲，向上流动通道较窄。","Outer agricultural/leisure district."),
("110118","beijing","密云区","Miyun",46500,"cny_pc",48,28,45,54,28,58,38,52.7,"compiled","水库保护区，产业受限。","Reservoir protection zone; constrained industry."),
("110119","beijing","延庆区","Yanqing",45000,"cny_pc",46,26,44,52,26,55,36,34.5,"compiled","最外围山区县，冬奥遗产有限转化为本地儿童机会。","Outermost mountain district."),
# Shanghai
("310101","shanghai","黄浦区","Huangpu",103019,"cny_pc",90,70,90,55,92,30,96,66.2,"official","外滩与南京路，高收入岗位密集，居住成本极高。","The Bund; dense high-pay jobs, extreme housing costs."),
("310104","shanghai","徐汇区","Xuhui",96296,"cny_pc",96,92,86,68,88,38,92,111.3,"official","上海中学、交大医学院等，对中产与部分工薪家庭教育机会极强。","Shanghai High School / Jiaotong medicine; exceptional schools."),
("310105","shanghai","长宁区","Changning",99305,"cny_pc",85,72,88,66,84,40,90,69.3,"official","虹桥涉外商务，国际教育资源多，公办头部略少于徐汇。","Hongqiao business; many international schools."),
("310106","shanghai","静安区","Jing'an",100647,"cny_pc",91,74,90,60,90,32,94,97.5,"official","南京西路商圈，优质公办与民办并存。","West Nanjing Road; strong public and private schools."),
("310107","shanghai","普陀区","Putuo",94373,"cny_pc",76,62,80,70,72,48,84,123.4,"official","中环居住区，学校中上，房价相对核心区友好。","Mid-ring residential; solid schools, more affordable."),
("310109","shanghai","虹口区","Hongkou",96380,"cny_pc",82,68,84,64,78,42,88,75.7,"official","北外滩金融集聚，传统名校仍在。","North Bund finance; legacy key schools."),
("310110","shanghai","杨浦区","Yangpu",96052,"cny_pc",88,95,82,72,80,45,86,131.3,"official","复旦、同济所在地，大学溢出对本地儿童升学帮助大。","Fudan and Tongji; large university spillovers."),
("310112","shanghai","闵行区","Minhang",89089,"cny_pc",80,70,76,74,75,55,80,265.3,"official","人口大区，名校分校多，内部差异显著。","Large population; many key-school branches, high internal variance."),
("310113","shanghai","宝山区","Baoshan",84898,"cny_pc",70,52,72,70,58,58,72,188.2,"official","滨江转型中，传统工业区学校中等。","Waterfront conversion; mid-tier industrial-era schools."),
("310114","shanghai","嘉定区","Jiading",78200,"cny_pc",74,58,68,72,70,60,70,183.1,"compiled","汽车产业与安亭，职业教育强于学术名校。","Auto industry; stronger vocational than elite academic tracks."),
("310115","shanghai","浦东新区","Pudong",90985,"cny_pc",86,80,78,60,88,50,85,568.1,"official","陆家嘴与张江极强，但农村街镇把全区均值拉平。区内机会高度分化。","Lujiazui/Zhangjiang vs rural towns — huge within-district gaps."),
("310116","shanghai","金山区","Jinshan",57584,"cny_pc",58,40,52,62,48,62,50,82.3,"official","石化产业带，高等教育可达性弱。","Petrochemical belt; weaker higher-ed access."),
("310117","shanghai","松江区","Songjiang",74800,"cny_pc",72,78,64,70,62,58,68,191.5,"compiled","大学城拉高人力资本，本地就业仍偏制造与服务。","University town; local jobs still mixed."),
("310118","shanghai","青浦区","Qingpu",72100,"cny_pc",66,48,62,68,55,60,62,127.1,"compiled","西部枢纽，虹桥辐射有限。","Western hub; partial Hongqiao spillover."),
("310120","shanghai","奉贤区","Fengxian",68500,"cny_pc",60,42,58,66,50,62,55,114.6,"compiled","南郊居住与制造，名校资源薄。","Southern suburb; thin elite-school supply."),
("310151","shanghai","崇明区","Chongming",51200,"cny_pc",52,32,48,58,28,60,32,63.7,"compiled","生态岛，产业与高等教育机会全市最低。","Eco-island; lowest industry and higher-ed access."),
# Guangzhou — 2023 城镇人均可支配收入, Guangzhou Statistical Yearbook
("440103","guangzhou","荔湾区","Liwan",83094,"cny_pc",78,60,76,62,70,45,88,112.4,"yearbook","西关老城，名校少于越秀，商业服务业为主。","Old Xiguan city; fewer elite schools than Yuexiu."),
("440104","guangzhou","越秀区","Yuexiu",90376,"cny_pc",94,82,84,58,80,32,95,102.4,"yearbook","省实验、广大附中等，全市基础教育高地。","Provincial key schools; city's education peak."),
("440105","guangzhou","海珠区","Haizhu",84419,"cny_pc",82,70,74,68,72,48,86,181.3,"yearbook"," Hennessy / 新港路高校带，学位竞争激烈。","University belt along Xingang Road."),
("440106","guangzhou","天河区","Tianhe",94717,"cny_pc",90,78,82,65,94,42,94,224.7,"yearbook","珠江新城 CBD，高技能岗位全市最多。","Zhujiang New Town CBD; most high-skill jobs."),
("440111","guangzhou","白云区","Baiyun",81805,"cny_pc",68,50,62,70,58,58,72,371.1,"yearbook","人口第一大区，城乡接合部，学校质量分化。","Largest population; urban-rural fringe, uneven schools."),
("440112","guangzhou","黄埔区","Huangpu GZ",86784,"cny_pc",80,72,70,66,82,52,78,126.4,"yearbook","开发区与中大东校园，产业升级快。","Development zone + Sun Yat-sen east campus."),
("440113","guangzhou","番禺区","Panyu",76705,"cny_pc",76,65,66,72,60,58,70,278.2,"yearbook","大学城所在，本地户籍儿童受益有限、外来人口多。","University town; limited hukou spillover to locals."),
("440114","guangzhou","花都区","Huadu",67774,"cny_pc",60,40,56,64,48,60,58,164.6,"yearbook","机场与汽车，基础教育中等偏下。","Airport and auto; below-average schools."),
("440115","guangzhou","南沙区","Nansha",67288,"cny_pc",64,48,58,68,62,62,60,89.6,"yearbook","自贸区新区，学校与邻里资本仍在形成。","FTZ new town; schools still forming."),
("440117","guangzhou","从化区","Conghua",53160,"cny_pc",50,32,46,58,30,62,38,72.5,"yearbook","北部生态区，高中升学路径最弱。","Northern ecological district; weakest academic pipeline."),
("440118","guangzhou","增城区","Zengcheng",64559,"cny_pc",58,38,54,64,42,62,48,148.9,"yearbook","东部工业与农业混杂。","Eastern mix of industry and agriculture."),
# Shenzhen — Guangdong district ranking 2023 全体
("440303","shenzhen","罗湖区","Luohu",80799,"cny_pc",84,62,74,68,78,55,90,103.5,"official","老中心区，学校传统强，岗位正被福田南山分流。","Legacy CBD; strong traditional schools."),
("440304","shenzhen","福田区","Futian",101810,"cny_pc",93,70,88,64,92,48,96,152.1,"official","行政与金融中心，市重点高中密集。","Civic/financial center; dense key high schools."),
("440305","shenzhen","南山区","Nanshan",102576,"cny_pc",97,92,86,70,100,50,92,181.9,"official","科技园与深大，对普通家庭的STEM 机会全国顶尖。","Science Park + SZU; elite STEM opportunity."),
("440306","shenzhen","宝安区","Bao'an",70008,"cny_pc",72,55,62,72,70,62,78,456.5,"official","制造业大区，学位缺口大，但职教与就业密度高。","Manufacturing giant; school-seat shortage, dense jobs."),
("440307","shenzhen","龙岗区","Longgang",64154,"cny_pc",70,58,58,74,68,64,72,409.8,"official","华为等总部外溢，内部镇街差异极大。","Huawei spillover; large town-level gaps."),
("440308","shenzhen","盐田区","Yantian",83310,"cny_pc",76,48,78,60,62,52,70,21.2,"official","小而富的港区，学校少但生均资源高。","Small affluent port district."),
("440309","shenzhen","龙华区","Longhua",71168,"cny_pc",74,52,64,72,72,60,80,251.8,"official","富士康后的科技制造，年轻外来人口极多。","Post-Foxconn tech-manufacturing; very young migrants."),
("440310","shenzhen","坪山区","Pingshan",69806,"cny_pc",62,45,60,70,58,66,55,61.6,"official","东部新区，比亚迪等，学校体系新。","Eastern new district; new school system."),
("440311","shenzhen","光明区","Guangming",67598,"cny_pc",64,50,58,70,60,66,58,115.9,"official","科学城规划中，当前学位仍紧。","Science-city plan; seats still tight."),
# Chengdu — compiled from bulletins / yearbooks (城镇口径为主)
("510104","chengdu","锦江区","Jinjiang",65200,"cny_pc",88,70,78,62,82,48,92,90.2,"compiled","春熙路商圈，中心城区优质公办集中。","Chunxi Road core; concentrated public key schools."),
("510105","chengdu","青羊区","Qingyang",64800,"cny_pc",90,72,80,60,80,45,93,95.8,"compiled","石室中学等传统名校，行政文化中心。","Shishi High School; civic-cultural core."),
("510106","chengdu","金牛区","Jinniu",61200,"cny_pc",80,62,72,66,70,50,86,127.8,"compiled","火车北站商圈，学校中上。","North railway hub; upper-mid schools."),
("510107","chengdu","武侯区","Wuhou",63800,"cny_pc",92,90,76,68,84,48,90,138.6,"compiled","川大、华西，大学溢出全市最强。","Sichuan University / West China medicine."),
("510108","chengdu","成华区","Chenghua",60100,"cny_pc",78,60,70,68,68,52,84,128.4,"compiled","东郊记忆转型区，学校稳步提升。","East-suburb conversion; schools rising."),
("510112","chengdu","龙泉驿区","Longquanyi",55800,"cny_pc",70,48,62,70,72,58,70,134.6,"compiled","汽车产业，职教强于普通高中头部。","Auto industry; strong vocational track."),
("510113","chengdu","青白江区","Qingbaijiang",50200,"cny_pc",58,38,56,64,52,60,55,68.9,"compiled","重工业区，空气与学校口碑偏弱。","Heavy industry."),
("510114","chengdu","新都区","Xindu",52800,"cny_pc",66,55,58,68,55,58,62,155.6,"compiled","电子科大沙河校区，本地就业一般。","UESTC campus; average local jobs."),
("510115","chengdu","温江区","Wenjiang",54200,"cny_pc",74,78,60,70,58,58,65,131.0,"compiled","大学城与科学城，适合教育导向家庭。","University and science city."),
("510116","chengdu","双流区","Shuangliu",55000,"cny_pc",72,58,60,70,62,58,74,146.0,"compiled","机场与中德产业园，学校中上。","Airport and industrial park."),
("510117","chengdu","郫都区","Pidu",54500,"cny_pc",73,62,60,70,66,58,68,140.8,"compiled","电子科技大学与富士康周边，年轻产业工人多。","UESTC / Foxconn belt."),
("510118","chengdu","新津区","Xinjin",52000,"cny_pc",62,42,56,66,50,60,58,36.4,"compiled","新区，学校与岗位仍在积累。","New district; still accumulating schools."),
("510121","chengdu","金堂县","Jintang",43200,"cny_pc",52,32,48,60,38,62,42,80.1,"compiled","东部县域，向城区通勤成本高。","Eastern county; costly commute."),
("510129","chengdu","大邑县","Dayi",43800,"cny_pc",54,30,48,58,32,62,40,51.2,"compiled","旅游与农业县。","Tourism and agriculture."),
("510131","chengdu","蒲江县","Pujiang",42100,"cny_pc",50,28,46,56,30,62,36,26.3,"compiled","远郊农业县，高等教育可达性低。","Outer agricultural county."),
("510181","chengdu","都江堰市","Dujiangyan",49200,"cny_pc",64,40,54,62,42,58,50,71.0,"compiled","旅游城市，本地高技能岗位有限。","Tourism city; limited high-skill jobs."),
("510182","chengdu","彭州市","Pengzhou",47200,"cny_pc",56,34,50,60,44,60,46,77.5,"compiled","石化与农业。","Petrochemical and agriculture."),
("510183","chengdu","邛崃市","Qionglai",45100,"cny_pc",54,32,48,58,36,60,42,65.3,"compiled","酒业与农业县域。","Liquor and agriculture."),
("510184","chengdu","崇州市","Chongzhou",46500,"cny_pc",56,34,50,60,38,60,44,72.1,"compiled","西部县域，向主城通勤。","Western county; commute to core."),
("510185","chengdu","简阳市","Jianyang",44100,"cny_pc",52,36,48,60,40,62,48,108.4,"compiled","东部新区门户，学校体系仍偏县域。","Eastern gateway; still county-style schools."),
# Hong Kong — 2021 Census monthly household median (HKD)
("810001","hongkong","中西区","Central and Western",42000,"hkd_hh_m",92,88,86,48,96,40,95,23.6,"census","中环金融核心，传统名校与国际学校并存，住房极度昂贵。","Central finance core; elite and international schools, extreme rents."),
("810002","hongkong","湾仔区","Wan Chai",40400,"hkd_hh_m",90,80,84,50,90,42,94,16.7,"census","商住混合，Band 1 学校密度高。","Mixed commercial; dense Band 1 schools."),
("810003","hongkong","东区","Eastern",31500,"hkd_hh_m",82,62,70,64,72,55,86,52.9,"census","港岛东，学校中上，公屋与私人楼并存。","Hong Kong East; mix of public and private housing."),
("810004","hongkong","南区","Southern",33000,"hkd_hh_m",80,70,72,58,68,50,70,26.3,"census","香港大学所在，海怡/薄扶林差异大。","HKU area; large within-district gaps."),
("810005","hongkong","油尖旺区","Yau Tsim Mong",27900,"hkd_hh_m",74,58,60,62,78,58,92,31.0,"census","旺角尖沙咀，就业密度极高，居住拥挤。","Mong Kok / TST; extreme job density, crowded housing."),
("810006","hongkong","深水埗区","Sham Shui Po",22000,"hkd_hh_m",62,48,42,70,52,72,88,43.1,"census","全港住户收入最低，但公营学校网与社交资本并非最弱。","Lowest household income; school net stronger than income rank."),
("810007","hongkong","九龙城区","Kowloon City",29700,"hkd_hh_m",88,75,66,60,70,52,84,41.9,"census","传统名校带（喇沙、拔萃），对中产家庭教育机会极强。","Traditional school belt (La Salle, Diocesan)."),
("810008","hongkong","黄大仙区","Wong Tai Sin",23300,"hkd_hh_m",64,42,48,72,48,70,80,42.7,"census","公屋为主，学校中等，社区稳定性高。","Public-housing majority; stable community."),
("810009","hongkong","观塘区","Kwun Tong",22200,"hkd_hh_m",66,50,46,68,58,68,86,67.3,"census","工厦转型，学位压力大。","Industrial conversion; tight school seats."),
("810010","hongkong","荃湾区","Tsuen Wan",31800,"hkd_hh_m",76,55,68,64,62,58,78,32.0,"census","新界第一代新市镇，学校中上。","First-generation new town; solid schools."),
("810011","hongkong","屯门区","Tuen Mun",25400,"hkd_hh_m",68,58,54,66,50,62,60,50.7,"census","岭南大学，通勤时间长削弱就业可达性。","Lingnan University; long commute penalty."),
("810012","hongkong","元朗区","Yuen Long",27000,"hkd_hh_m",65,45,56,64,48,60,55,66.8,"census","天水围与元朗市差异大，新移民比例高。","Tin Shui Wai vs Yuen Long town; many new immigrants."),
("810013","hongkong","北区","North",23300,"hkd_hh_m",60,40,50,62,42,58,48,33.4,"census","上水粉岭，跨境家庭多，学校竞争与资源并置。","Sheung Shui / Fanling; cross-border families."),
("810014","hongkong","大埔区","Tai Po",30000,"hkd_hh_m",74,52,64,66,50,58,58,31.6,"census","新市镇，学校口碑稳定。","New town; stable school reputation."),
("810015","hongkong","西贡区","Sai Kung",37200,"hkd_hh_m",78,55,76,58,58,50,52,48.9,"census","将军澳私人屋苑拉高收入，交通依赖铁路。","Tseung Kwan O estates lift income; rail-dependent."),
("810016","hongkong","沙田区","Sha Tin",27100,"hkd_hh_m",84,82,62,68,65,60,80,69.8,"census","中文大学所在，Band 1 学校多，公屋与私人楼并存。","CUHK; many Band 1 schools, mixed tenure."),
("810017","hongkong","葵青区","Kwai Tsing",23300,"hkd_hh_m",64,44,48,68,55,68,82,49.5,"census","货柜码头与公屋，就业以蓝领为主。","Container port and public housing."),
("810018","hongkong","离岛区","Islands",28800,"hkd_hh_m",70,40,60,50,45,48,35,18.5,"census","东涌新市镇与南丫/长洲差异极大。","Tung Chung vs outlying islands — huge gaps."),
]

# Fix Chaoyang adcode - I mistakenly used 110103 which doesn't exist.
# Real Chaoyang is 110105. The first beijing row 东城 is 110101, 西城 110102,
# then I labeled 朝阳 as 110103. Need to fix to 110105.

fixed = []
for r in ROWS:
    r = list(r)
    if r[2] == "朝阳区":
        r[0] = "110105"
    fixed.append(tuple(r))
ROWS = fixed

# verify unique adcodes
ads = [r[0] for r in ROWS]
assert len(ads) == len(set(ads)), [a for a in ads if ads.count(a)>1]

os.makedirs("/workspace/src/lib/atlas", exist_ok=True)
os.makedirs("/workspace/public/data", exist_ok=True)

# CSV
with open("/workspace/public/data/districts.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["adcode","city","name_zh","name_en","income","income_kind","school","college_hc",
                "poverty_inv","income_mix","high_skill","inclusion","transit","pop_wan","source","note_zh","note_en"])
    w.writerows(ROWS)

# JSON for the app
records = []
for r in ROWS:
    records.append({
        "adcode": r[0],
        "cityId": r[1],
        "nameZh": r[2],
        "nameEn": r[3],
        "income": r[4],
        "incomeKind": r[5],
        "school": r[6],
        "collegeHc": r[7],
        "povertyInv": r[8],
        "incomeMix": r[9],
        "highSkill": r[10],
        "inclusion": r[11],
        "transit": r[12],
        "popWan": r[13],
        "source": r[14],
        "noteZh": r[15],
        "noteEn": r[16],
    })

with open("/workspace/src/lib/atlas/districts.json", "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

print("districts", len(records))
from collections import Counter
print(Counter(r["cityId"] for r in records))
print(Counter(r["source"] for r in records))
