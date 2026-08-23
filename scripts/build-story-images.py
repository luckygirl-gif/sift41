#!/usr/bin/env python3
# 인스타그램 스토리용 세로 이미지(1080x1920)를 인스타용 사진(public/images/instagram/*.jpg)에서 만든다.
# 결과는 public/images/stories/<이미지이름>.jpg 로 저장되어 사이트와 함께 배포된다.
#
# 사용법:
#   python3 scripts/build-story-images.py            # 없는 것만 생성
#   python3 scripts/build-story-images.py --force    # 전부 다시 생성
#   python3 scripts/build-story-images.py chanel     # 특정 제품(slug)만
#
# macOS 시스템 글꼴(Helvetica, Apple SD Gothic Neo)을 쓰므로 이 Mac에서 실행해야 한다.
import os, re, sys, glob
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRODUCTS = os.path.join(ROOT, 'src/content/products')
SRC_DIR = os.path.join(ROOT, 'public/images/instagram')
OUT_DIR = os.path.join(ROOT, 'public/images/stories')

W, H = 1080, 1920
BRAND_ORANGE = '#FF6A00'
INK = '#141414'
GRAY = '#555555'

def find_face(path, want_family, want_styles, size):
    """ttc 파일에서 원하는 스타일의 글꼴을 찾는다."""
    for want in want_styles:
        for i in range(0, 30):
            try:
                f = ImageFont.truetype(path, size, index=i)
            except (OSError, IndexError):
                break
            fam, style = f.getname()
            if want_family in fam and style == want:
                return f
    raise SystemExit(f'글꼴을 찾을 수 없습니다: {path} ({want_family} {want_styles})')

def fonts(size_word, size_title, size_cta):
    helv = '/System/Library/Fonts/Helvetica.ttc'
    gothic = '/System/Library/Fonts/AppleSDGothicNeo.ttc'
    return (
        find_face(helv, 'Helvetica', ['Bold'], size_word),
        find_face(helv, 'Helvetica', ['Bold'], size_title),
        find_face(gothic, 'Apple SD Gothic Neo', ['SemiBold', 'Bold', 'Medium'], size_cta),
    )

def wrap(draw, text, font, max_w, max_lines=2):
    words = text.split()
    lines, cur = [], ''
    for w in words:
        trial = (cur + ' ' + w).strip()
        if draw.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        while lines and draw.textlength(lines[-1] + '…', font=font) > max_w and ' ' in lines[-1]:
            lines[-1] = lines[-1].rsplit(' ', 1)[0]
        lines[-1] += '…'
    return lines

def read_products():
    out = []
    for path in sorted(glob.glob(os.path.join(PRODUCTS, '*.md'))):
        text = open(path, encoding='utf-8').read()
        m = re.match(r'^---\r?\n([\s\S]*?)\r?\n---', text)
        if not m:
            continue
        fm = m.group(1)
        def field(name):
            fm_m = re.search(rf'^{name}:\s*(.+)$', fm, re.M)
            if not fm_m:
                return ''
            v = fm_m.group(1).strip()
            return v[1:-1] if len(v) > 1 and v[0] == v[-1] and v[0] in '"\'' else v
        title, image = field('title'), field('image')
        if not title or not image:
            continue
        base = re.sub(r'\.[a-z]+$', '', os.path.basename(image), flags=re.I)
        out.append({'slug': os.path.basename(path)[:-3], 'title': title, 'base': base})
    return out

def build(p):
    src = os.path.join(SRC_DIR, p['base'] + '.jpg')
    if not os.path.exists(src):
        print(f"  건너뜀 (인스타용 사진 없음): {p['slug']} — {src}")
        return False
    canvas = Image.new('RGB', (W, H), 'white')
    draw = ImageDraw.Draw(canvas)
    f_word, f_title, f_cta = fonts(66, 46, 32)

    # 1) 워드마크 (사이트 로고와 동일: Helvetica Bold, 주황)
    tw = draw.textlength('Sift41', font=f_word)
    draw.text(((W - tw) / 2, 130), 'Sift41', font=f_word, fill=BRAND_ORANGE)

    # 2) 제품 사진 (4:5) — 880x1100 상자에 맞춰 가운데 배치
    photo = Image.open(src).convert('RGB')
    box_w, box_h, box_y = 880, 1100, 260
    scale = min(box_w / photo.width, box_h / photo.height)
    photo = photo.resize((round(photo.width * scale), round(photo.height * scale)), Image.LANCZOS)
    canvas.paste(photo, ((W - photo.width) // 2, box_y + (box_h - photo.height) // 2))

    # 3) 제품 이름 (최대 2줄)
    lines = wrap(draw, p['title'], f_title, 920)
    y = 1420
    for line in lines:
        lw = draw.textlength(line, font=f_title)
        draw.text(((W - lw) / 2, y), line, font=f_title, fill=INK)
        y += 62

    # 4) 구매 안내 알약 버튼 (인스타 하단 UI를 피해 y<=1650 안에서 끝냄)
    cta = '구매 링크 → 프로필의 sift41.com'
    cw = draw.textlength(cta, font=f_cta)
    pw, ph = cw + 120, 84
    px, py = (W - pw) / 2, 1560
    draw.rounded_rectangle([px, py, px + pw, py + ph], radius=ph / 2, outline=INK, width=3)
    draw.text(((W - cw) / 2, py + (ph - 32) / 2 - 6), cta, font=f_cta, fill=INK)

    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, p['base'] + '.jpg')
    canvas.save(out, 'JPEG', quality=90)
    print(f"  생성: {p['slug']} → {os.path.relpath(out, ROOT)}")
    return True

def main():
    args = [a for a in sys.argv[1:]]
    force = '--force' in args
    only = {a for a in args if not a.startswith('--')}
    made = skipped = 0
    for p in read_products():
        if only and p['slug'] not in only:
            continue
        out = os.path.join(OUT_DIR, p['base'] + '.jpg')
        if not force and os.path.exists(out):
            skipped += 1
            continue
        if build(p):
            made += 1
    print(f"완료: {made}개 생성, {skipped}개는 이미 있어 건너뜀")

if __name__ == '__main__':
    main()
