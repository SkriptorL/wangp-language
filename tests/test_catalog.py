import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from catalog import load_catalogs, read_object


class CatalogTests(unittest.TestCase):
    def test_catalogs_load(self):
        data = load_catalogs(ROOT)
        self.assertEqual(data['catalogs']['es']['Generate'], 'Generar')
        self.assertEqual(data['catalogs']['en']['Generate'], 'Generate')

    def test_duplicate_keys_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'duplicate.json'
            path.write_text('{"a":"b","a":"c"}')
            with self.assertRaises(ValueError):
                read_object(path)

    def test_partial_language_and_invalid_key(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'locales').mkdir()
            (root / 'languages.json').write_text('{"en":"English","es":"Spanish","fr":"French"}')
            for code, messages in [('en', {'Generate':'Generate'}), ('es', {'Generate':'Generar'}), ('fr', {'Generate':''})]:
                (root / 'locales' / f'{code}.json').write_text(json.dumps(messages))
            self.assertEqual(load_catalogs(root)['catalogs']['fr']['Generate'], '')
            (root / 'locales/fr.json').write_text('{"Unknown":"Test"}')
            with self.assertRaises(ValueError):
                load_catalogs(root)

    def test_no_normalized_collisions(self):
        source = load_catalogs(ROOT)['catalogs']['en']
        normalized = [' '.join(key.split()) for key in source]
        self.assertEqual(len(set(normalized)), len(normalized))

    def test_broken_placeholders_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'locales').mkdir()
            (root / 'languages.json').write_text('{"en":"English","es":"Spanish"}')
            (root / 'locales/en.json').write_text('{"Frames: {0}":"Frames: {0}"}')
            (root / 'locales/es.json').write_text('{"Frames: {0}":"Fotogramas"}')
            with self.assertRaises(ValueError):
                load_catalogs(root)

    def test_runtime_payload_is_safe_for_inline_script(self):
        payload = json.dumps({'</script>': '<img src=x>'}, ensure_ascii=True).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
        self.assertNotIn('</script>', payload)
        self.assertEqual(json.loads(payload)['</script>'], '<img src=x>')


if __name__ == '__main__':
    unittest.main()
