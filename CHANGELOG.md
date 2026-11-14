# Changelog

## 0.2.0 — 2026-11-14

First public release of WanGP Languages (`wangp-language`).

**Tested with WanGP 19.292 only.** Minimum declared to the plugin manager: 19.292.
Older and newer WanGP versions are unverified; see `compatibility.json`.

- Eight languages: Spanish, Catalan, original English, French, Italian, German,
  Russian and Simplified Chinese; 5,348 source entries per catalog.
- A dedicated Languages section with remembered preferences and immediate
  disable/re-enable controls, without a floating selector.
- Local translation corrections, additional languages, conflict previews,
  import/export and undo for the last import.
- Monolingual JSON exports prepared for a future Weblate connection.
- Installation through WanGP's **Install from URL** screen, documented with a screenshot.
- Tested on WanGP 19.292: 6 Python checks and 56 browser checks passed.

Catalogs were prepared with local model assistance and terminology corrections.
Native-speaker review is welcome. Unknown or external interface strings can stay
in English, and existing dropdown searches use the original English labels.

Original plugin code is MIT licensed. WanGP text and its translations retain the
upstream notices and terms in `THIRD_PARTY_NOTICES.txt` and `LICENSE.WanGP.txt`.
