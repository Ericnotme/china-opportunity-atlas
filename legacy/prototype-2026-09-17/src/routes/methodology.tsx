import { createFileRoute } from "@tanstack/react-router";
import { Chrome } from "@/components/atlas/Chrome";
import { useAtlas } from "@/lib/atlas/store";

export const Route = createFileRoute("/methodology")({ component: MethodologyPage });

function MethodologyPage() {
  const lang = useAtlas((s) => s.lang);
  return (
    <Chrome>
      <article className="mx-auto h-full max-w-3xl overflow-y-auto px-4 py-8 md:px-6">
        {lang === "zh" ? <Zh /> : <En />}
      </article>
    </Chrome>
  );
}

function Zh() {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-paper-2">
      <header className="space-y-2">
        <p className="text-[11px] tracking-wide text-muted uppercase">Research prototype</p>
        <h1 className="font-display text-3xl text-paper">方法、数据与局限</h1>
        <p>
          本项目是 Chetty, Friedman, Hendren, Jones & Porter
          《The Opportunity Atlas》的中国城市区级原型，用作数据驱动建模与可视化能力的公开证明。
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="font-display text-xl text-paper">为什么不是「官方机会地图」</h2>
        <p>
          美国 Opportunity Atlas 依赖 IRS 与 Census
          把约两千万名 1978–1983 年出生者回链到他们长大的普查小区（tract），直接估计「在此长大的孩子 35
          岁收入」。中国没有公开发布这种父母—子女行政追踪微数据，街道或小区级的长期收入更不可得。
        </p>
        <p>
          因此本图<strong className="text-paper">不声称</strong>
          复制了 Chetty 的识别策略。它把可公开观察的区级特征，通过一篇结构映射，变成与 Opportunity Atlas
          相同的交互问题：若一个孩子在该区长大、父母处于某收入分位，35 岁时家庭收入大概在哪。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl text-paper">模型</h2>
        <p>邻里质量指数（0–1）为加权和：</p>
        <pre className="overflow-x-auto rounded-md border border-line bg-ink-2 p-3 text-xs text-paper">
{`Q = 0.28·学校 + 0.16·高校人力资本 + 0.16·低收入反向
  + 0.12·收入混合 + 0.12·高技能岗位
  + 0.08·非本地入学包容 + 0.08·通勤可达`}
        </pre>
        <p>权重贴近 Opportunity Atlas 的相关事实：学校与贫困是最稳的预测项；「包容」是中国户籍/学区制度的对应项。</p>
        <p>子女在全国城镇 35 岁收入分布中的分位：</p>
        <pre className="overflow-x-auto rounded-md border border-line bg-ink-2 p-3 text-xs text-paper">
{`R = 50 + ρ_city (p − 50) + θ(p) (Q − 0.5)·100 + γ_g

θ(p) = 0.22 + 0.28 (1 − p/100)`}
        </pre>
        <p>
          ρ 为城市级代际收入秩相关，校准到 CFPS/CHIP 文献中的城镇 IGE（约 0.40–0.46）。θ(p)
          随父母收入下降而增大——这是 Chetty 的核心发现：邻里对低收入家庭的孩子更重要。
        </p>
        <p>
          把 R 通过城市特异的对数正态分布 F<sup>−1</sup>
          转成 35 岁家庭收入。高等教育入学、进入最高五分位、住房自有率由 Q 与 p 的 logistic
          给出；自有率额外扣减高房价区对低收入孩子的挤出。
        </p>
        <p>
          「搬入实验」采用 Chetty–Hendren
          的童年暴露折算：从本市最低机会区迁入，差距的吸收份额 ≈ (18 − 搬入年龄)/18。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl text-paper">数据</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>区界：国家行政区划 GeoJSON（区 / 县 / 香港区议会）。</li>
          <li>收入：2023 年人均可支配收入（统计公报、年鉴、公开排行）；香港为 2021 年人口普查住户月入中位数。</li>
          <li>学校、岗位、包容等 0–100 分：根据公开教育口碑、产业构成与户籍松紧编码，方法页与 CSV 的 source 字段可核对。</li>
        </ul>
        <p>
          被标记为 compiled 的单元格不是普查微观记录，而是由相邻公开序列外推。香港 18 区收入是普查值，约束力最强。
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl text-paper">局限（请写进申请材料）</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>没有搬迁者准实验，不能把颜色读成因果处理效应。</li>
          <li>区是粗单元。浦东、朝阳、龙岗内部的方差可能大于区与区之间。</li>
          <li>当前收入会同时捕获选择与因果：高房价区已经筛掉了许多低收入家庭。</li>
          <li>性别差距是校准项，不是区级微观估计。</li>
          <li>货币：内地为人民币家庭收入，香港为港元；色标在六城之间按结果相对位置对齐，不按购买力平价对齐。</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl text-paper">文献</h2>
        <ul className="list-disc space-y-1 pl-5 text-xs">
          <li>Chetty, Friedman, Hendren, Jones, Porter. The Opportunity Atlas. AER, 2026.</li>
          <li>Chetty & Hendren. The Impacts of Neighborhoods on Intergenerational Mobility. QJE, 2018.</li>
          <li>Fan, Yi, Zhang 等关于中国代际流动的 CFPS/CHIP 估计。</li>
          <li>Hong, Gruijters. 中国代际教育流动的地理. Population, Space and Place, 2024.</li>
        </ul>
      </section>
    </div>
  );
}

function En() {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-paper-2">
      <header className="space-y-2">
        <p className="text-[11px] tracking-wide text-muted uppercase">Research prototype</p>
        <h1 className="font-display text-3xl text-paper">Methods and limits</h1>
        <p>
          A district-level Chinese counterpart to Chetty, Friedman, Hendren, Jones & Porter’s
          Opportunity Atlas — built as a public demonstration of data-driven modeling and
          interactive cartography.
        </p>
      </header>
      <section className="space-y-2">
        <h2 className="font-display text-xl text-paper">Why this is not an official atlas</h2>
        <p>
          The US atlas links ~20 million people born 1978–83 back to childhood census tracts using
          IRS–Census data. China does not publish parent–child administrative tax records at
          neighborhood scale. This site does not claim to replicate that identification. It asks
          the same interactive question with a transparent structural mapping from public district
          covariates.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-display text-xl text-paper">Model</h2>
        <pre className="overflow-x-auto rounded-md border border-line bg-ink-2 p-3 text-xs text-paper">
{`Q = 0.28 school + 0.16 university + 0.16 inverse-poverty
  + 0.12 income-mix + 0.12 high-skill jobs
  + 0.08 hukou/school inclusion + 0.08 transit

R = 50 + ρ_city (p − 50) + θ(p) (Q − 0.5)·100 + γ_g
θ(p) = 0.22 + 0.28 (1 − p/100)`}
        </pre>
        <p>
          ρ is calibrated to published urban China IGE (~0.40–0.46). θ(p) is larger for poorer
          parents — Chetty’s central fact. R is inverted through a city-specific lognormal to
          household income at 35. College, top-quintile and homeownership are logistics in Q and p;
          homeownership penalizes expensive districts for low-p children. The moving experiment
          uses Chetty–Hendren childhood exposure: share ≈ (18 − age at move)/18.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-display text-xl text-paper">Limits to state in an application</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>No movers design — colours are not causal treatment effects.</li>
          <li>Districts are coarse; Pudong or Longgang contain tract-sized gaps.</li>
          <li>Current income mixes selection and causation via housing prices.</li>
          <li>Mainland figures are CNY household income; Hong Kong is HKD.</li>
        </ul>
      </section>
    </div>
  );
}
