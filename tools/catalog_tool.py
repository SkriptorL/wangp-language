"""Offline maintenance: validate catalogs or extract source candidates."""
import argparse
import ast
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from catalog import load_catalogs, read_object


def extract(wangp):
    """Read only upstream source, never prompts, settings, logs or media."""
    found = {}
    paths = [wangp / "wgp.py", *sorted((wangp / "plugins").glob("*/plugin.py")), *sorted((wangp / "shared").glob("*.py"))]
    for path in paths:
        if ROOT in path.parents:
            continue
        for node in ast.walk(ast.parse(path.read_text(encoding="utf-8-sig"))):
            if not isinstance(node, ast.Call):
                continue
            values = [k.value for k in node.keywords if k.arg in ("label", "info", "placeholder")]
            if isinstance(node.func, ast.Attribute) and node.func.attr in ("Button", "Tab", "TabItem", "Accordion", "Info", "Warning", "Error"):
                values += node.args[:1]
            for value in values:
                if isinstance(value, ast.Constant) and isinstance(value.value, str) and value.value.strip():
                    key = " ".join(value.value.split())
                    found.setdefault(key, []).append(f"{path.relative_to(wangp).as_posix()}:{value.lineno}")
    source = read_object(ROOT / "locales/en.json")
    return {"catalog_messages": len(source), "candidate_messages": len(found),
            "candidates": {key: {"in_catalog": key in source, "locations": locations} for key, locations in sorted(found.items())}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("validate")
    scan = commands.add_parser("extract")
    scan.add_argument("--wangp", type=Path, default=ROOT.parents[1])
    scan.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.command == "validate":
        payload = load_catalogs(ROOT)
        for code, messages in payload["catalogs"].items():
            print(f"{code}: {sum(bool(v) for v in messages.values())}/{len(payload['catalogs']['en'])} catalog entries")
    else:
        report = extract(args.wangp.resolve())
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{report['candidate_messages']} source candidates; {report['catalog_messages']} catalog entries. Report: {args.output}")


if __name__ == "__main__":
    main()
