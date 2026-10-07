from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r'M:\Customer\KletterLiga NRW\2026\Finale 2026\Material\Justus Hoehn\Justus')
OUT = ROOT / 'tmp' / 'season-preview'
OUT.mkdir(parents=True, exist_ok=True)
files = sorted(SOURCE.glob('*.jpg'), key=lambda p: int(p.stem.rsplit('-', 1)[-1]))
print(f'{len(files)} photos from Justus')
if '--export' in sys.argv:
    destination = ROOT / 'public' / 'images' / 'season-2026'
    destination.mkdir(parents=True, exist_ok=True)
    selection = {'hero': 541, 'moment-1': 568, 'moment-2': 442, 'moment-3': 613, 'moment-4': 172, 'moment-5': 649, 'moment-6': 100, 'start-climb': 550, 'recap-community': 640, 'next-climb': 415}
    manifest = []
    for name, number in selection.items():
        source = SOURCE / f'Kletterliga_Finale_KWS_2026_Justus-Hoehn-{number}.jpg'
        with Image.open(source) as im:
            im = ImageOps.exif_transpose(im).convert('RGB')
            im.thumbnail((1600, 1600))
            target = destination / f'{name}.webp'
            im.save(target, 'WEBP', quality=85, method=5)
            manifest.append({'file': str(target.relative_to(ROOT)), 'source': str(source), 'credit': 'Justus Hoehn / @justus.films', 'width': im.width, 'height': im.height, 'bytes': target.stat().st_size})
    (OUT / 'asset-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(manifest, ensure_ascii=False, indent=2))
    sys.exit()
samples = files[::max(1, len(files)//70)]
for page in range((len(samples)+34)//35):
    subset = samples[page*35:(page+1)*35]
    sheet = Image.new('RGB', (1400, 5*180), '#f2dcab')
    draw = ImageDraw.Draw(sheet)
    for i, path in enumerate(subset):
        with Image.open(path) as im:
            im = ImageOps.exif_transpose(im)
            im.thumbnail((190, 145))
            x, y = (i%7)*200, (i//7)*180
            sheet.paste(im, (x, y))
            draw.text((x+4, y+150), path.stem.rsplit('-', 1)[-1], fill='#003d55')
    sheet.save(OUT / f'contact-{page+1}.jpg')
