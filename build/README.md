# Build sources

The website in the repository root is complete and deployable without this folder. These files document the data pipeline and make the build repeatable.

## Prerequisites

- Python 3.12 with the standard library
- The raw open corpora, not committed here:
  - WordNet 3.0 `dict/` files (`data.noun`, `index.noun`, and the other parts of speech)
  - `simplewiktionary.xml.bz2`
  - CEFR-J `cefrj-vocab.csv` and Octanove `octanove-c1c2.csv`
  - `ipa-en-UK.txt`, `ipa-en-US.txt`
  - `freq50k.txt`
  - optional: Kaikki phrase extracts (`pos-phrase.jsonl`, `pos-proverb.jsonl`, `pos-prep_phrase.jsonl`) in `build/cache/kaikki/`
- eSpeak NG extracted at `build/tools/espeak/extract1492/` for the rare-word IPA fallback. It is used only at build time and is not part of the site.

The expected raw layout is `build/raw/` as consumed by `sources.py`.

## Commands

```bash
python build/tools/fetch_idioms.py       # optional; populates build/cache
python build/tools/build_lexicon_v2.py   # writes build/output/data/
```

Copy `build/output/data/` to `data/` after a rebuild, then bump both `DATA_VERSION` in `assets/app.js` and `VERSION` in `sw.js` so browsers cannot mix an old cached index with a new app shell.

## Notes

- `build_lexicon_v2.py` writes a compact index and 1,000-entry chunks; it never ships the raw corpora.
- Phrase IPA is composed from word-level transcriptions with weak forms for function words. Entries that still need eSpeak are marked `ipa_auto`.
- The idiom collection combines Wiktionary idioms/proverbs/phrases with fixed expressions from WordNet. Ranking favours genuine idioms over compound terminology.
- CC BY-SA 4.0 attribution for Wiktionary-derived data is in `licenses/THIRD-PARTY.txt`.
