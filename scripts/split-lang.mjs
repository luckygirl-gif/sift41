import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
const dir = 'src/content/products';
const hasHangul = (s) => /[가-힣ᄀ-ᇿ㄰-㆏]/.test(s);
const block = (key, text) => {
  if (!text) return `${key}: ""`;
  return `${key}: |-\n` + text.split('\n').map((l) => '  ' + l).join('\n');
};
for (const f of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
  const raw = readFileSync(`${dir}/${f}`, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) { console.warn('SKIP(parse):', f); continue; }
  const fmLines = m[1].split('\n').filter((l) => !/^desc(En|Ko):/.test(l) && !/^\s\s/.test(l));
  const body = m[2].trim();
  const paras = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const en = paras.filter((p) => !hasHangul(p)).join('\n\n');
  const ko = paras.filter((p) => hasHangul(p)).join('\n\n');
  const fm = [...fmLines, block('descEn', en), block('descKo', ko)].join('\n');
  writeFileSync(`${dir}/${f}`, `---\n${fm}\n---\n`);
  console.log(f, '| EN', en.length, 'chars | KO', ko.length, 'chars');
}
