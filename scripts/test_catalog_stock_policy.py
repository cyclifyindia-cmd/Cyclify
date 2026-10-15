import json
from pathlib import Path
import unittest

from catalog_stock_policy import apply_stock_override, deferred_stock_fields, load_stock_overrides, load_resolved_aliases


class StockPolicyTests(unittest.TestCase):
    def test_fourteen_confirmed_models_cannot_be_imported_as_available(self):
        overrides = load_stock_overrides()
        tripeak = {key: status for key, status in overrides.items() if key[0] == 'Tripeak'}
        self.assertEqual(len(tripeak), 14)
        for (brand, model), status in tripeak.items():
            self.assertEqual(brand, 'Tripeak')
            self.assertEqual(status, 'Coming Soon')
            target = {'brand': brand, 'model': model}
            original = [{'status': 'Available', 'price': 1990}]
            result = apply_stock_override(target, original, overrides)
            self.assertEqual(result, [{'status': 'Coming Soon', 'price': 1990}])
            self.assertEqual(original[0]['status'], 'Available')
            self.assertEqual(deferred_stock_fields(target, overrides), {
                'available': False, 'stockStatus': 'coming-soon',
            })

    def test_other_inventory_keeps_its_original_stock(self):
        rows = [{'status': 'Available'}, {'status': 'Contact for More Info'}]
        target = {'brand': 'Tripeak', 'model': 'EMA-GS52'}
        self.assertEqual(apply_stock_override(target, rows, load_stock_overrides()), rows)
        self.assertEqual(deferred_stock_fields(target, load_stock_overrides()), {})

    def test_pending_records_match_confirmation_and_existing_stock_is_unchanged(self):
        root = Path(__file__).resolve().parent.parent
        pending = json.loads((root / 'assets/data/deferred-products.json').read_text(encoding='utf-8'))
        records = [product for product in pending['products'] if product['brand'] == 'Tripeak']
        overrides = load_stock_overrides()
        self.assertEqual({(p['brand'], p['model']) for p in records}, {key for key in overrides if key[0]=='Tripeak'})
        for product in records:
            self.assertFalse(product['available'])
            self.assertEqual(product['stockStatus'], 'coming-soon')
        current = json.loads((root / 'assets/data/expanded-products.json').read_text(encoding='utf-8'))
        existing = [product for product in current['products'] if product['brand'] == 'Tripeak']
        self.assertEqual(len(existing), 15)
        self.assertTrue(all(product['available'] for product in existing))

    def test_saddle_identity_is_merged_and_both_widths_keep_the_confirmed_price(self):
        root = Path(__file__).resolve().parent.parent
        source = json.loads((root/'assets/data/expanded-products.json').read_text(encoding='utf-8'))
        product = next(p for p in source['products'] if p['id']==900177)
        self.assertTrue(product['available'])
        self.assertEqual({v['size'] for v in product['purchaseVariants']}, {'S3','L3'})
        for variant in product['purchaseVariants']:
            self.assertTrue(variant['available'])
            self.assertEqual(variant['stockStatus'], 'available')
            self.assertEqual(variant['price'], 14490)
        rows = apply_stock_override({'brand':'Selle Italia','model':'SLR Boost TM Superflow'}, [{'status':'Coming Soon'}], load_stock_overrides())
        self.assertEqual(rows[0]['status'], 'Available')
        pending = json.loads((root/'assets/data/deferred-products.json').read_text(encoding='utf-8'))
        self.assertEqual(pending['resolvedAliases'], load_resolved_aliases())
        self.assertFalse(any(p['brand']=='Selle Italia' and p['model']=='SLR Boost Superflow' for p in pending['products']))
        self.assertFalse(any(p['id']==900178 for p in source['products']))


if __name__ == '__main__':
    unittest.main()
