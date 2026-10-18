"""Download model-matched product photos from manufacturer/trusted sources.

Writes a reviewed manifest consumed by the distributor importers. The original
source page and image URL remain recorded for traceability.
"""
from __future__ import annotations

import hashlib
import io
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "products" / "sourced"
MANIFEST = ROOT / "assets" / "data" / "online-product-images.json"
UA = {"User-Agent": "Mozilla/5.0 (compatible; CyclifyCatalog/1.0; +https://cyclify.in/)"}


def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read()


def save(url):
    payload = fetch(url)
    digest = hashlib.sha256(payload).hexdigest()[:20]
    rel = Path("assets/products/sourced") / f"{digest}.webp"
    thumb_rel = Path("assets/products/sourced/thumbs") / f"{digest}.webp"
    full, thumb = ROOT / rel, ROOT / thumb_rel
    full.parent.mkdir(parents=True, exist_ok=True)
    thumb.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(io.BytesIO(payload)) as source:
        source = source.convert("RGB")
        source.thumbnail((1500, 1700), Image.Resampling.LANCZOS)
        source.save(full, "WEBP", quality=90, method=6)
        preview = source.copy()
        preview.thumbnail((360, 400), Image.Resampling.LANCZOS)
        preview.save(thumb, "WEBP", quality=82, method=6)
    return rel.as_posix()


def page_image(page_url, preferred=""):
    html = fetch(page_url).decode("utf-8", "ignore")
    urls = re.findall(r'https?[^"\'<> ]+\.(?:png|jpe?g|webp)(?:\?[^"\'<> ]*)?', html, re.I)
    urls = [url.replace("&amp;", "&") for url in urls if "logo" not in url.lower() and "banner" not in url.lower()]
    if preferred:
        preferred_matches = [url for url in urls if preferred.lower() in url.lower()]
        if preferred_matches:
            return preferred_matches[0]
    if not urls:
        match = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)', html, re.I)
        if match:
            return match.group(1).replace("&amp;", "&")
        match = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image', html, re.I)
        if match:
            return match.group(1).replace("&amp;", "&")
    return urls[0] if urls else None


def tba(query, required):
    url = "https://www.thebikeaffair.com/search/suggest.json?" + urllib.parse.urlencode({"q": query, "resources[type]": "product"})
    products = json.loads(fetch(url))["resources"]["results"]["products"]
    match = next((item for item in products if required.lower() in item["title"].lower()), None)
    if not match:
        raise RuntimeError(f"No exact The Bike Affair match for {query} / {required}")
    return match["image"], "https://www.thebikeaffair.com" + match["url"].split("?")[0], int(float(match["price"]))


def add(manifest, key, image_url, source_page, source_name, price=None):
    if key in manifest and (ROOT / manifest[key]["image"]).exists():
        return
    manifest[key] = {
        "image": save(image_url),
        "imageUrl": image_url,
        "sourcePage": source_page,
        "sourceName": source_name,
        **({"price": price} if price else {}),
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}
    # Exact current Indian authorised-retailer listings.
    for code in ("4714", "4715", "4716", "4717", "4718", "4719"):
        image, page, price = tba(f"IceToolz {code}", code)
        add(manifest, f"IceToolz|{code}", image, page, "The Bike Affair (authorised Indian retailer)", price)
    image, page, price = tba("IceToolz 54R3", "54R3")
    add(manifest, "IceToolz|54R3K", image, page, "The Bike Affair (authorised Indian retailer)", price)
    add(manifest, "IceToolz|54R3M", image, page, "The Bike Affair (authorised Indian retailer)", price)
    for code in ("E137", "E253", "E282", "E283"):
        image, page, price = tba(f"IceToolz {code}", code)
        add(manifest, f"IceToolz|{code}", image, page, "The Bike Affair (authorised Indian retailer)", price)
    image, page, price = tba("IceToolz spare clamp E137C", "E137C")
    add(manifest, "IceToolz|E137C", image, page, "The Bike Affair (authorised Indian retailer)", price)

    # Exact official IceToolz model pages; price is intentionally on request when no Indian MRP is published.
    for code in ("62C5", "70A1", "E296"):
        page = f"https://www.icetoolz.com/ec99/rwd1111/product.asp?prodid={code.lower()}"
        image = page_image(page, code)
        add(manifest, f"IceToolz|{code}", image, page, "IceToolz official")
    # Legacy spare parts shown in their official parent repair-stand context.
    for key, parent in {"BMN08": "e137", "E1322": "e132", "E1331": "e133", "E133F": "e133", "E137S": "e137", "E136CLIP": "e136"}.items():
        page = f"https://www.icetoolz.com/ec99/rwd1111/product.asp?prodid={parent}"
        image = page_image(page, parent.upper())
        add(manifest, f"IceToolz|{key}", image, page, "IceToolz official spare-part context")

    merida = {
        "A6A302501209": ("https://choosemybicycle.com/cdn/shop/files/3_8a33c6f8-0ced-426e-871e-046e639570dd_1200x.png?v=1773680373", "https://choosemybicycle.com/products/merida-time-warp-tri-5000"),
        "A62511W02916": ("https://fahrrad-teile.shop/cdn/shop/files/modul_50de7de8-2e97-4d61-9a5b-4d4cb197e5b8.jpg?v=1774119323", "https://fahrrad-teile.shop/products/merida-scultura-6000-rennrad-xs-pearl-blue-team-carbonrahmen-shimano-105-di2-12-fach-hydraulische-scheibenbremsen-vision-sc30-carbon-laufrader-ca-8-2-kg"),
        "A2028000230 A2028000231": ("https://www.cycleexchange.co.uk/cdn/shop/files/97100153-006.jpg?v=1756723521&width=1860", "https://www.cycleexchange.co.uk/products/merida-reacto-8000-2025-small"),
        "A2028000290 A2028000291": ("https://s-tec-essence.eshop.t-online.de/WebRoot/Store4/Shops/Shop38023/6540/E555/E016/B146/2137/AC14/500B/A21F/PXL_20231031_085844400.jpg", "https://s-tec-essence.eshop.t-online.de/Merida-Reacto-Disc-Vision-Di2-2024"),
        "A2028000354 A2028000356": ("https://www.co2bike.com/cdn/shop/files/REACTO_6000_PURPLE.jpg?v=1775404927&width=1946", "https://www.co2bike.com/products/merida-reacto-6000-105-di2-ruote-carbon-2027"),
        "A62615A00013": ("https://uemura-cycle.com/upload/save_image/106937_sub1_large.png", "https://uemura-cycle.com/products/detail.php?product_id=98608"),
        "A62615A00014": ("https://uemura-cycle.com/upload/save_image/106937_sub1_large.png", "https://uemura-cycle.com/products/detail.php?product_id=98608"),
        "A62615A00009": ("https://www.gigasport.at/merida-mountainbike%2B29%26quot%3B%2Bbig.nine%2B400-6-768_1024_75-7465724_6.webp", "https://www.gigasport.at/merida-mountainbike-29-bignine-400-gruen-7465724.html"),
        "A62615A00010": ("https://www.gigasport.at/merida-mountainbike%2B29%26quot%3B%2Bbig.nine%2B400-6-768_1024_75-7465724_6.webp", "https://www.gigasport.at/merida-mountainbike-29-bignine-400-gruen-7465724.html"),
        "A62615A00019": ("https://www.biketart.com/cdn/shop/files/merida-one-sixty-7000-2026-anaconda-green-short-1186006775.jpg?v=1756065790&width=1200", "https://www.biketart.com/products/merida-one-sixty-7000-2026"),
        "A62615A00020": ("https://www.biketart.com/cdn/shop/files/merida-one-sixty-7000-2026-anaconda-green-short-1186006775.jpg?v=1756065790&width=1200", "https://www.biketart.com/products/merida-one-sixty-7000-2026"),
        "A6A302500037": ("https://www.birota.ru/upload/iblock/5c2/SILEX_400_limylo_MY2021.jpg", "https://www.birota.ru/shop/velosipedy/prod_merida_silex_400_2021/"),
        "A6A302500038": ("https://www.birota.ru/upload/iblock/5c2/SILEX_400_limylo_MY2021.jpg", "https://www.birota.ru/shop/velosipedy/prod_merida_silex_400_2021/"),
        "A6A302500071": ("https://www.swinnertoncycles.co.uk/cdn/shop/files/ipakmkhnond0zjkl8ut5.jpg?v=1768511754", "https://www.swinnertoncycles.co.uk/products/merida-speeder-200-urban-bike"),
        "A6A302500072": ("https://www.swinnertoncycles.co.uk/cdn/shop/files/ipakmkhnond0zjkl8ut5.jpg?v=1768511754", "https://www.swinnertoncycles.co.uk/products/merida-speeder-200-urban-bike"),
        "A6A302500115": ("https://www.devercycles.co.uk/images/speeder_400_blkblk_my2021.jpg?bgcolor=ffffff&format=webp&height=1998&mode=pad&quality=85&width=1998", "https://www.devercycles.co.uk/bikes/hybrid-bikes/2021-merida-speeder-400-hybrid-bike-in-black__52757"),
        "A6A302500116": ("https://www.devercycles.co.uk/images/speeder_400_blkblk_my2021.jpg?bgcolor=ffffff&format=webp&height=1998&mode=pad&quality=85&width=1998", "https://www.devercycles.co.uk/bikes/hybrid-bikes/2021-merida-speeder-400-hybrid-bike-in-black__52757"),
        "A6A302500220": ("https://images.cdn.europe-west1.gcp.commercetools.com/078b97e9-ed31-4c81-baae-cdd44f3bf3c1/31cc0f28ccc2521a41dc-S3odRLz5.jpg", "https://www.bikeexchange.be/nl-BE/products/merida-speeder-300-2022"),
        "A6A302500221": ("https://images.cdn.europe-west1.gcp.commercetools.com/078b97e9-ed31-4c81-baae-cdd44f3bf3c1/31cc0f28ccc2521a41dc-S3odRLz5.jpg", "https://www.bikeexchange.be/nl-BE/products/merida-speeder-300-2022"),
        "F-WHL-RIDE200": ("https://bicycle.co.jp/images/p/2017050800007.jpg", "https://bicycle.co.jp/products/4c137-1/"),
        "A6A302500213": ("https://www.velosklad.ru/i/fotodop/big/32118.jpg", "https://www.velosklad.ru/velosipedy/bike/17348/merida-big-nine-100/"),
    }
    for model, (image, page) in merida.items():
        add(manifest, f"Merida|{model}", image, page, "Trusted Merida retailer/model listing")

    elite_page = "https://www.sportokay.com/it_it/elite-fly-alpecin-deceuninck-550ml-trinkflasche-2025.html"
    elite_image = page_image(elite_page, "N1-01")
    add(manifest, "Elite|016041229", elite_image, elite_page, "Trusted Elite retailer/model listing")
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"sourced": len(manifest), "manifest": str(MANIFEST)}, indent=2))


if __name__ == "__main__":
    main()
