# English Lexicon

A self-contained, static English-to-English dictionary website designed for GitHub Pages.

## Features

- **Dictionary**: Searchable English-to-English entries with CEFR levels, POS/grammar labels, IPA pronunciation, definitions, examples, synonyms, and variants.
- **Defining Vocabulary**: A controlled core of up to 3,000 common words selected from high-frequency A1–B2/function words and words frequently used in definitions.
- **Numbers & Units**: Number forms, date/time expressions, measurement units, and a built-in converter.
- **Phrasal Verbs**: Dedicated phrasal-verb tab with separability and usage metadata.
- **CEFR tabs**: Focused B2, C1, and C2 word lists.
- **Slang**: Informal and internet slang with region/era labels.
- **Strong Language**: Educational, clinical coverage of common profanity/insults. Slurs targeting protected groups are excluded.
- **Pronunciation Guide**: IPA vowel/consonant charts, stress, connected speech, and UK/US notes.
- **Grammar Codes**: Word-class and dictionary grammar labels used by entries.
- **Fast smart search**: Client-side search with wildcard support (`*` and `?`), relevance/alpha/level/frequency sorting.
- **Responsive UI**: Works on phones, tablets, and desktops.
- **Self-contained**: Fonts, icons, data, and code are stored locally. No external runtime dependencies.

## Project structure

```text
site/                 # Deploy this folder to GitHub Pages
  index.html
  assets/
    app.js
    styles.css
    favicon.svg
    fonts/
  data/               # Generated JSON data
  licenses/
build/
  raw/                # Downloaded open source datasets
  content/            # Curated original JSON content
  tools/              # Build scripts
```

## Build

The lexical data is generated from open sources and curated local content.

```bash
python3 build/tools/build_lexicon.py
```

To serve locally:

```bash
python3 -m http.server 8123 --directory site
```

## Data sources and licenses

See [`site/licenses/THIRD-PARTY.txt`](site/licenses/THIRD-PARTY.txt) for attribution and license details.

Main sources include:
- Simple English Wiktionary (CC BY-SA 4.0)
- WordNet 3.0 (Princeton WordNet License)
- Open IPA Dict (MIT)
- CEFR-J Vocabulary Profile (attribution required)
- Octanove Vocabulary Profile C1/C2 (CC BY-SA 4.0)
- Fraunces/Inter fonts (SIL OFL 1.1)

## Notes

- Definitions are learner-friendly and normalized from open sources; WordNet is used as fallback.
- This project does not intentionally copy proprietary dictionary text.
- The Strong Language tab is included for educational lexicographic purposes and uses content warnings.
