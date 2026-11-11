#!/usr/bin/env python3
"""Builds dist/ for GitHub Pages: one index.html with styles, data and code inlined, plus PWA files."""
import json, os, re, shutil, hashlib

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC, DATA, DIST = (os.path.join(ROOT, d) for d in ('src', 'data', 'dist'))
TOPICS = ['gk','brain','history','science','space','animals','tech','bollywood','hollywood','music','love',
          'geography','capitals','india','food','cricket','sports','gaming',
          'emoji','flags','mythology','books']   # append only: links refer to topics by position

qb = {'topics': {}, 'couple': None}
for t in TOPICS:
    path = os.path.join(DATA, t + '.json')
    if not os.path.exists(path):
        print(f'  (skipping {t}: no data yet)'); qb['topics'][t] = []; continue
    rows = json.load(open(path, encoding='utf-8'))
    extra = os.path.join(DATA, t + '_2.json')     # round-2 questions are appended, so old indices stay valid
    if os.path.exists(extra): rows += json.load(open(extra, encoding='utf-8'))
    out = []
    for r in rows:
        assert len(r['w']) == 3 and len({r['a'], *r['w']}) == 4, (t, r)
        out.append([r['q'], r['a'], *r['w'], int(r.get('d', 2))])
    qb['topics'][t] = out
qb['couple'] = json.load(open(os.path.join(DATA, 'couple.json'), encoding='utf-8'))

html = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
css = open(os.path.join(SRC, 'style.css'), encoding='utf-8').read()
js = open(os.path.join(SRC, 'app.js'), encoding='utf-8').read()
data = json.dumps(qb, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
html = html.replace('/*CSS*/', css).replace('/*DATA*/', data).replace('/*JS*/', js)

os.makedirs(DIST, exist_ok=True)
open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8').write(html)
ver = hashlib.sha1(html.encode()).hexdigest()[:10]
sw = open(os.path.join(SRC, 'sw.js'), encoding='utf-8').read().replace('__VERSION__', ver)
open(os.path.join(DIST, 'sw.js'), 'w', encoding='utf-8').write(sw)
shutil.copy(os.path.join(SRC, 'manifest.webmanifest'), DIST)
for f in ('icon-192.png', 'icon-512.png'):
    p = os.path.join(SRC, f)
    if os.path.exists(p): shutil.copy(p, DIST)
open(os.path.join(DIST, '.nojekyll'), 'w').write('')
# GitHub Pages serves the repository root, so publish the built files there too
for f in ('index.html', 'sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', '.nojekyll'):
    p = os.path.join(DIST, f)
    if os.path.exists(p): shutil.copy(p, ROOT)
# the Android app bundles the same page so it opens instantly and works offline
www = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'www')
if os.path.isdir(os.path.join(ROOT, 'android')):
    os.makedirs(www, exist_ok=True)
    for f in ('index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'):
        p = os.path.join(DIST, f)
        if os.path.exists(p): shutil.copy(p, www)
total = sum(len(v) for v in qb['topics'].values())
print(f'built dist/index.html  {len(html)//1024} KB  {total} questions  sw {ver}')
