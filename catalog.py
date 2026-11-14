"""Dependency-free catalog validation, shared by the plugin and maintenance tools."""
import json
import re
from pathlib import Path


def read_object(path):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError(f"Duplicate key {key!r} in {path}")
            result[key] = value
        return result
    value = json.loads(Path(path).read_text(encoding="utf-8"), object_pairs_hook=unique)
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object: {path}")
    return value


def load_catalogs(root):
    root = Path(root)
    languages = read_object(root / "languages.json")
    source = read_object(root / "locales" / "en.json")
    if not source or any(not isinstance(k, str) or not k.strip() or v != k for k, v in source.items()):
        raise ValueError("English catalog must map each source phrase to itself")
    if any(key in ('__proto__', 'constructor', 'prototype') for key in source):
        raise ValueError("Reserved source key")
    normalized = [' '.join(key.split()) for key in source]
    if len(set(normalized)) != len(normalized):
        raise ValueError("Duplicate normalized source text")
    if "en" not in languages or "es" not in languages:
        raise ValueError("English and Spanish languages are required")
    catalogs = {}
    for code, name in languages.items():
        if not re.fullmatch(r"[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*", code) or not isinstance(name, str):
            raise ValueError(f"Invalid language: {code}")
        messages = read_object(root / "locales" / f"{code}.json")
        for key, value in messages.items():
            if key not in source or not isinstance(value, str):
                raise ValueError(f"Invalid translation key/value in {code}: {key}")
            if value and sorted(re.findall(r'\{\d+\}', key)) != sorted(re.findall(r'\{\d+\}', value)):
                raise ValueError(f"Mismatched placeholders in {code}: {key}")
        catalogs[code] = messages
    metadata = read_object(root / "plugin_info.json") if (root / "plugin_info.json").exists() else {}
    context = read_object(root / "message_context.json") if (root / "message_context.json").exists() else {}
    guides = [index for index, key in enumerate(source) if context.get(key) == 'guide']
    return {"languages": languages, "catalogs": catalogs, "guideIndices": guides, "defaultLanguage": "es", "version": metadata.get("version", "0.2.0")}
