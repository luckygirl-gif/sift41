import { readFileSync, writeFileSync } from 'node:fs';
const P = 'src/content/products/';
const edits = {
  'espoir-brow-cara.md': { summary: "Espoir Brow Cara tames and tints brows in a few upward strokes — a natural, feathered finish with zero technique required." },
  'ther-biotic-synbiotic-prebiotics.md': { summary: "A gentle synbiotic pairing targeted probiotic strains with low-FODMAP prebiotic fiber — regularity and balance without the bloat." },
  'thorne-basic-b-complex.md': { summary: "Active forms (5-MTHF, methyl B12, P-5-P), sensible doses, zero fillers — the B-complex that kept passing our filter." },
  'omegavia-ultra-concentrated.md': { summary: "Small-fish sourcing, heat-free CO2 extraction, high EPA+DHA in rTG form, IFOS-verified — the omega-3 we couldn't poke holes in." },
  'chanel.md': { title: "Chanel Baume Essentiel Multi-Use Glow Stick", brand: "Chanel", summary: "Chanel Baume Essentiel melts in for a subtle, lit-from-within glow — no glitter, no shimmer, just healthier-looking skin." },
  'electrolyte.md': { title: "Clean Electrolytes — Picks by Use Case", summary: "Clean electrolytes, by use case: Nuun for everyday, sugar-free Skratch for workouts, LMNT for heavy sweat, Trioral for GI recovery." },
};
const setLine = (s, key, val) => s.replace(new RegExp('^' + key + ': .*$', 'm'), key + ': "' + val.replace(/"/g, '\\"') + '"');
for (const [f, e] of Object.entries(edits)) {
  let s = readFileSync(P + f, 'utf8');
  if (e.title) s = setLine(s, 'title', e.title);
  if (e.brand !== undefined) s = setLine(s, 'brand', e.brand);
  if (e.summary) s = setLine(s, 'summary', e.summary);
  writeFileSync(P + f, s);
  console.log('meta ok:', f);
}
let el = readFileSync(P + 'electrolyte.md', 'utf8');
if (!el.includes('links:')) {
  const links = [
    ['Nuun Sport — everyday hydration', 'Nuun Sport — 데일리 수분', 'https://www.amazon.com/dp/B019GU4ILQ?tag=sift41-20'],
    ['Skratch Unsweetened — workouts', 'Skratch 무가당 — 운동할 때', 'https://www.amazon.com/dp/B0FLMHV6NT?tag=sift41-20'],
    ['LMNT — heavy sweating', 'LMNT — 땀 많이 흘리는 날', 'https://amzn.to/4qUENb1?ref=sift41.com'],
    ['Trioral — GI recovery', 'Trioral — 속 회복', 'https://www.amazon.com/dp/B00OG8G9UM?tag=sift41-20'],
  ];
  const block = 'links:\n' + links.map(([l, k, u]) => `  - label: "${l}"\n    labelKo: "${k}"\n    url: "${u}"`).join('\n') + '\ndescEn:';
  el = el.replace('descEn:', block);
  writeFileSync(P + 'electrolyte.md', el);
  console.log('links ok: electrolyte (4 buy links)');
}
