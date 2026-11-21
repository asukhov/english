#!/usr/bin/env python3
"""Build the English Lexicon static site dataset.

Sources (open-licensed):
- CEFR-J Vocabulary Profile 1.5 (CC BY-SA style terms in README; attribution required)
- Octanove Vocabulary Profile C1/C2 1.0 (CC BY-SA 4.0)
- Simple English Wiktionary dump (CC BY-SA 4.0) for learner-friendly definitions
- WordNet 3.0 (Princeton WordNet License) for fallback definitions/examples
- open-dict-data/ipa-dict (MIT) for IPA pronunciations

This script produces original JSON packaging and UI data; it does not copy
proprietary dictionaries.
"""
from __future__ import annotations
import csv, json, os, re, sys, math, hashlib, shutil, time
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path('/home/ubuntu/git/english')
RAW = ROOT/'build/raw'
CONTENT = ROOT/'build/content'
SITE = ROOT/'site'
DATA = SITE/'data'
ASSETS = SITE/'assets'
sys.path.insert(0, str(ROOT/'build/tools'))
from sources import load_cefr, load_ipa, normalize_key, clean_display, POS_CANON, POS_CODE, WN_POS, LEVELS, LEVEL_ORDER
from simplewikt import load_pages

def read_json(p):
    with open(p, encoding='utf-8') as f: return json.load(f)

def write_json(p, obj):
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f: json.dump(obj, f, ensure_ascii=False, separators=(',',':'))

def slug(s):
    s=re.sub(r'[^a-z0-9]+','-', s.lower()).strip('-')
    return s or 'x'

# --- Load sources ---
print('loading CEFR...')
cefr = load_cefr(str(RAW))
print('CEFR entries', len(cefr))
print('loading IPA...')
ipa_uk, ipa_us = load_ipa(str(RAW))
print('IPA', len(ipa_uk), len(ipa_us))

# wanted keys for wiktionary
wanted=set()
for e in cefr.values():
    wanted.add(e.key)
    for a in e.aliases: wanted.add(normalize_key(a))
# add curated content words
curated_files=['function-words.json','common-phrases.json','phrasal-verbs.json','slang.json','offensive.json']
curated=[]
for fn in curated_files:
    p=CONTENT/fn
    if p.exists():
        obj=read_json(p)
        if isinstance(obj,list):
            for it in obj:
                curated.append((fn,it))
                w=normalize_key(it.get('word',''))
                if w: wanted.add(w)
print('wanted wiktionary keys', len(wanted))
print('loading Simple Wiktionary...')
pages = load_pages(str(RAW/'simplewiktionary.xml.bz2'), wanted)
print('wiktionary pages', len(pages))

# WordNet
print('loading WordNet...')
# lightweight wordnet loader
WN = {}
WN_INDEX=defaultdict(list)
for fpos, canon in [('noun','n'),('verb','v'),('adj','a'),('adv','r')]:
    path=RAW/'dict'/f'data.{fpos}'
    with open(path, encoding='utf-8', errors='replace') as f:
        for line in f:
            if line.startswith('  ') or not line.strip(): continue
            parts=line.rstrip('\n').split(' ')
            if len(parts)<6: continue
            offset=parts[0]; ss_type=parts[2]
            try: wcnt=int(parts[3],16)
            except: continue
            idx=4; words=[]
            for _ in range(wcnt):
                if idx+1>=len(parts): break
                words.append(parts[idx].replace('_',' ')); idx+=2
            if idx>=len(parts): continue
            try: pcnt=int(parts[idx])
            except: continue
            idx+=1+pcnt*4
            gloss_raw=' '.join(parts[idx:]).strip()
            if gloss_raw.startswith('|'): gloss_raw=gloss_raw[1:].strip()
            segs=re.split(r';\s*"', gloss_raw)
            gloss=segs[0].strip()
            examples=[]
            for seg in segs[1:]:
                ex=seg.rsplit('"',1)[0].strip()
                if ex: examples.append(ex)
            syn={'offset':offset,'pos':canon,'gloss':gloss,'examples':examples,'synonyms':[w for w in words if w]}
            WN[(canon,offset)]=syn
            if ss_type=='s': WN[('a',offset)]=syn
for fpos, canon in [('noun','n'),('verb','v'),('adj','a'),('adv','r')]:
    path=RAW/'dict'/f'index.{fpos}'
    with open(path, encoding='utf-8', errors='replace') as f:
        for line in f:
            if line.startswith('  ') or not line.strip(): continue
            p=line.split()
            if len(p)<6: continue
            lemma=p[0].lower()
            try: n=int(p[2]); pc=int(p[3])
            except: continue
            idx=4+pc
            if idx+1>=len(p): continue
            try: sc=int(p[idx]); idx+=2
            except: continue
            offsets=p[idx:idx+n]
            for off in offsets: WN_INDEX[lemma].append((canon,off))
print('WordNet synsets', len(WN), 'index lemmas', len(WN_INDEX))

# helpers
STOP_DEFS = set('a an the to of and or for in on with by is are was were be been being have has had do does did this that it as at from but not you i he she they we them his her their its my your our who which what when where how if than so up out about into over after before between through during without within'.split())

def ipa_for(word):
    w=normalize_key(word)
    uk = ipa_uk.get(w) or []
    us = ipa_us.get(w) or []
    # try joined multiword
    if not uk and not us and ' ' in w:
        parts=w.split()
        ukp=[]; usp=[]; ok=True
        for p in parts:
            a=ipa_uk.get(p); b=ipa_us.get(p)
            if not (a or b): ok=False; break
            ukp.append((a or b)[0].strip('/[]'))
            usp.append((b or a)[0].strip('/[]'))
        if ok:
            uk=['/'+ ' '.join(ukp) +'/']
            us=['/'+ ' '.join(usp) +'/']
    # fallback remove hyphen
    if not uk and not us and '-' in w:
        uk=ipa_uk.get(w.replace('-','')) or []
        us=ipa_us.get(w.replace('-','')) or []
    return (uk[0] if uk else ''), (us[0] if us else '')

def simple_def(word):
    key=normalize_key(word)
    page=pages.get(key)
    if not page or not page.blocks: return None
    return page

def wn_lookup(word,pos):
    wnpos=WN_POS.get(pos)
    if not wnpos: return []
    lemma=normalize_key(word).replace('-','_').replace(' ','_')
    candidates=[lemma]
    if "'" in lemma: candidates.append(lemma.replace("'",""))
    seen=set(); out=[]
    for cand in candidates:
        for p,off in WN_INDEX.get(cand,[]):
            if p!=wnpos: continue
            if off in seen: continue
            s=WN.get((p,off))
            if s: seen.add(off); out.append(s)
    return out

GRAM_MAP = {
 'n':'n','v':'v','a':'adj','r':'adv'
}

def wn_pos_label(p):
    return {'n':'noun','v':'verb','a':'adjective','r':'adverb'}.get(p,p)

def clean_text(t):
    t=re.sub(r'\s+',' ',(t or '')).strip()
    t=t.replace('_',' ')
    return t

def good_def(text, headword):
    if not text: return False
    t=text.strip()
    if len(t)<8 or len(t)>220: return False
    low=t.lower(); hw=normalize_key(headword)
    # avoid circular-ish very short
    if low == hw: return False
    return True

def mk_def(text, example='', labels=None):
    return {'text':clean_text(text),'example':clean_text(example),'labels':labels or []}

def grammar_codes(pos, wn_pos=None):
    codes=[]
    pc=POS_CODE.get(pos, pos[:4] if pos else '')
    if pc: codes.append(pc)
    return codes


entries=[]
index=[]
seen_keys=set()

def add_entry(entry):
    k=entry['id']
    if k in seen_keys: return False
    seen_keys.add(k)
    entries.append(entry)
    # search index
    idx={'i':len(entries)-1,'id':entry['id'],'w':entry['word'],'k':normalize_key(entry['word']),
         'p':entry.get('pos',''),'l':entry.get('level',''),'t':entry.get('themes',[]),
         'a':[normalize_key(x) for x in entry.get('variants',[])],
         's':entry.get('ipa_uk') or entry.get('ipa_us') or '',
         'd':(entry['senses'][0]['defs'][0]['text'] if entry.get('senses') and entry['senses'][0].get('defs') else '')[:120]
         }
    index.append(idx)
    return True

# 1) Curated content first (function words, phrases, phrasal verbs, slang, offensive)
theme_by_file={
 'function-words.json':['function'],
 'common-phrases.json':['phrase'],
 'phrasal-verbs.json':['phrasal'],
 'slang.json':['slang'],
 'offensive.json':['offensive'],
}
print('adding curated content...')
for fn in curated_files:
    p=CONTENT/fn
    if not p.exists(): continue
    obj=read_json(p)
    if not isinstance(obj,list): continue
    for it in obj:
        word=clean_display(it.get('word',''))
        if not word: continue
        key=normalize_key(word)
        pos=it.get('pos','phrase')
        level=it.get('level','B1')
        uk,us=ipa_for(word)
        senses=[]
        for d in it.get('definitions',[]):
            senses.append({'pos':pos,'level':level,'defs':[mk_def(d.get('text',''), d.get('example',''), d.get('labels',[]))],
                           'synonyms':[],'antonyms':[],'grammar':it.get('grammar', POS_CODE.get(pos,pos)),'register':it.get('register','neutral'),
                           'note':it.get('note','')})
        if not senses:
            senses=[{'pos':pos,'level':level,'defs':[mk_def('A word or expression.','')],'synonyms':[],'antonyms':[],'grammar':POS_CODE.get(pos,pos),'register':it.get('register','neutral'),'note':it.get('note','')}]
        themes=list(theme_by_file.get(fn,[]))
        # extra themes
        if pos=='phrasal verb' and 'phrasal' not in themes: themes.append('phrasal')
        entry={'id':slug(key),'word':word,'key':key,'pos':pos,'level':level,'register':it.get('register','neutral'),'region':it.get('region','UK/US'),
               'ipa_uk':uk,'ipa_us':us,'variants':it.get('variants',[]),'tags':it.get('tags',[]),'themes':themes,
               'senses':senses,'source':['Curated original content'],'frequency':50000}
        # extra metadata
        for f in ['verb','particle','separable','stress','era','severity','warning','is_slur','grammar']:
            if f in it: entry[f]=it[f]
        add_entry(entry)
print('curated entries', len(entries))

# 2) CEFR core entries
print('adding CEFR entries...')
for key, e in sorted(cefr.items(), key=lambda kv: (kv[1].frequency, kv[0])):
    if key in seen_keys: continue
    word=e.word
    uk,us=ipa_for(word)
    page=simple_def(word)
    senses=[]
    # create senses by CEFR pos
    for pos, cs in e.senses.items():
        defs=[]
        syns=[]; ants=[]
        reg='neutral'
        note=''
        grammar=POS_CODE.get(pos,pos)
        # from simple wiktionary
        if page:
            # pick blocks matching pos
            for b in page.blocks:
                bpos=b.pos
                if bpos=='proper noun': bpos='noun'
                if bpos==pos or (pos=='modal' and bpos in ('verb','modal')) or (pos=='numeral' and bpos in ('numeral','noun','adjective')):
                    for dfn in b.definitions:
                        if good_def(dfn.text, word):
                            defs.append(mk_def(dfn.text, dfn.examples[0] if dfn.examples else '', dfn.labels))
                        syns.extend(dfn.synonyms); ants.extend(dfn.antonyms)
                    if not uk and b.ipa_uk: uk=b.ipa_uk
                    if not us and b.ipa_us: us=b.ipa_us
                    if not uk and b.ipa_any: uk=b.ipa_any
                    if b.syllables: note=(note+' Syllables: '+b.syllables).strip()
        # fallback WordNet
        if not defs:
            for syn in wn_lookup(word,pos)[:3]:
                g=clean_text(syn['gloss'])
                if good_def(g, word):
                    ex=syn['examples'][0] if syn['examples'] else ''
                    defs.append(mk_def(g, ex, []))
                syns.extend([s for s in syn['synonyms'] if normalize_key(s)!=key][:5])
        # last fallback: short generated definition from word class
        if not defs:
            defs=[mk_def(f'A {pos} used in English.', f'This is an example with {word}.')]
        # dedupe defs
        seen_d=set(); dd=[]
        for d in defs:
            k2=d['text'].lower()
            if k2 in seen_d: continue
            seen_d.add(k2); dd.append(d)
        defs=dd[:4]
        # clean syn/ant
        syns=[s for i,s in enumerate(syns) if s and normalize_key(s)!=key and s not in syns[:i]][:8]
        ants=[s for i,s in enumerate(ants) if s and normalize_key(s)!=key and s not in ants[:i]][:8]
        senses.append({'pos':pos,'level':cs.level,'defs':defs,'synonyms':syns,'antonyms':ants,'grammar':grammar,'register':reg,'note':note})
    if not senses:
        continue
    # top-level
    lvl=e.level
    themes=['dictionary']
    if lvl in ('B2','C1','C2'): themes.append(lvl.lower())
    # determine function theme
    if any(s['pos'] in ('determiner','pronoun','preposition','conjunction','modal','particle') for s in senses):
        themes.append('function')
    entry={'id':slug(key),'word':word,'key':key,'pos':senses[0]['pos'],'level':lvl,'register':'neutral','region':'UK/US',
           'ipa_uk':uk,'ipa_us':us,'variants':e.aliases,'tags':[],'themes':themes,
           'senses':senses,'source':['CEFR-J / Octanove profile labels','Simple English Wiktionary (CC BY-SA 4.0)','WordNet 3.0','Open IPA Dict (MIT)'],
           'frequency':e.frequency}
    add_entry(entry)
print('total entries', len(entries))

# mark defining vocabulary: frequency + function + definition-token coverage
print('selecting defining vocabulary...')
token_counts=Counter()
for e in entries:
    for ss in e.get('senses',[]):
        for d in ss.get('defs',[]):
            toks=re.findall(r"[a-z']+", (d.get('text','')+' '+d.get('example','')).lower())
            for t in toks:
                if len(t)>=2: token_counts[t]+=1
key_to_entry={}
for e in entries:
    key_to_entry.setdefault(e['key'], e)
    for v in e.get('variants',[]): key_to_entry.setdefault(normalize_key(v), e)
def defining_score(ent):
    lvl=ent.get('level','C2')
    base=LEVEL_ORDER.get(lvl,9)
    freq=ent.get('frequency',50000)
    bonus=0
    if 'function' in ent.get('themes',[]): bonus-=4000
    if any(ss['pos'] in ('determiner','pronoun','preposition','conjunction','modal','particle','numeral') for ss in ent.get('senses',[])): bonus-=3000
    if lvl=='A1': bonus-=1200
    elif lvl=='A2': bonus-=800
    elif lvl=='B1': bonus-=300
    bonus-=min(2500, token_counts.get(ent['key'],0)*2)
    return (base, freq+bonus)
cands=[e for e in entries if e.get('level') in ('A1','A2','B1','B2') and e.get('register')!='offensive']
cands.sort(key=defining_score)
defining=set(e['id'] for e in cands[:3000])
for e in entries:
    e['defining']=e['id'] in defining
def_words=set()
for e in entries:
    if e['defining']:
        def_words.add(e['key'])
        for v in e.get('variants',[]): def_words.add(normalize_key(v))
for e in entries:
    for ss in e.get('senses',[]):
        for d in ss.get('defs',[]):
            toks=re.findall(r"[a-z']+", d.get('text','').lower())
            content=[t for t in toks if t not in {'a','an','the','to','of','and','or','for','in','on','with','by','as','at','from','that','this','is','are','was','were','be','it'}]
            if content:
                known=sum(1 for t in content if t in def_words or t==e['key'])
                d['dv']= (known/len(content))>=0.80
            else:
                d['dv']=True
print('defining count', sum(1 for e in entries if e['defining']))

# Build search index payload (compact)
search=[]
for i,e in enumerate(entries):
    search.append({'i':i,'id':e['id'],'w':e['word'],'k':e['key'],'p':e['pos'],'l':e['level'],'r':e.get('register','neutral'),
                   'd':1 if e.get('defining') else 0,'t':e.get('themes',[]),'v':[normalize_key(x) for x in e.get('variants',[])],
                   'f':e.get('frequency',50000),'s':(e.get('ipa_uk') or e.get('ipa_us') or ''),
                   'g':(e['senses'][0]['defs'][0]['text'] if e.get('senses') and e['senses'][0].get('defs') else '')[:90]})

# chunk entries for lazy loading
CHUNK=500
chunks=[]
for i in range(0,len(entries),CHUNK):
    chunk=entries[i:i+CHUNK]
    fn=f'entries-{i//CHUNK:03d}.json'
    write_json(DATA/fn, chunk)
    chunks.append({'file':fn,'start':i,'end':i+len(chunk)-1,'count':len(chunk)})
write_json(DATA/'chunks.json', {'chunkSize':CHUNK,'total':len(entries),'chunks':chunks})
write_json(DATA/'search.json', search)

# metadata/stats
stats={'total':len(entries),'defining':sum(1 for e in entries if e.get('defining')),
       'levels':{l:sum(1 for e in entries if e.get('level')==l) for l in LEVELS},
       'themes':{t:sum(1 for e in entries if t in e.get('themes',[])) for t in ['function','phrasal','slang','offensive','b2','c1','c2','dictionary']},
       'generated':time.strftime('%Y-%m-%d')}
write_json(DATA/'meta.json', stats)

# curated reference files
for fn in ['numbers-units.json','pronunciation.json','grammar.json']:
    src=CONTENT/fn
    if src.exists(): shutil.copy2(src, DATA/fn)

# also copy curated raw lists for tabs
for fn in ['phrasal-verbs.json','slang.json','offensive.json','function-words.json','common-phrases.json']:
    src=CONTENT/fn
    if src.exists(): shutil.copy2(src, DATA/fn)

print('stats', stats)
print('done')
