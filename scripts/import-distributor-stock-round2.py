"""Import Pearl Izumi, IceToolz and Merida stock sheets dated 12 October 2026.

The workbook stock is authoritative. Zero, blank and error stock becomes Coming
Soon. Products without a trustworthy workbook photo or price are held back.
"""
from __future__ import annotations

import hashlib
import io
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import openpyxl
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "products" / "distributor-2"
DATA = ROOT / "assets" / "data" / "distributor-products-2.json"
ONLINE_IMAGES = json.loads((ROOT / "assets" / "data" / "online-product-images.json").read_text(encoding="utf-8"))
SOURCES = {
    "pearl": Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r"E:\Downloads\PEARL iZUMi Promo offer with stock sheet  12-10-2026.xlsx"),
    "icetoolz": Path(sys.argv[2]) if len(sys.argv) > 2 else Path(r"E:\Downloads\ICETOOLZ ORDER SHEET 12-10-2026.xlsx"),
    "merida": Path(sys.argv[3]) if len(sys.argv) > 3 else Path(r"E:\Downloads\Merida Parts, accessories  12-10-2026.xlsx"),
}


def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def stock(value):
    try:
        amount = int(float(value))
        return amount if amount > 0 else 0
    except (TypeError, ValueError):
        return 0


def money(value):
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return 0


def gtin(value):
    text = clean(value).replace(".0", "")
    return text if text.isdigit() and len(text) in (8, 12, 13, 14) else None


def key_for(*parts):
    return hashlib.sha256("|".join(map(str, parts)).encode()).hexdigest()[:16]


def embedded_images(sheet):
    result = defaultdict(list)
    for image in sheet._images:
        result[image.anchor._from.row + 1].append(image._data())
    return result


def save_image(payload):
    digest = hashlib.sha256(payload).hexdigest()[:20]
    rel = Path("assets/products/distributor-2") / f"{digest}.webp"
    thumb_rel = Path("assets/products/distributor-2/thumbs") / f"{digest}.webp"
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


def build_product(*, product_id, name, brand, model, price, mrp, quantity,
                  image_paths, category_page, category_label, main_category,
                  sub_category, description, specs, ean=None, variants=None,
                  sizes=None, colours=None, price_label="MRP", price_on_request=False):
    available = quantity > 0 and not price_on_request
    product = {
        "id": product_id,
        "name": name,
        "brand": brand,
        "inventoryGroup": "expanded",
        "inventorySource": "distributor-stock-20261012-round2",
        "model": model,
        "mpn": model,
        "priceLabel": price_label,
        "primaryLabel": "Select Size" if sizes else "Quantity",
        "categoryPage": category_page,
        "categoryLabel": category_label,
        "mainCategory": main_category,
        "subCategory": sub_category,
        "price": int(price),
        "mrp": int(mrp),
        "available": available,
        "stockStatus": "available" if available else "coming-soon",
        "stockQuantity": quantity,
        "image": image_paths[0],
        "images": list(dict.fromkeys(image_paths)),
        "description": description,
        "keywords": f"{brand} {model} {name} India buy online cycling",
        "specs": specs,
    }
    if price_on_request:
        product.update({"priceOnRequest": True, "stockStatus": "contact", "price": 0, "mrp": 0})
    if ean:
        product["gtin"] = ean
    if sizes:
        variants = variants or []
        product.update({
            "sizes": sizes,
            "secondaryLabel": "Select Colour",
            "secondaryOptions": colours or [],
            "purchaseVariants": variants,
            "defaultVariantKey": next((v["key"] for v in variants if v["available"]), variants[0]["key"]),
        })
    return product


def pearl_category(category):
    lowered = category.lower()
    if "glove" in lowered:
        return "gloves"
    if "sock" in lowered:
        return "socks"
    return "jersey-shorts"


def import_pearl(path, products, audit):
    sheet = openpyxl.load_workbook(path, data_only=True).active
    images = embedded_images(sheet)
    starts = [row for row in range(3, sheet.max_row + 1) if clean(sheet.cell(row, 2).value)]
    for offset, start in enumerate(starts, 1):
        end = starts[offset] - 1 if offset < len(starts) else sheet.max_row
        classification = clean(sheet.cell(start, 2).value)
        category = clean(sheet.cell(start, 3).value)
        raw_name = clean(sheet.cell(start, 4).value)
        colour = clean(sheet.cell(start, 5).value) or "Standard"
        image_paths = [save_image(raw) for raw in images[start]]
        if not image_paths:
            audit["held"].append({"brand": "Pearl Izumi", "model": raw_name, "reason": "No workbook product image"})
            continue
        variants = []
        for row in range(start, end + 1):
            size = clean(sheet.cell(row, 6).value)
            if not size:
                continue
            quantity = stock(sheet.cell(row, 7).value)
            mrp = money(sheet.cell(row, 8).value)
            supplied = money(sheet.cell(row, 9).value)
            price = supplied or mrp
            if not supplied:
                audit["mrpFallbacks"].append({"name": raw_name, "size": size, "price": mrp, "reason": "Promo price blank; listed at supplied MRP"})
            variants.append({
                "key": key_for("pearl", raw_name, colour, size),
                "size": size,
                "colour": colour,
                "build": "",
                "price": price,
                "mrp": mrp,
                "available": quantity > 0,
                "stockStatus": "available" if quantity > 0 else "coming-soon",
                "stockQuantity": quantity,
                "image": image_paths[0],
                **({"gtin": gtin(sheet.cell(row, 1).value)} if gtin(sheet.cell(row, 1).value) else {}),
            })
        if not variants:
            audit["held"].append({"brand": "Pearl Izumi", "model": raw_name, "reason": "No valid sale variants"})
            continue
        available_variants = [v for v in variants if v["available"]]
        chosen = min(available_variants or variants, key=lambda value: value["price"])
        model = clean(sheet.cell(start, 1).value)
        base_name = raw_name if raw_name.lower().startswith("pearl izumi") else f"Pearl Izumi {raw_name}"
        name = f"{base_name} - {colour}"
        products.append(build_product(
            product_id=923000 + offset, name=name, brand="Pearl Izumi", model=model,
            price=chosen["price"], mrp=chosen["mrp"], quantity=sum(v["stockQuantity"] for v in variants),
            image_paths=image_paths, category_page="wearables.html", category_label="Apparel & Wearables",
            main_category=pearl_category(category), sub_category=category.lower(),
            description=f"{name} in {colour}. Choose an available size before checkout. Stock is based on the Pearl Izumi distributor sheet dated 12 October 2026.",
            specs=["Brand : Pearl Izumi", f"Collection : {classification}", f"Category : {category}", f"Colour : {colour}"],
            variants=variants, sizes=list(dict.fromkeys(v["size"] for v in variants)), colours=[colour],
            price_label="PROMO PRICE" if any(v["price"] < v["mrp"] for v in variants) else "MRP"))


def import_icetoolz(path, products, audit):
    sheet = openpyxl.load_workbook(path, data_only=True).active
    images = embedded_images(sheet)
    for row in range(3, sheet.max_row + 1):
        code = clean(sheet.cell(row, 3).value)
        name = clean(sheet.cell(row, 5).value)
        if not name:
            continue
        mrp = money(sheet.cell(row, 7).value)
        image_paths = [save_image(raw) for raw in images[row]]
        source_key = name.split()[0]
        if name.startswith("Plastic Clip"):
            source_key = "E136CLIP"
        elif name.startswith("Spare Clamp"):
            source_key = "E137C"
        sourced = ONLINE_IMAGES.get(f"IceToolz|{source_key}") or ONLINE_IMAGES.get(f"IceToolz|{code}")
        if not image_paths and sourced:
            image_paths = [sourced["image"]]
            audit["sourcedImages"].append({"brand": "IceToolz", "model": source_key, "sourcePage": sourced["sourcePage"], "sourceName": sourced["sourceName"]})
        if not image_paths:
            raise RuntimeError(f"No verified photo for IceToolz {name}")
        price_on_request = not mrp and not (sourced or {}).get("price")
        if not mrp and sourced and sourced.get("price"):
            mrp = int(sourced["price"])
            audit["researchedPrices"].append({"brand": "IceToolz", "model": source_key, "price": mrp, "sourcePage": sourced["sourcePage"]})
        category = clean(sheet.cell(row, 2).value)
        quantity = stock(sheet.cell(row, 6).value)
        model = code or clean(sheet.cell(row, 4).value)
        products.append(build_product(
            product_id=924000 + row, name=f"IceToolz {name}", brand="IceToolz", model=model,
            price=mrp, mrp=mrp, quantity=quantity, image_paths=image_paths,
            category_page="components.html", category_label="Components", main_category="tools",
            sub_category=category.lower(),
            description=f"{name}. Genuine IceToolz cycling workshop tool.",
            specs=["Brand : IceToolz", f"Model : {model}", f"Category : {category}"],
            ean=gtin(sheet.cell(row, 4).value), price_on_request=price_on_request,
            price_label="PRICE ON REQUEST" if price_on_request else "MRP"))


def merida_category(category, name):
    text = f"{category} {name}".lower()
    if any(word in text for word in ("helmet", "jersey", "bibshort", "bandana")):
        return "wearables.html", "Apparel & Wearables", "jersey-shorts"
    if any(word in text for word in ("light", "mobile holder")):
        return "electronics.html", "Electronics", "lights"
    if any(word in text for word in ("stem", "handle", "cable", "pedal", "saddle", "seat post", "wheel")):
        return "components.html", "Components", "components"
    return "accessories.html", "Accessories", "accessories"


def import_merida(path, products, audit):
    sheet = openpyxl.load_workbook(path, data_only=True).active
    images = embedded_images(sheet)
    shared_photo_rows = {5: 4, 9: 8, 10: 8, 12: 11, 14: 13, 15: 13, 16: 13, 82: 81, 83: 81, 84: 81}
    last_category = "Accessories"
    for row in range(3, sheet.max_row + 1):
        sku = clean(sheet.cell(row, 2).value)
        name = clean(sheet.cell(row, 5).value)
        if not name:
            continue
        category = clean(sheet.cell(row, 4).value) or last_category
        last_category = category
        photo_row = shared_photo_rows.get(row, row)
        image_paths = [save_image(raw) for raw in images[photo_row]]
        sourced = ONLINE_IMAGES.get(f"Merida|{sku}")
        if not image_paths and sourced:
            image_paths = [sourced["image"]]
            audit["sourcedImages"].append({"brand": "Merida", "model": sku, "sourcePage": sourced["sourcePage"], "sourceName": sourced["sourceName"]})
        if not image_paths:
            raise RuntimeError(f"No verified photo for Merida {name}")
        mrp = money(sheet.cell(row, 6).value)
        if not mrp:
            audit["held"].append({"brand": "Merida", "model": sku, "name": name, "reason": "No supplied selling price"})
            continue
        quantity = stock(sheet.cell(row, 7).value)
        page, label, main = merida_category(category, name)
        products.append(build_product(
            product_id=925000 + row, name=name if name.lower().startswith("merida") else f"Merida {name}",
            brand="Merida", model=sku, price=mrp, mrp=mrp, quantity=quantity, image_paths=image_paths,
            category_page=page, category_label=label, main_category=main, sub_category=category.lower(),
            description=f"{name}. Stock is based on the Merida distributor sheet dated 12 October 2026.",
            specs=["Brand : Merida", f"SKU : {sku}", f"Category : {category}"], ean=gtin(sheet.cell(row, 2).value)))


def main():
    missing = [str(path) for path in SOURCES.values() if not path.exists()]
    if missing:
        raise SystemExit("Missing workbook(s): " + ", ".join(missing))
    products, audit = [], {"held": [], "mrpFallbacks": [], "sourcedImages": [], "researchedPrices": []}
    import_pearl(SOURCES["pearl"], products, audit)
    import_icetoolz(SOURCES["icetoolz"], products, audit)
    import_merida(SOURCES["merida"], products, audit)
    DATA.write_text(json.dumps({"version": 1, "stockAsOf": "2026-10-12", "products": products, "audit": audit}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    allowlist_path = ROOT / "assets" / "data" / "product-allowlist.json"
    allowlist = json.loads(allowlist_path.read_text(encoding="utf-8"))
    allowlist["productIds"] = sorted(set(map(str, allowlist["productIds"])) | {str(p["id"]) for p in products}, key=int)
    allowlist_path.write_text(json.dumps(allowlist, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "products": len(products),
        "available": sum(p["available"] for p in products),
        "comingSoon": sum(not p["available"] for p in products),
        "byBrand": {brand: sum(p["brand"] == brand for p in products) for brand in ("Pearl Izumi", "IceToolz", "Merida")},
        "held": len(audit["held"]),
        "mrpFallbacks": len(audit["mrpFallbacks"]),
    }, indent=2))


if __name__ == "__main__":
    main()
