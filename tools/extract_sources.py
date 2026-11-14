"""Inventory UI source strings. Reads application source only, never user data."""
import argparse
import ast
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from markdown_it import MarkdownIt

PLUGIN = Path(__file__).resolve().parents[1]
BUILTINS = ('configuration', 'plugin_manager', 'guides', 'downloads', 'models_manager',
            'about', 'video_mask_creator', 'motion_designer', 'media_flow', 'showrunner', 'wangp-language')
GUIDES = ('OVERVIEW', 'MODELS', 'LORAS', 'PROMPTS', 'PROCESSING', 'FINETUNES', 'DEEPY', 'WORKSPACES', 'SHOWRUNNER')


def extract(base):
    base = Path(base)
    found = {}

    def add(text, location):
        text = ' '.join(text.split()).strip()
        if not re.search(r'[A-Za-z]{2}', text) or len(text) > 7000:
            return
        if re.fullmatch(r'[\w./:#@-]+', text) and (text.startswith(('http', '/', '.')) or '_' in text):
            return
        if text.startswith(('function', 'const ', 'let ', 'import ', 'return ', '{', '//')):
            return
        if any(token in text for token in ('${', '<', '=>', 'STATUS_LABEL[', 'shot.', 'cast.', 'state.', ').join(', '].join(', 'window.innerHeight', 'bf16", "fp16', '{position:', '{content:', '_ICON =')):
            return
        if re.search(r"[}'\"]\}$|^:\s*['\"]", text):
            return
        found.setdefault(text, set()).add(location)

    class HTML(HTMLParser):
        def __init__(self, location):
            super().__init__(convert_charrefs=True)
            self.location, self.skip = location, 0

        def handle_starttag(self, tag, attrs):
            if tag in ('script', 'style', 'pre', 'code', 'svg'):
                self.skip += 1
            if not self.skip:
                for key, value in attrs:
                    if key in ('title', 'aria-label', 'placeholder', 'data-tooltip') and value:
                        add(value, self.location)

        def handle_endtag(self, tag):
            if tag in ('script', 'style', 'pre', 'code', 'svg'):
                self.skip = max(0, self.skip - 1)

        def handle_data(self, text):
            if not self.skip:
                add(text, self.location)

    def content(text, location):
        if '<' in text and '>' in text:
            HTML(location).feed(text)
        elif '\n' in text or '**' in text or '`' in text or text.startswith('#'):
            HTML(location).feed(MarkdownIt().enable('table').render(text))
        else:
            add(text, location)

    def literal(node):
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            return node.value
        if isinstance(node, ast.JoinedStr):
            pieces, index = [], 0
            for part in node.values:
                if isinstance(part, ast.Constant):
                    pieces.append(str(part.value))
                else:
                    pieces.append('{' + str(index) + '}')
                    index += 1
            return ''.join(pieces)
        return None

    paths = [base / 'wgp.py']
    for folder in ('shared/gradio', 'shared/deepy/web'):
        paths.extend((base / folder).glob('*.py'))
        paths.extend((base / folder).glob('*.js'))
    paths.extend((base / 'models').rglob('*handler.py'))
    for plugin in BUILTINS:
        for suffix in ('*.py', '*.html', '*.js'):
            paths.extend((base / 'plugins' / plugin).rglob(suffix))
    for path in paths:
        if any(part in ('vendor', 'node_modules', 'tests', 'tools') for part in path.parts):
            continue
        text = path.read_text(encoding='utf-8-sig')
        location = path.relative_to(base).as_posix()
        if path.suffix == '.py':
            for node in ast.walk(ast.parse(text)):
                at = location + ':' + str(getattr(node, 'lineno', 1))
                if isinstance(node, ast.FunctionDef) and node.name in ('compute_video_length_label', 'get_loaded_model_label'):
                    for part in ast.walk(node):
                        if isinstance(part, ast.JoinedStr):
                            content(literal(part), at)
                if isinstance(node, ast.Assign) and isinstance(node.value, ast.Dict) and any(isinstance(t, ast.Name) and t.id.endswith(('_LABELS', '_TITLES', '_DESCRIPTIONS')) for t in node.targets):
                    for value in node.value.values:
                        value = literal(value)
                        if value:
                            content(value, at)
                if isinstance(node, ast.Call):
                    for keyword in node.keywords:
                        if keyword.arg in ('label', 'info', 'placeholder', 'description', 'title'):
                            value = literal(keyword.value)
                            if value:
                                content(value, at)
                        if keyword.arg == 'choices' and isinstance(keyword.value, (ast.List, ast.Tuple)):
                            for choice in keyword.value.elts:
                                if isinstance(choice, (ast.List, ast.Tuple)) and choice.elts:
                                    choice = choice.elts[0]
                                value = literal(choice)
                                if value:
                                    content(value, at)
                    name = node.func.attr if isinstance(node.func, ast.Attribute) else ''
                    index = 1 if name == 'add_tab' else 0
                    if name in ('add_tab', 'Button', 'Tab', 'TabItem', 'Accordion', 'Info', 'Warning', 'Error', 'Markdown', 'HTML') and len(node.args) > index:
                        value = literal(node.args[index])
                        if value:
                            content(value, at)
                elif isinstance(node, ast.Dict):
                    for key, value in zip(node.keys, node.values):
                        if isinstance(key, ast.Constant) and key.value in ('label', 'title', 'info', 'description', 'markdown', 'help', 'tooltip', 'placeholder', 'text'):
                            value = literal(value)
                            if value:
                                content(value, at)
                elif isinstance(node, ast.Constant) and isinstance(node.value, str) and ('<button' in node.value or '<label' in node.value):
                    content(node.value, at)
        elif path.suffix == '.html':
            HTML(location).feed(text)
        else:
            for match in re.finditer(r'`([^`]+)`', text, re.S):
                value = match.group(1)
                if '<' in value and '>' in value:
                    HTML(location).feed(value)
            for match in re.finditer(r'(?:textContent\s*=|innerText\s*=|title\s*[:=]|label\s*:|placeholder\s*:|alert\(|confirm\(|toast\(|message\(|Error\()\s*([\'\"])([^\n]*?)\1', text):
                content(match.group(2), location)
    for name in GUIDES:
        path = base / 'docs' / (name + '.md')
        if path.exists():
            HTML('docs/' + path.name).feed(MarkdownIt().enable('table').render(path.read_text(encoding='utf-8')))
    for path in (base / 'defaults').glob('*.json'):
        payload = json.loads(path.read_text(encoding='utf-8-sig'))
        model = payload.get('model', {})
        if isinstance(model, dict) and isinstance(model.get('description'), str):
            content(model['description'], 'defaults/' + path.name)
    additional=json.loads((PLUGIN / 'tools/additional_sources.json').read_text(encoding='utf-8'))
    terminology=json.loads((PLUGIN / 'tools/terminology.json').read_text(encoding='utf-8'))
    for text in additional+[key for key in terminology if key!='_languages']:
        if text not in found:
            content(text, 'curated-interface')
    return {'sources': {key: sorted(found[key]) for key in sorted(found)}}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--wangp', type=Path, default=PLUGIN.parents[1])
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    report = extract(args.wangp)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(len(report['sources']), 'source candidates:', args.output)
