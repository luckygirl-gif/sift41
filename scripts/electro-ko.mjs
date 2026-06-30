import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/content/products/electrolyte.md';
const ko = `깨끗한 전해질 보충제를 고를 때 결국 중요한 건 나트륨 양, 당 함량, 첨가물, 그리고 내 용도에 맞느냐예요. 마케팅 문구가 아니라 그 기준으로 직접 따져봤어요.

일상 수분 보충엔 나트륨이 적당하고 무가당인 Nunn, 운동할 땐 무가당으로 깔끔한 SKRATCH, 땀을 많이 흘릴 땐 고나트륨의 LMNT, 속이 예민하거나 회복이 필요할 땐 위에 부담이 덜한 포도당 기반 Trioral — 이렇게 용도별로 추렸습니다.`;
let s = readFileSync(p, 'utf8');
const block = 'descKo: |-\n' + ko.split('\n').map((l) => '  ' + l).join('\n');
s = s.replace('descKo: ""', block);
writeFileSync(p, s);
console.log('electrolyte descKo set:', ko.length, 'chars');
