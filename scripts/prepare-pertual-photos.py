"""Optimise Cyclify's real product photos without changing the product."""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('C:/Users/user/AppData/Local/Temp')
PHOTOS = [
    ('ad35917b-b9f5-421d-9fa6-1ca5b7711cd9', 'wheelset-angled'),
    ('d3573c2d-c758-46db-8fee-ffba8e88e6a8', 'rear-wheel'),
    ('a4d401c4-ffef-4209-a357-b06885a3f4ff', 'rim-detail'),
    ('dba8e7fc-7611-4e1f-b86b-8a2ddfba2e48', 'pertual-rim'),
    ('5cd4a7fd-b31a-4d9d-ac48-4cd10276ca87', 'wheelset-front'),
    ('036419df-4c49-4713-9d95-029fec5bfaf9', 'hg-freehub'),
]
destination = ROOT / 'assets/products/pertual-sharp-gr'
destination.mkdir(parents=True, exist_ok=True)
for source, name in PHOTOS:
    with Image.open(SOURCE / f'codex-clipboard-{source}.jpg') as photo:
        photo = ImageOps.exif_transpose(photo).convert('RGB')
        photo.save(destination / f'{name}.webp', quality=92, method=6)
        print(name, photo.size)
