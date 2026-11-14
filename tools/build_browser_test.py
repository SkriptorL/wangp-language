"""Build a standalone browser regression page without loading models."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from catalog import load_catalogs

output = Path(sys.argv[1])
output.parent.mkdir(parents=True, exist_ok=True)
payload = json.dumps(load_catalogs(ROOT), ensure_ascii=True).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
runtime = (ROOT / 'assets/language.js').read_text(encoding='utf-8').replace('/*__WANGP_LANGUAGE_DATA__*/', payload)
runtime += '\n' + (ROOT / 'assets/editor.js').read_text(encoding='utf-8')
html = (ROOT / 'tests/browser_test.html').read_text(encoding='utf-8').replace('/*__RUNTIME__*/', runtime)
html = html.replace('<!--__PANEL__-->', (ROOT / 'assets/panel.html').read_text(encoding='utf-8'))
output.write_text(html, encoding='utf-8')
print(output)
