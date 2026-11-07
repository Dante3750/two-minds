#!/usr/bin/env python3
"""Builds dist/ for GitHub Pages: one index.html with styles, data and code inlined, plus PWA files."""
import json, os, re, shutil, hashlib

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC, DATA, DIST = (os.path.join(ROOT, d) for d in ('src', 'data', 'dist'))
TOPICS = ['gk','brain','history','science','space','animals','tech','bollywood','hollywood','music','love',
          'geography','capitals','india','food','cricket','sports','gaming']

qb = {'topics': {}, 'couple': None}
for t in TOPICS:
    path = os.path.join(DATA, t + '.json')
    rows = json.load(open(path, encoding='utf-8'))
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
total = sum(len(v) for v in qb['topics'].values())
print(f'built dist/index.html  {len(html)//1024} KB  {total} questions  sw {ver}')
