/** Diverging terracotta → paper → steel, Opportunity-Atlas-like. */
const STOPS: Array<[number, [number, number, number]]> = [
  [0, [168, 56, 42]],
  [0.25, [196, 118, 86]],
  [0.5, [232, 224, 212]],
  [0.75, [122, 148, 166]],
  [1, [45, 90, 122]],
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function outcomeColor(t: number): string {
  const x = Math.min(1, Math.max(0, t));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [t0, c0] = STOPS[i];
    const [t1, c1] = STOPS[i + 1];
    if (x <= t1 || i === STOPS.length - 2) {
      const u = (x - t0) / (t1 - t0);
      const r = Math.round(lerp(c0[0], c1[0], u));
      const g = Math.round(lerp(c0[1], c1[1], u));
      const b = Math.round(lerp(c0[2], c1[2], u));
      return `rgb(${r},${g},${b})`;
    }
  }
  return "rgb(45,90,122)";
}

export function relativeScale(values: number[]): (v: number) => number {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length < 2) return () => 0.5;
  const sorted = [...finite].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.08)];
  const hi = sorted[Math.ceil(sorted.length * 0.92) - 1];
  if (hi <= lo) return () => 0.5;
  return (v: number) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
}
