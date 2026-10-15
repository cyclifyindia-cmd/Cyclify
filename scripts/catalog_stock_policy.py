"""Apply explicit owner-confirmed stock decisions to catalogue imports."""
import json
from pathlib import Path


POLICY_PATH = Path(__file__).resolve().parent.parent / 'assets/data/inventory-stock-overrides.json'
DECISIONS_PATH = Path(__file__).resolve().parent / 'data/catalog-owner-decisions.json'


def load_stock_overrides(path=POLICY_PATH):
    payload = json.loads(Path(path).read_text(encoding='utf-8'))
    overrides = {}
    for entry in payload['overrides']:
        key = (entry['brand'], entry['model'])
        if key in overrides:
            raise ValueError('Duplicate stock override: ' + repr(key))
        if entry['status'] not in ('Available', 'Coming Soon', 'Contact for More Info'):
            raise ValueError('Unsupported stock override: ' + repr(key))
        overrides[key] = entry['status']
    return overrides


def apply_stock_override(target, rows, overrides):
    status = overrides.get((target['brand'], target['model']))
    return [{**row, 'status': status} for row in rows] if status else rows


def deferred_stock_fields(target, overrides):
    status = overrides.get((target['brand'], target['model']))
    if status is None:
        return {}
    return {
        'available': status == 'Available',
        'stockStatus': {'Available': 'available', 'Coming Soon': 'coming-soon',
                        'Contact for More Info': 'contact'}[status],
    }


def load_resolved_aliases(path=DECISIONS_PATH):
    identity = json.loads(Path(path).read_text(encoding='utf-8'))['saddleIdentity']
    if identity['requiresConfirmation'] or not identity['doNotCreateDuplicateProduct']:
        return []
    return [{
        'brand': 'Selle Italia', 'model': identity['sheetModel'],
        'confirmedModel': identity['confirmedModel'],
        'existingProductId': identity['existingProductId'],
    }]
