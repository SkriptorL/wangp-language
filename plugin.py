"""Presentation-only translation through WanGP's supported custom-JS hook."""
import json
from pathlib import Path
import gradio as gr

from shared.utils.plugins import WAN2GPPlugin
from .catalog import load_catalogs


class LanguagePlugin(WAN2GPPlugin):
    def setup_ui(self):
        root = Path(__file__).parent
        payload = load_catalogs(root)
        # Escape HTML-sensitive characters because Gradio embeds this in its page.
        data = json.dumps(payload, ensure_ascii=True).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
        runtime = (root / "assets" / "language.js").read_text(encoding="utf-8")
        self.add_custom_js(runtime.replace("/*__WANGP_LANGUAGE_DATA__*/", data))
        self.add_custom_js((root / "assets" / "editor.js").read_text(encoding="utf-8"))
        self.add_tab("language", "Languages", self.create_language_ui)

    def create_language_ui(self):
        root = Path(__file__).parent
        gr.HTML((root / "assets" / "panel.html").read_text(encoding="utf-8"))
