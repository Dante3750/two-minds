(() => {
'use strict';
const $ = id => document.getElementById(id);
const QB = window.QB;                       // {topics:{id:[[q,a,w1,w2,w3,d],...]}, couple:{know,likely}}
const ROUNDS = 7;

/* ================= topics ================= */
const META = [
  ['gk','General Knowledge','◎','#ffc53d','know'], ['brain','Brain Teasers','✦','#f7e463','know'],
  ['history','History','⌛','#d9b38c','know'], ['science','Science','⚛','#3ddc84','know'],
  ['space','Space','☾','#8f96ff','know'], ['animals','Animals','❀','#95d5b2','know'],
  ['tech','Tech & Internet','⌘','#b8c0ff','know'],
  ['bollywood','Bollywood','★','#ff4fa3','pop'], ['hollywood','Hollywood','▶','#ff6b5a','pop'],
  ['music','Music','♪','#c77dff','pop'], ['love','Love & Romance','♥','#ff8fa3','pop'],
  ['geography','Geography','⌖','#38d6ff','world'], ['capitals','Capitals & Flags','⚑','#5aa9ff','world'],
  ['india','India','✺','#ff9933','world'], ['food','Food & Drink','◒','#ff8a65','world'],
  ['cricket','Cricket','◍','#a3e635','play'], ['sports','Sports','◉','#2ec4b6','play'],
  ['gaming','Video Games','◆','#f15bb5','play']
].filter(m => QB.topics[m[0]] && QB.topics[m[0]].length);
const TOPICS = {};
META.forEach(([id, name, ic, c, cat]) => TOPICS[id] = {id, name, ic, c, cat, q: QB.topics[id]});
TOPICS.mixed = {id:'mixed', name:'Mixed Bag', ic:'✳', c:'#f2f4ff', cat:'all', q:null};
TOPICS.us = {id:'us', name:'Us Two', ic:'❦', c:'#ffb3c1', cat:'all', q:null};
TOPICS.daily = {id:'daily', name:'Daily Duel', ic:'☀', c:'#ffc53d', cat:'all', q:null};
const TOPIC_IDS = META.map(m => m[0]);
const CATS = [['all','All'],['know','Knowledge'],['pop','Pop culture'],['world','World'],['play','Sports & games']];
const COLORS = ['#ff6b5a','#38d6ff','#ffc53d','#3ddc84','#c77dff','#ff8fa3','#f4a259','#8f96ff'];
const TITLES = [[1,'Rookie'],[3,'Quizzer'],[6,'Brainiac'],[10,'Mastermind'],[15,'Genius'],[22,'Legend'],[30,'Grandmaster']];
const TOPIC_TITLES = [[1,'Novice'],[5,'Apprentice'],[10,'Expert'],[15,'Master'],[20,'Legend']];

/* ================= storage ================= */
const KEY = 'twominds.v2';
const blankStats = () => ({played:0, won:0, lost:0, draw:0, correct:0, answered:0, fast:0, perfect:0, streak:0, best:0, topics:{}});
let S = {
  me:{name:'', color:'#ff6b5a'}, partner:{name:'', color:'#38d6ff'},
  xp:{me:{}, partner:{}}, stats:{me:blankStats(), partner:blankStats()},
  h2h:[0,0,0], history:[], used:{}, us:[], badges:[], fav:[], recent:[],
  daily:{}, settings:{sound:true, vib:true, relaxed:false, seat:'face', botLevel:1},
  id: Math.random().toString(36).slice(2, 10), onboarded:false, couple:{bestKnow:0, bestLikely:0, played:0}, challenges:{sent:0, played:0, won:0}
};
function load(){
  try{
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d){
      S = Object.assign(S, d);
      S.stats.me = Object.assign(blankStats(), d.stats && d.stats.me);
      S.stats.partner = Object.assign(blankStats(), d.stats && d.stats.partner);
      S.settings = Object.assign({sound:true, vib:true, relaxed:false, seat:'face', botLevel:1}, d.settings || {});
      S.xp = Object.assign({me:{}, partner:{}}, d.xp || {});
      S.couple = Object.assign({bestKnow:0, bestLikely:0, played:0}, d.couple || {});
      S.challenges = Object.assign({sent:0, played:0, won:0}, d.challenges || {});
      return;
    }
    const v1 = JSON.parse(localStorage.getItem('twominds.v1') || 'null');   // carry over the first version
    if (v1){
      if (v1.n1 && v1.n1 !== 'You') S.me.name = v1.n1;
      if (v1.n2 && v1.n2 !== 'Her' && v1.n2 !== 'Bot') S.partner.name = v1.n2;
      if (Array.isArray(v1.h2h)) S.h2h = v1.h2h.slice(0, 3);
      if (Array.isArray(v1.us)) S.us = v1.us.filter(u => u && u.q && u.a && u.w && u.w.length === 3);
    }
  }catch(e){}
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
load();

/* ================= small utils ================= */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function shuffle(a, rnd = Math.random){ for (let i = a.length - 1; i > 0; i--){ const j = (rnd()*(i+1))|0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
function hash(s){ let h = 2166136261; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed){ let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function today(){ const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
const nameOf = who => (S[who].name || (who === 'me' ? 'You' : 'Partner')).trim();
const initial = n => (String(n).trim()[0] || '?').toUpperCase();
const safeColor = c => (typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c)) ? c : '#9aa3d1';
function avatar(name, color, cls = ''){ return `<span class="av ${cls}" style="--c:${safeColor(color)}">${esc(initial(name))}</span>`; }
function levelOf(xp){ let lv = 1, need = 150, left = xp || 0; while (left >= need){ left -= need; lv++; need = Math.round(need*1.18); } return {lv, into:left, need}; }
function totalXp(who){ return Object.values(S.xp[who] || {}).reduce((a, b) => a + b, 0); }
function overallLevel(who){ return levelOf(totalXp(who) / 3).lv; }
function titleFor(lv, table = TITLES){ let t = table[0][1]; for (const [n, name] of table) if (lv >= n) t = name; return t; }
function topicLevel(who, id){ return levelOf((S.xp[who] || {})[id] || 0); }

/* ================= sound + haptics ================= */
let ac = null;
function tone(f, d = 0.1, type = 'sine', v = 0.09, slide = 1, delay = 0){
  if (!S.settings.sound) return;
  try{
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const o = ac.createOscillator(), g = ac.createGain(), t0 = ac.currentTime + delay;
    o.type = type; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(Math.max(30, f*slide), t0 + d);
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + d + 0.03);
  }catch(e){}
}
const SFX = {
  tap:   () => tone(620, 0.05, 'triangle', 0.06),
  pick:  () => tone(520, 0.07, 'triangle', 0.08),
  right: () => { tone(784, 0.12, 'sine', 0.09); tone(1175, 0.18, 'sine', 0.08, 1, 0.09); },
  wrong: () => tone(170, 0.25, 'sawtooth', 0.05, 0.7),
  tick:  () => tone(900, 0.04, 'square', 0.025),
  round: () => tone(440, 0.09, 'sine', 0.06),
  bonus: () => { tone(330, 0.18, 'square', 0.05, 2); tone(660, 0.25, 'square', 0.05, 1.5, 0.15); },
  vs:    () => { tone(150, 0.4, 'sawtooth', 0.06, 2.5); tone(300, 0.3, 'triangle', 0.06, 2, 0.25); },
  win:   () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, 'triangle', 0.08, 1, i*0.11)),
  lose:  () => [392, 349, 311, 262].forEach((f, i) => tone(f, 0.22, 'triangle', 0.07, 1, i*0.14)),
  badge: () => [880, 1109, 1319, 1760].forEach((f, i) => tone(f, 0.14, 'sine', 0.07, 1, i*0.07))
};
function buzz(p){ if (!S.settings.vib) return; try{ navigator.vibrate && navigator.vibrate(p); }catch(e){} }
function toast(msg, ms = 2000){ const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms); }

/* confetti */
const fx = $('fx'), fctx = fx.getContext('2d');
let parts = [], fxOn = false;
function sizeFx(){ const d = Math.min(devicePixelRatio || 1, 2); fx.width = innerWidth*d; fx.height = innerHeight*d; fctx.setTransform(d,0,0,d,0,0); }
addEventListener('resize', sizeFx); sizeFx();
function confetti(n = 120, colors = ['#ff6b5a','#38d6ff','#ffc53d','#3ddc84','#c77dff']){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < n; i++) parts.push({x: innerWidth/2 + (Math.random()-.5)*innerWidth*.6, y: innerHeight*.3, vx:(Math.random()-.5)*9, vy:-Math.random()*11-3, r:Math.random()*6.28, vr:(Math.random()-.5)*.3, s:4+Math.random()*5, c:colors[i % colors.length], life:1});
  if (!fxOn){ fxOn = true; requestAnimationFrame(fxLoop); }
}
function fxLoop(){
  fctx.clearRect(0, 0, innerWidth, innerHeight);
  for (const p of parts){ p.vy += .28; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= .006;
    fctx.save(); fctx.translate(p.x, p.y); fctx.rotate(p.r); fctx.globalAlpha = clamp(p.life*2, 0, 1); fctx.fillStyle = p.c; fctx.fillRect(-p.s/2, -p.s/4, p.s, p.s/2); fctx.restore(); }
  parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 40);
  if (parts.length) requestAnimationFrame(fxLoop); else { fxOn = false; fctx.clearRect(0, 0, innerWidth, innerHeight); }
}

/* ================= question picking ================= */
// a "ref" points at a question: {t:topicId, i:index} or {c:[q,a,w1,w2,w3]} for custom ones
function refQ(ref){
  if (ref.c) return ref.c;
  const list = QB.topics[ref.t]; return list && list[ref.i];
}
function pickRefs(topicId, rnd = Math.random, trackUsed = true){
  if (topicId === 'us'){
    const mine = shuffle(S.us.map(u => ({c:[u.q, u.a, ...u.w]})), rnd).slice(0, ROUNDS);
    const fill = mine.length < ROUNDS ? pickRefs('mixed', rnd, false).slice(0, ROUNDS - mine.length) : [];
    return mine.concat(fill);
  }
  if (topicId === 'mixed' || topicId === 'daily'){
    const topics = shuffle(TOPIC_IDS.slice(), rnd).slice(0, ROUNDS);
    const plan = [1,1,2,2,2,3,3];
    return topics.map((t, k) => {
      const list = QB.topics[t];
      let idx = list.map((q, i) => i).filter(i => (list[i][5] || 2) === plan[k]);
      if (!idx.length) idx = list.map((q, i) => i);
      return {t, i: idx[(rnd()*idx.length)|0]};
    });
  }
  const list = QB.topics[topicId];
  const usedSet = new Set(trackUsed ? (S.used[topicId] || []) : []);
  let avail = list.map((q, i) => i).filter(i => !usedSet.has(i));
  if (avail.length < ROUNDS){ S.used[topicId] = []; avail = list.map((q, i) => i); }
  const byD = d => shuffle(avail.filter(i => (list[i][5] || 2) === d), rnd);
  const pools = {1: byD(1), 2: byD(2), 3: byD(3)};
  const plan = [1,1,2,2,2,3,3], out = [], taken = new Set();
  for (const d of plan){
    let i = pools[d].find(x => !taken.has(x));
    if (i === undefined) i = shuffle(avail.slice(), rnd).find(x => !taken.has(x));
    taken.add(i); out.push({t: topicId, i});
  }
  if (trackUsed){ S.used[topicId] = [...(S.used[topicId] || []), ...out.map(r => r.i)]; save(); }
  return out;
}
function materialize(ref){
  const q = refQ(ref);
  if (!q) return null;
  const opts = shuffle([0,1,2,3].map(o => ({text: q[1 + o], orig: o})));   // orig 0 is the right answer
  return {q: q[0], opts, right: opts.findIndex(o => o.orig === 0), t: ref.t || 'us'};
}

/* ================= links (challenge by link) ================= */
function b64e(obj){ const bytes = new TextEncoder().encode(JSON.stringify(obj)); let s = ''; bytes.forEach(b => s += String.fromCharCode(b)); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function b64d(str){ const s = atob(str.replace(/-/g,'+').replace(/_/g,'/')); const bytes = Uint8Array.from(s, c => c.charCodeAt(0)); return JSON.parse(new TextDecoder().decode(bytes)); }
function baseUrl(){ return location.href.split('#')[0]; }
function packRefs(refs){ return refs.map(r => r.c ? {c: r.c} : [TOPIC_IDS.indexOf(r.t), r.i]); }
function unpackRefs(arr){ return arr.map(x => Array.isArray(x) ? {t: TOPIC_IDS[x[0]], i: x[1]} : {c: x.c}); }
function playerPack(who, res){ return {n: nameOf(who), c: S[who].color, lv: overallLevel(who), p: res.picks, s: res.score}; }
function linkFor(kind, topic, refs, A, B, date, ms){
  const payload = {v:2, k:kind, t:topic, q:packRefs(refs), A, ms: (M && M.T) || (S.settings.relaxed ? 15000 : 10000)};
  if (B) payload.B = B;
  if (date) payload.d = date;
  if (ms) payload.ms = ms;
  return baseUrl() + '#c=' + b64e(payload);
}
function validPlayer(x){
  if (!x || typeof x !== 'object') return false;
  if (typeof x.n !== 'string' || !x.n.trim() || x.n.length > 24) return false;
  if (!Number.isInteger(x.s) || x.s < 0 || x.s > 160) return false;
  if (!/^#[0-9a-f]{3,8}$/i.test(String(x.c))) return false;
  if (x.lv !== undefined && !(Number.isInteger(x.lv) && x.lv >= 0 && x.lv < 1000)) return false;
  if (x.i !== undefined && !(typeof x.i === 'string' && /^[a-z0-9]{1,16}$/.test(x.i))) return false;
  return Array.isArray(x.p) && x.p.length === ROUNDS && x.p.every(k => Array.isArray(k) && Number.isInteger(k[0]) && k[0] >= -1 && k[0] <= 3 && Number.isFinite(k[1]) && k[1] >= 0 && k[1] <= 20000);
}
function validLink(p){
  if (!p || p.v !== 2 || !Array.isArray(p.q) || p.q.length !== ROUNDS || !validPlayer(p.A)) return false;
  if (p.B !== undefined && !validPlayer(p.B)) return false;
  if (!TOPICS[p.t]) return false;
  if (p.ms !== undefined && p.ms !== 10000 && p.ms !== 15000) return false;
  if (p.d !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(p.d))) return false;
  return unpackRefs(p.q).every(r => { if (r.c) return Array.isArray(r.c) && r.c.length === 5 && r.c.every(x => typeof x === 'string' && x.length <= 120); const q = refQ(r); return Array.isArray(q) && q.length >= 5; });
}

async function shareLink(url, text){
  const full = `${text}\n${url}`;
  if (navigator.share){
    try{ await navigator.share({title:'Two Minds', text, url}); return 'shared'; }
    catch(e){ if (e && e.name === 'AbortError') return 'cancelled'; }
  }
  try{ await navigator.clipboard.writeText(full); toast('Link copied. Paste it in your chat'); return 'copied'; }
  catch(e){ return 'manual'; }
}

/* ================= router ================= */
const APP_SCREENS = ['home','topics','topic','couple','me','us','results','incoming','coupleRes','history'];
let current = 'home', topicSel = 'gk';
function go(id, opts = {}){
  current = id;
  for (const s of APP_SCREENS) $(s).hidden = s !== id;
  const tabbed = ['home','topics','couple','me'].includes(id);
  $('tabbar').hidden = !tabbed;
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-current', t.dataset.go === id || (id === 'topic' && t.dataset.go === 'topics') ? 'page' : 'false'));
  ({home:renderHome, topics:renderTopics, topic:renderTopic, couple:renderCouple, me:renderMe, us:renderUs, history:renderHistory}[id] || (() => {}))(opts);
  const el = $(id); if (el && !opts.keepScroll) el.scrollTop = 0;
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-go]'); if (t){ SFX.tap(); go(t.dataset.go); return; }
  const tp = e.target.closest('[data-topic]'); if (tp){ SFX.tap(); topicSel = tp.dataset.topic; go('topic'); return; }
});

/* ================= home ================= */
function pairStrip(){
  const lm = overallLevel('me'), lp = overallLevel('partner');
  return `<div class="pair">
    <div class="pp">${avatar(nameOf('me'), S.me.color)}<div><div class="nm">${esc(nameOf('me'))}</div><div class="tt">Lv ${lm} · ${titleFor(lm)}</div></div></div>
    <div class="rec"><span style="color:${S.me.color}">${S.h2h[0]}</span>–<span style="color:${S.partner.color}">${S.h2h[1]}</span><small>head to head</small></div>
    <div class="pp r">${avatar(nameOf('partner'), S.partner.color)}<div><div class="nm">${esc(nameOf('partner'))}</div><div class="tt">Lv ${lp} · ${titleFor(lp)}</div></div></div>
  </div>`;
}
function topicTile(id){
  const T = TOPICS[id];
  const lv = Math.max(topicLevel('me', id).lv, topicLevel('partner', id).lv);
  const sub = id === 'us' ? `${S.us.length} written` : id === 'mixed' ? 'All topics' : `Lv ${lv} · ${T.q.length} Qs`;
  return `<button type="button" class="tp" data-topic="${id}" style="--c:${T.c}">${S.fav.includes(id) ? '<span class="star">★</span>' : ''}<span class="ic">${T.ic}</span><b>${esc(T.name)}</b><small>${sub}</small></button>`;
}
function renderHome(){
  const dDone = S.daily[today()];
  const recent = [...new Set([...S.fav, ...S.recent])].filter(id => TOPICS[id] && id !== 'daily').slice(0, 6);
  const show = recent.length ? recent : ['gk','bollywood','love','cricket','india','mixed'];
  $('home').innerHTML = `<div class="col">
    <div class="top"><h1 class="logo"><span class="a">Two</span> <span class="b">Minds</span></h1><button class="btn" style="width:auto;padding:9px 12px;font-size:12.5px" data-go="me">Profiles</button></div>
    ${pairStrip()}
    <div class="modes">
      <button class="mode m-duel" type="button" id="hmDuel"><span class="mi">⚔</span><div><b>Duel on this phone</b><span>Face to face, same question, fastest wins</span></div></button>
      <button class="mode m-link" type="button" id="hmLink"><span class="mi">✉</span><div><b>Challenge by link</b><span>Play now, she plays your ghost later</span></div></button>
      <button class="mode m-daily wide" type="button" id="hmDaily"><span class="mi">☀</span><div><b>Daily Duel</b><span>7 mixed questions, same for both of you today</span></div><span class="go">${dDone ? 'Score ' + dDone.score : 'Play'}</span></button>
      <button class="mode m-couple wide" type="button" data-go="couple"><span class="mi">❦</span><div><b>Couple corner</b><span>How well do you know me? Who's more likely?</span></div><span class="go">Open</span></button>
    </div>
    <div class="h">${S.fav.length || S.recent.length ? 'Your topics' : 'Popular topics'}<button type="button" data-go="topics">All ${TOPIC_IDS.length} topics</button></div>
    <div class="tgrid">${show.map(topicTile).join('')}</div>
    ${S.history.length ? `<div class="h">Recent matches<button type="button" data-go="history">See all</button></div><ul class="list">${S.history.slice(0, 3).map(histRow).join('')}</ul>` : ''}
  </div>`;
  $('hmDuel').onclick = () => { SFX.tap(); pickTopicThen('duel'); };
  $('hmLink').onclick = () => { SFX.tap(); pickTopicThen('link'); };
  $('hmDaily').onclick = () => { SFX.tap(); startSolo({kind:'daily', topic:'daily'}); };
}
function pickTopicThen(mode){ go('topics', {intent: mode}); }

function histRow(h){
  const cls = h.r === 'w' ? 'res-w' : h.r === 'l' ? 'res-l' : 'res-d';
  const word = h.r === 'w' ? 'Won' : h.r === 'l' ? 'Lost' : h.r === 'd' ? 'Draw' : 'Played';
  const T = TOPICS[h.t] || {name: h.t, c:'#888', ic:'?'};
  return `<li class="li"><span class="av s" style="--c:${T.c}">${T.ic}</span><div><div class="t1">${esc(T.name)} · ${esc(h.m)}</div><div class="t2">vs ${esc(h.o)} · ${esc(h.when)}</div></div><span class="sc"><span class="${cls}">${word}</span> ${h.s[0]}–${h.s[1]}</span></li>`;
}
function renderHistory(){
  $('history').innerHTML = `<div class="col"><div class="top"><button class="btn" style="width:auto;padding:9px 12px" data-go="home">← Back</button><h1 class="logo" style="font-size:24px">Matches</h1></div>
    ${S.history.length ? `<ul class="list">${S.history.map(histRow).join('')}</ul>` : '<p class="lede">No matches yet.</p>'}</div>`;
}

/* ================= topics ================= */
let catSel = 'all', topicIntent = null, searchTerm = '';
function renderTopics(opts = {}){
  if (opts.intent !== undefined) topicIntent = opts.intent;
  const ids = ['mixed','us', ...TOPIC_IDS].filter(id => {
    const T = TOPICS[id];
    if (catSel !== 'all' && T.cat !== catSel && T.cat !== 'all') return false;
    if (searchTerm && !T.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });
  const intentLine = topicIntent === 'duel' ? 'Pick a topic for your duel on this phone' : topicIntent === 'link' ? 'Pick a topic for your link challenge' : 'Tap a topic to see your levels and play';
  $('topics').innerHTML = `<div class="col">
    <div class="top"><h1 class="logo" style="font-size:28px">Topics</h1></div>
    <p class="lede">${intentLine}</p>
    <input class="search" id="tsearch" type="search" placeholder="Search topics" value="${esc(searchTerm)}" autocomplete="off">
    <div class="cats">${CATS.map(([id, n]) => `<button type="button" class="chip" data-cat="${id}" aria-pressed="${catSel === id}">${n}</button>`).join('')}</div>
    <div class="tgrid">${ids.map(topicTile).join('') || '<p class="small">No topic matches that search.</p>'}</div>
  </div>`;
  $('tsearch').oninput = e => { searchTerm = e.target.value; const pos = e.target.selectionStart; renderTopics(); const s = $('tsearch'); s.focus(); try{ s.setSelectionRange(pos, pos); }catch(_){} };
  $('topics').querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { catSel = b.dataset.cat; SFX.tap(); renderTopics(); });
}

function renderTopic(){
  const T = TOPICS[topicSel] || TOPICS.gk, id = T.id;
  const lm = topicLevel('me', id), lp = topicLevel('partner', id);
  const fav = S.fav.includes(id);
  const count = id === 'us' ? S.us.length : id === 'mixed' ? TOPIC_IDS.reduce((a, t) => a + QB.topics[t].length, 0) : T.q.length;
  const usNote = id === 'us' ? (S.us.length < 3 ? `<p class="small">Write at least 3 questions about you two to play this topic. With fewer than 7, the rest come from Mixed Bag.</p>` : `<p class="small">${S.us.length} questions written. Send them as a link and she answers questions about you two.</p>`) : '';
  const lvRow = (who, L) => `<div class="lvrow">${avatar(nameOf(who), S[who].color, 's')}<div><div class="meta"><b>${esc(nameOf(who))}</b><span>Lv ${L.lv} · ${titleFor(L.lv, TOPIC_TITLES)}</span></div><div class="xpbar" style="--c:${S[who].color}"><i style="width:${Math.round(L.into / L.need * 100)}%"></i></div></div></div>`;
  $('topic').innerHTML = `<div class="col">
    <div class="top"><button class="btn" style="width:auto;padding:9px 12px" data-go="topics">← Topics</button></div>
    <div class="thero" style="--c:${T.c}"><span class="ic">${T.ic}</span><h1>${esc(T.name)}</h1><p>${count} questions · 7 rounds · bonus round counts double</p>
      ${id !== 'us' && id !== 'mixed' ? `<button type="button" class="fav" id="favBtn">${fav ? '★ Favourite' : '☆ Favourite'}</button>` : ''}</div>
    ${usNote}
    ${id === 'us' ? `<button class="btn" type="button" data-go="us">Write questions about us</button>` : ''}
    <div class="card lvls">${lvRow('me', lm)}${lvRow('partner', lp)}</div>
    <button class="cta" type="button" id="tpDuel" ${topicIntent === 'link' ? 'style="order:2"' : ''}>Duel on this phone<small>Phone flat between you, race to tap</small></button>
    <button class="cta solid" type="button" id="tpLink" style="--c:${S.partner.color}">Challenge ${esc(nameOf('partner'))} by link<small>Play now, send the link, she plays your ghost</small></button>
    <button class="btn" type="button" id="tpBot">Practice against a bot<small>${['Easy','Normal','Hard'][S.settings.botLevel]} · change in Profiles</small></button>
  </div>`;
  if ($('favBtn')) $('favBtn').onclick = () => { S.fav = fav ? S.fav.filter(x => x !== id) : [id, ...S.fav]; save(); SFX.tap(); renderTopic(); };
  const usOk = id !== 'us' || S.us.length >= 3;
  const guard = fn => () => { if (!usOk){ toast('Write at least 3 Us questions first'); go('us'); return; } fn(); };
  $('tpDuel').onclick = guard(() => startDuel(id));
  $('tpLink').onclick = guard(() => startSolo({kind:'new', topic:id}));
  $('tpBot').onclick = guard(() => startSolo({kind:'bot', topic:id}));
}
function noteRecent(id){ if (!TOPICS[id] || id === 'daily') return; S.recent = [id, ...S.recent.filter(x => x !== id)].slice(0, 8); }

/* ================= VS intro ================= */
function vsIntro(a, b, topicId, face, then){
  const T = TOPICS[topicId];
  const el = $('vs');
  el.className = 'vs' + (face ? ' face' : '');
  el.innerHTML = `<div class="side b">${avatar(b.n, b.c, 'l')}<div class="nm">${esc(b.n)}</div><div class="tt">${esc(b.sub)}</div></div>
    <div class="mid"><div class="big">VS</div><span class="topic" style="--c:${T.c}">${T.ic} ${esc(T.name)}</span></div>
    <div class="side a">${avatar(a.n, a.c, 'l')}<div class="nm">${esc(a.n)}</div><div class="tt">${esc(a.sub)}</div></div>`;
  el.hidden = false;
  SFX.vs(); buzz([30, 60, 30]);
  setTimeout(() => { el.hidden = true; then(); }, 2300);
}

/* ================= shared round helpers ================= */
const answerMs = () => (M && M.T) || (S.settings.relaxed ? 15000 : 10000);
function pointsFor(leftMs, bonus){ const T = answerMs(); const base = clamp(10 + Math.ceil(leftMs / T * 10), 11, 20); return bonus ? base*2 : base; }
function wakeLock(){ try{ navigator.wakeLock && navigator.wakeLock.request('screen').catch(() => {}); }catch(e){} }

/* ================= split-screen duel ================= */
let M = null, raf = 0;
const H = [$('h0'), $('h1')];
function startDuel(topicId){
  if (!S.partner.name){ askNames(() => startDuel(topicId)); return; }
  noteRecent(topicId);
  const refs = pickRefs(topicId);
  const Q = refs.map(materialize);
  if (Q.some(q => !q)){ toast('Could not load questions for this topic'); return; }
  M = null;
  M = {T: S.settings.relaxed ? 15000 : 10000, mode:'duel', topic:topicId, refs, Q, round:-1, scores:[0,0], log:[], picks:[null,null], times:[0,0], phase:'intro', id: Math.random()};
  const face = S.settings.seat === 'face';
  $('duel').classList.toggle('face', face);
  const nm = [nameOf('me'), nameOf('partner')], col = [S.me.color, S.partner.color];
  H.forEach((h, p) => { h.style.setProperty('--c', col[p]); h.querySelector('.who').textContent = nm[p]; h.querySelector('.pts').firstChild.nodeValue = '0'; h.querySelector('.bar i').style.width = '0%'; h.querySelector('.q').textContent = ''; h.querySelector('.opts').innerHTML = ''; });
  armQuit($('quitBtn'), true);
  hideApp(); $('duel').hidden = false; wakeLock();
  const lm = topicLevel('me', topicId).lv, lp = topicLevel('partner', topicId).lv;
  vsIntro({n:nm[0], c:col[0], sub:`Lv ${lm} · ${titleFor(lm, TOPIC_TITLES)}`}, {n:nm[1], c:col[1], sub:`Lv ${lp} · ${titleFor(lp, TOPIC_TITLES)}`}, topicId, face, () => duelNext());
}
function hideApp(){ for (const s of APP_SCREENS) $(s).hidden = true; $('tabbar').hidden = true; }
function splash(el, text, ms, then){
  const sp = el.querySelector('.splash'); sp.querySelector('span').textContent = text; sp.classList.add('show');
  setTimeout(() => { sp.classList.remove('show'); setTimeout(then, 220); }, ms);
}
function dotsHtml(round){ return Array.from({length: ROUNDS}, (_, i) => `<i class="${i < round ? 'done' : i === round ? 'now' : ''} ${i === ROUNDS - 1 ? 'bonus' : ''}"></i>`).join(''); }
function duelNext(){
  if (!M || M.mode !== 'duel') return;
  M.round++;
  if (M.round >= ROUNDS){ finishMatch(); return; }
  const bonus = M.round === ROUNDS - 1, id = M.id;
  const label = bonus ? 'Bonus ×2' : `Round ${M.round + 1}`;
  $('labTop').textContent = label; $('labBot').textContent = label;
  $('rdots').innerHTML = dotsHtml(M.round);
  M.picks = [null, null]; M.times = [0, 0]; M.phase = 'question';
  const Q = M.Q[M.round];
  H.forEach((h, p) => {
    h.querySelector('.q').textContent = Q.q;
    const o = h.querySelector('.opts'); o.className = 'opts hide';
    o.innerHTML = Q.opts.map((x, i) => `<button type="button" class="opt" data-p="${p}" data-i="${i}">${esc(x.text)}</button>`).join('');
    h.querySelector('.timer').classList.remove('hurry'); h.querySelector('.timer i').style.transform = 'scaleX(1)';
  });
  if (bonus){ SFX.bonus(); buzz([30,40,30]); splash($('duel'), 'Bonus ×2', 1300, () => { if (M && M.id === id) duelShow(); }); }
  else { SFX.round(); setTimeout(() => { if (M && M.id === id) duelShow(); }, 1000); }
}
function duelShow(){
  if (!M || M.phase !== 'question') return;
  H.forEach(h => h.querySelector('.opts').classList.remove('hide'));
  M.phase = 'answer'; M.t0 = performance.now(); M.lastTick = null;
  cancelAnimationFrame(raf); raf = requestAnimationFrame(duelTick);
}
function duelTick(now){
  if (!M || M.mode !== 'duel' || M.phase !== 'answer') return;
  const T = answerMs(), left = Math.max(0, T - (now - M.t0)), k = left / T;
  for (let p = 0; p < 2; p++) if (M.picks[p] === null){ const tm = H[p].querySelector('.timer'); tm.querySelector('i').style.transform = `scaleX(${k})`; tm.classList.toggle('hurry', left < 3000); }
  const sec = Math.ceil(left / 1000);
  if (left <= 3000 && left > 0 && sec !== M.lastTick){ M.lastTick = sec; SFX.tick(); }
  if (left <= 0){ duelReveal(); return; }
  raf = requestAnimationFrame(duelTick);
}
function duelAnswer(p, i){
  if (!M || M.mode !== 'duel' || M.phase !== 'answer' || M.picks[p] !== null) return;
  M.picks[p] = i; M.times[p] = Math.max(0, answerMs() - (performance.now() - M.t0));
  const h = H[p]; h.querySelector('.opts').classList.add('locked');
  h.querySelector(`.opt[data-i="${i}"]`).classList.add('mine');
  SFX.pick(); buzz(12);
  if (M.picks[0] !== null && M.picks[1] !== null){ const id = M.id; setTimeout(() => { if (M && M.id === id) duelReveal(); }, 250); }
}
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('#duel .opt'); if (!b) return;
  e.preventDefault(); duelAnswer(+b.dataset.p, +b.dataset.i);
});
function duelReveal(){
  if (!M || M.phase !== 'answer') return;
  M.phase = 'reveal'; cancelAnimationFrame(raf);
  const Q = M.Q[M.round], bonus = M.round === ROUNDS - 1, gained = [0, 0];
  for (let p = 0; p < 2; p++) if (M.picks[p] === Q.right) gained[p] = pointsFor(M.times[p], bonus);
  H.forEach((h, p) => {
    const o = h.querySelector('.opts'); o.classList.add('locked');
    o.querySelectorAll('.opt').forEach((b, i) => {
      if (i === Q.right) b.classList.add('right'); else if (i === M.picks[p]) b.classList.add('wrong'); else if (i !== M.picks[1-p]) b.classList.add('dim');
      if (i === M.picks[0]) b.insertAdjacentHTML('beforeend', `<span class="dot d1" style="--c:${S.me.color}"></span>`);
      if (i === M.picks[1]) b.insertAdjacentHTML('beforeend', `<span class="dot d2" style="--c:${S.partner.color}"></span>`);
    });
    M.scores[p] += gained[p];
    const pts = h.querySelector('.pts'), g = pts.querySelector('.gain');
    pts.firstChild.nodeValue = M.scores[p];
    h.querySelector('.bar i').style.width = Math.min(100, M.scores[p] / 160 * 100) + '%';
    g.textContent = gained[p] ? '+' + gained[p] : ''; g.classList.remove('show'); void g.offsetWidth; if (gained[p]) g.classList.add('show');
  });
  M.log.push({orig: [0,1].map(p => M.picks[p] === null ? -1 : Q.opts[M.picks[p]].orig), ms: M.times.map(t => answerMs() - t), g: gained.slice(), q: Q.q, a: Q.opts[Q.right].text});
  (gained[0] || gained[1]) ? SFX.right() : SFX.wrong();
  buzz(gained[0] || gained[1] ? 20 : [20, 30, 20]);
  const id = M.id;
  setTimeout(() => { if (M && M.id === id) duelNext(); }, 2100);
}
function armQuit(btn, isDuel){
  btn.classList.remove('arm'); btn.textContent = isDuel ? 'Quit' : 'Quit';
  btn.onclick = () => {
    if (!btn.classList.contains('arm')){ btn.classList.add('arm'); btn.textContent = 'Tap again to quit'; clearTimeout(btn._t); btn._t = setTimeout(() => { btn.classList.remove('arm'); btn.textContent = 'Quit'; }, 2500); return; }
    quitMatch();
  };
}
function quitMatch(){
  M = null; cancelAnimationFrame(raf); clearInterval(soloTimer);
  $('duel').hidden = true; $('solo').hidden = true; $('vs').hidden = true;
  go(current === 'results' ? 'home' : (current || 'home'));
}

/* ================= solo: link challenge / reply / bot / daily ================= */
// ghost = {n, c, lv, picks:[[orig, ms] x7]}; picks orig: 0 right, 1-3 wrong, -1 no answer
let soloTimer = 0;
function makeBotGhost(refs){
  const lvl = S.settings.botLevel, acc = [0.45, 0.66, 0.85][lvl], spd = [[3500, 8500], [2200, 7000], [1200, 4500]][lvl];
  const names = ['Bot Rookie', 'Bot Pro', 'Bot Genius'];
  return {n: names[lvl], c:'#9aa3d1', lv: [3, 9, 18][lvl], bot:true,
    picks: refs.map((r, k) => { const q = refQ(r), d = q[5] || 2, a = clamp(acc - (d - 2)*0.1, 0.2, 0.95);
      const ms = Math.round(spd[0] + Math.random()*(spd[1]-spd[0]));
      return [Math.random() < a ? 0 : 1 + ((Math.random()*3)|0), Math.min(ms, answerMs() - 300)]; })};
}
function startSolo(o){
  // o: {kind:'new'|'reply'|'bot'|'daily'|'dailyReply', topic, refs?, ghost?, link?}
  const kind = o.kind;
  let refs = o.refs;
  if (!refs){
    if (o.topic === 'daily') refs = pickRefs('daily', rng(hash('twominds-daily-' + today())), false);
    else refs = pickRefs(o.topic);
  }
  noteRecent(o.topic);
  const Q = refs.map(materialize);
  if (Q.some(q => !q)){ toast('Could not load these questions'); return; }
  let ghost = o.ghost || null;
  if (kind === 'bot') ghost = makeBotGhost(refs);
  M = null;
  const matchT = o.ms || (S.settings.relaxed ? 15000 : 10000);
  M = {T: matchT, mode:'solo', kind, topic:o.topic, refs, Q, ghost, round:-1, score:0, gscore:0, log:[], phase:'intro', id:Math.random(), link:o.link || null, date:o.date || (o.topic === 'daily' ? today() : null)};
  const me = {n:nameOf('me'), c:S.me.color}, opp = ghost ? {n:ghost.n, c:ghost.c} : {n:nameOf('partner'), c:S.partner.color};
  $('soloMe').innerHTML = `${avatar(me.n, me.c, 's')}<div><div class="nm">${esc(me.n)}</div><div class="sc">0<span class="gain"></span></div></div>`;
  $('soloOpp').innerHTML = `${avatar(opp.n, opp.c, 's')}<div><div class="nm">${esc(opp.n)}</div><div class="sc">${ghost ? '0' : '–'}<span class="gain"></span></div><div class="state" id="oppState">${ghost ? '' : 'plays later'}</div></div>`;
  $('vbarL').style.setProperty('--c', me.c); $('vbarR').style.setProperty('--c', opp.c);
  $('vbarL').querySelector('i').style.height = '0%'; $('vbarR').querySelector('i').style.height = '0%';
  $('sQ').textContent = ''; $('sOpts').innerHTML = '';
  armQuit($('squit'), false);
  hideApp(); $('solo').hidden = false; wakeLock();
  const lvMe = o.topic === 'daily' ? overallLevel('me') : topicLevel('me', o.topic).lv;
  const oppSub = ghost ? (ghost.bot ? 'Practice bot' : `Lv ${ghost.lv || 1} · already played`) : 'Gets your link after';
  vsIntro({n:me.n, c:me.c, sub:`Lv ${lvMe}`}, {n:opp.n, c:opp.c, sub:oppSub}, o.topic, false, () => soloNext());
}
function soloNext(){
  if (!M || M.mode !== 'solo') return;
  M.round++;
  if (M.round >= ROUNDS){ finishMatch(); return; }
  const bonus = M.round === ROUNDS - 1, id = M.id, Q = M.Q[M.round];
  $('sLabel').textContent = bonus ? 'Bonus round · ×2' : `Round ${M.round + 1} of ${ROUNDS}`;
  $('sQ').textContent = Q.q;
  $('sOpts').className = 'olist hide opts';
  $('sOpts').innerHTML = Q.opts.map((x, i) => `<button type="button" class="opt" data-i="${i}">${esc(x.text)}</button>`).join('');
  M.pick = null; M.left = 0; M.phase = 'question'; M.gAnswered = false;
  if ($('oppState') && M.ghost) $('oppState').textContent = '';
  setRing(1, Math.ceil(answerMs()/1000));
  if (bonus){ SFX.bonus(); buzz([30,40,30]); splash($('solo'), 'Bonus round ×2', 1300, () => { if (M && M.id === id) soloShow(); }); }
  else { SFX.round(); setTimeout(() => { if (M && M.id === id) soloShow(); }, 1100); }
}
function setRing(k, sec){
  const c = $('ringFg'), L = 2*Math.PI*27;
  c.style.strokeDasharray = L; c.style.strokeDashoffset = L*(1 - k);
  $('ringNum').textContent = sec; $('ring').classList.toggle('hurry', sec <= 3);
}
function soloShow(){
  if (!M || M.phase !== 'question') return;
  $('sOpts').classList.remove('hide');
  M.phase = 'answer'; M.t0 = performance.now(); M.lastTick = null;
  cancelAnimationFrame(raf); raf = requestAnimationFrame(soloTick);
}
function soloTick(now){
  if (!M || M.mode !== 'solo' || (M.phase !== 'answer' && M.phase !== 'waitGhost')) return;
  const T = answerMs(), el = now - M.t0, left = Math.max(0, T - el), sec = Math.ceil(left/1000);
  if (M.pick === null){ setRing(left / T, sec); if (left <= 3000 && left > 0 && sec !== M.lastTick){ M.lastTick = sec; SFX.tick(); } }
  if (M.ghost && !M.gAnswered){
    const g = M.ghost.picks[M.round];
    if (g && g[0] !== -1 && el >= g[1]){ M.gAnswered = true; if ($('oppState')){ $('oppState').textContent = 'answered'; $('oppState').className = 'state ok'; } tone(700, 0.05, 'triangle', 0.04); }
  }
  const gDone = !M.ghost || M.gAnswered || (M.ghost.picks[M.round] || [-1])[0] === -1;
  if ((M.pick !== null && gDone) || left <= 0){ soloReveal(); return; }
  raf = requestAnimationFrame(soloTick);
}
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('#sOpts .opt'); if (!b) return;
  e.preventDefault();
  if (!M || M.mode !== 'solo' || M.phase !== 'answer' || M.pick !== null) return;
  M.pick = +b.dataset.i; M.left = Math.max(0, answerMs() - (performance.now() - M.t0));
  b.classList.add('mine'); $('sOpts').classList.add('locked');
  SFX.pick(); buzz(12);
});
function soloReveal(){
  if (!M || M.phase === 'reveal') return;
  M.phase = 'reveal'; cancelAnimationFrame(raf);
  const Q = M.Q[M.round], bonus = M.round === ROUNDS - 1;
  const myG = M.pick === Q.right ? pointsFor(M.left, bonus) : 0;
  let gG = 0, gIdx = -1;
  if (M.ghost){
    const g = M.ghost.picks[M.round] || [-1, answerMs()];
    gIdx = g[0] === -1 ? -1 : Q.opts.findIndex(o => o.orig === g[0]);
    if (g[0] === 0) gG = pointsFor(Math.max(0, answerMs() - g[1]), bonus);
  }
  M.score += myG; M.gscore += gG;
  $('sOpts').classList.add('locked');
  $('sOpts').querySelectorAll('.opt').forEach((b, i) => {
    if (i === Q.right) b.classList.add('right'); else if (i === M.pick) b.classList.add('wrong'); else if (i !== gIdx) b.classList.add('dim');
    if (i === M.pick) b.insertAdjacentHTML('beforeend', `<span class="dot d1" style="--c:${S.me.color}"></span>`);
    if (M.ghost && i === gIdx) b.insertAdjacentHTML('beforeend', `<span class="dot d2" style="--c:${M.ghost.c}"></span>`);
  });
  const bump = (sel, val, gain) => { const sc = $(sel).querySelector('.sc'); sc.firstChild.nodeValue = val; const g = sc.querySelector('.gain'); g.textContent = gain ? '+' + gain : ''; g.classList.remove('show'); void g.offsetWidth; if (gain) g.classList.add('show'); };
  bump('soloMe', M.score, myG);
  if (M.ghost){ bump('soloOpp', M.gscore, gG); if ($('oppState')){ $('oppState').textContent = gIdx === -1 ? 'no answer' : ''; $('oppState').className = 'state'; } }
  $('vbarL').querySelector('i').style.height = Math.min(100, M.score/160*100) + '%';
  $('vbarR').querySelector('i').style.height = Math.min(100, M.gscore/160*100) + '%';
  M.log.push({orig:[M.pick === null ? -1 : Q.opts[M.pick].orig, M.ghost ? (M.ghost.picks[M.round] || [-1])[0] : null], ms:[M.pick === null ? answerMs() : answerMs() - M.left, M.ghost ? (M.ghost.picks[M.round] || [0, 0])[1] : null], g:[myG, gG], q:Q.q, a:Q.opts[Q.right].text});
  myG ? SFX.right() : SFX.wrong();
  buzz(myG ? 20 : [20, 30, 20]);
  const id = M.id;
  setTimeout(() => { if (M && M.id === id) soloNext(); }, 2000);
}

/* ================= finishing a match ================= */
function finishMatch(){
  const m = M; m.phase = 'done'; cancelAnimationFrame(raf);
  $('duel').hidden = true; $('solo').hidden = true;
  const res = {topic: m.topic, mode: m.mode, kind: m.kind};
  const me = S.stats.me, pa = S.stats.partner;
  const gained = {me:0, partner:0}, before = {me: topicLevel('me', m.topic === 'daily' ? 'mixed' : m.topic).lv, partner: topicLevel('partner', m.topic === 'daily' ? 'mixed' : m.topic).lv};
  const xpTopic = m.topic === 'daily' ? 'mixed' : m.topic;
  let s0, s1, oppName, oppColor, r;   // r from my side: w / l / d / p (played, no opponent yet)
  if (m.mode === 'duel'){
    [s0, s1] = m.scores; oppName = nameOf('partner'); oppColor = S.partner.color;
    r = s0 > s1 ? 'w' : s1 > s0 ? 'l' : 'd';
    S.h2h[r === 'w' ? 0 : r === 'l' ? 1 : 2]++;
    const rp = r === 'w' ? 'l' : r === 'l' ? 'w' : 'd';
    applyStats(me, r, m.log.map(l => [l.orig[0], l.ms[0]]), m.topic);
    applyStats(pa, rp, m.log.map(l => [l.orig[1], l.ms[1]]), m.topic);
    gained.me = s0 + (r === 'w' ? 50 : r === 'd' ? 20 : 0); gained.partner = s1 + (rp === 'w' ? 50 : rp === 'd' ? 20 : 0);
  } else {
    s0 = m.score; s1 = m.ghost ? m.gscore : null; oppName = m.ghost ? m.ghost.n : nameOf('partner'); oppColor = m.ghost ? m.ghost.c : S.partner.color;
    r = s1 === null ? 'p' : s0 > s1 ? 'w' : s1 > s0 ? 'l' : 'd';
    applyStats(me, r, m.log.map(l => [l.orig[0], l.ms[0]]), m.topic);
    gained.me = s0 + (r === 'w' ? 50 : r === 'd' ? 20 : 0);
    if (m.ghost && !m.ghost.bot && m.kind !== 'bot'){ S.challenges.played++; if (r === 'w') S.challenges.won++; }
    if (m.topic === 'daily' && !S.daily[today()] && m.date === today()) S.daily[today()] = {score: s0};
  }
  S.xp.me[xpTopic] = (S.xp.me[xpTopic] || 0) + gained.me;
  if (gained.partner) S.xp.partner[xpTopic] = (S.xp.partner[xpTopic] || 0) + gained.partner;
  m.trailedBeforeBonus = (() => { const pre = m.log.slice(0, ROUNDS - 1).reduce((a, l) => [a[0] + l.g[0], a[1] + l.g[1]], [0, 0]); return pre[0] <= pre[1]; })();
  const modeName = m.mode === 'duel' ? 'Duel' : m.kind === 'bot' ? 'Practice' : m.topic === 'daily' ? 'Daily' : m.kind === 'reply' ? 'Link reply' : 'Link';
  S.history.unshift({t: m.topic, m: modeName, o: oppName, s:[s0, s1 === null ? '?' : s1], r, when: new Date().toLocaleDateString(undefined, {day:'numeric', month:'short'}) + ' ' + new Date().toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit'})});
  S.history = S.history.slice(0, 40);
  const newBadges = checkBadges({m, r, s0, s1});
  save();
  renderResults({m, r, s0, s1, oppName, oppColor, gained, before, xpTopic, newBadges});
  M = null;
}
function applyStats(st, r, picks, topic){
  st.played++; if (r === 'w'){ st.won++; st.streak++; st.best = Math.max(st.best, st.streak); } else if (r === 'l'){ st.lost++; st.streak = 0; } else if (r === 'd'){ st.draw++; }
  let right = 0;
  picks.forEach(([o, ms]) => { if (o !== -1) st.answered++; if (o === 0){ st.correct++; right++; if (ms <= 2000) st.fast++; } });
  if (right === ROUNDS) st.perfect++;
  st.topics[topic] = (st.topics[topic] || 0) + 1;
}

/* ================= badges ================= */
const BADGES = [
  ['first_win','First win','Win any match','✌'], ['win10','On a roll','Win 10 matches','⚡'], ['streak3','Hat-trick','Win 3 in a row','♛'],
  ['perfect','Flawless','7 of 7 correct','✔'], ['score140','Speed demon','Score 140+ in a match','➶'], ['comeback','Clutch','Win from behind in the bonus round','↺'],
  ['draw','Perfect balance','Draw a match','☯'], ['topics5','Explorer','Play 5 topics','⌖'], ['topics12','Globetrotter','Play 12 topics','✈'],
  ['lv5','Rising star','Reach level 5 in a topic','★'], ['lv10','Expert','Reach level 10 in a topic','✪'], ['daily1','Early bird','Finish a Daily Duel','☀'],
  ['daily7','Week warrior','Daily Duel on 7 days','☼'], ['sent','Gauntlet','Send a challenge link','✉'], ['ldw','Long-distance win','Beat her link ghost','❤'],
  ['us5','Storyteller','Write 5 Us questions','✎'], ['know80','Mind reader','80%+ in How well do you know me','◎'], ['likely80','Same wavelength','80%+ in Who\'s more likely','≈'],
  ['bothard','Beat the machine','Beat the Hard bot','⚙'], ['played25','Regular','Play 25 matches','♺'], ['century','Century','100 correct answers','C'],
  ['night','Night owl','Play between midnight and 4 am','☾'], ['fast20','Quick draw','20 answers under 2 seconds','⌁'], ['h2h10','Rivals','Play 10 duels on one phone','⚔']
];
function checkBadges(ctx = {}){
  const st = S.stats.me, got = new Set(S.badges), add = [];
  const has = (id, cond) => { if (!got.has(id) && cond){ got.add(id); add.push(id); } };
  const m = ctx.m || {}, maxLv = Math.max(0, ...Object.keys(S.xp.me).map(t => topicLevel('me', t).lv));
  has('first_win', st.won >= 1); has('win10', st.won >= 10); has('streak3', st.best >= 3);
  has('perfect', st.perfect >= 1); has('score140', ctx.s0 >= 140); has('comeback', ctx.r === 'w' && m.trailedBeforeBonus && m.mode);
  has('draw', st.draw >= 1); has('topics5', Object.keys(st.topics).length >= 5); has('topics12', Object.keys(st.topics).length >= 12);
  has('lv5', maxLv >= 5); has('lv10', maxLv >= 10); has('daily1', Object.keys(S.daily).length >= 1); has('daily7', Object.keys(S.daily).length >= 7);
  has('sent', S.challenges.sent >= 1); has('ldw', S.challenges.won >= 1); has('us5', S.us.length >= 5);
  has('know80', S.couple.bestKnow >= 80); has('likely80', S.couple.bestLikely >= 80);
  has('bothard', m.kind === 'bot' && ctx.r === 'w' && S.settings.botLevel === 2);
  has('played25', st.played >= 25); has('century', st.correct >= 100);
  has('night', ctx.m && new Date().getHours() < 4); has('fast20', st.fast >= 20);
  has('h2h10', S.h2h[0] + S.h2h[1] + S.h2h[2] >= 10);
  S.badges = [...got];
  return add;
}
function badgeHtml(ids){ return ids.map(id => { const b = BADGES.find(x => x[0] === id); return b ? `<div class="newb"><span class="bi">${b[3]}</span><div><b>Badge unlocked: ${esc(b[1])}</b><span>${esc(b[2])}</span></div></div>` : ''; }).join(''); }
function badgeToast(ids){ ids.forEach((id, k) => { const b = BADGES.find(x => x[0] === id); if (b) setTimeout(() => { toast(`Badge unlocked: ${b[1]}`); SFX.badge(); }, 600 + k*2200); }); }

/* ================= results screen ================= */
let lastShare = null;
function renderResults(o){
  const {m, r, s0, s1, oppName, oppColor, gained, before, xpTopic, newBadges} = o;
  const T = TOPICS[m.topic];
  const myName = nameOf('me');
  let head;
  if (m.mode === 'duel') head = r === 'd' ? "It's a draw!" : `<span style="color:${r === 'w' ? S.me.color : S.partner.color}">${esc(r === 'w' ? myName : oppName)}</span> wins!`;
  else if (r === 'p') head = m.topic === 'daily' ? 'Daily done!' : 'Now send it to her';
  else head = r === 'w' ? 'You win!' : r === 'l' ? `${esc(oppName)} wins` : "It's a draw!";
  const showOpp = s1 !== null;
  const rows = m.log.map((l, i) => {
    const best = !showOpp ? -1 : l.g[0] > l.g[1] ? 0 : l.g[1] > l.g[0] ? 1 : -1;
    const cell = (p) => { if (p === 1 && !showOpp) return '<span class="c">?</span>'; const g = l.g[p], o = l.orig[p]; return `<span class="c ${g ? 'ok' : ''} ${best === p ? 'best' : ''}">${g ? '+' + g : o === -1 || o === null ? 'too slow' : '✗'}</span>`; };
    return `<div class="rr"><span class="n">${i === ROUNDS - 1 ? 'Bonus' : 'R' + (i + 1)}</span>${cell(0)}${cell(1)}</div>`;
  }).join('');
  const xpRow = who => { if (!gained[who]) return ''; const L = topicLevel(who, xpTopic); const up = L.lv > before[who];
    return `<div class="lvrow">${avatar(nameOf(who), S[who].color, 's')}<div><div class="meta"><b>${esc(nameOf(who))} · +${gained[who]} XP</b><span class="${up ? 'lvup' : ''}">${up ? 'Level up! ' : ''}Lv ${L.lv}</span></div><div class="xpbar" style="--c:${S[who].color}"><i style="width:0%" data-w="${Math.round(L.into / L.need * 100)}"></i></div></div></div>`; };
  // buttons by mode
  let actions = '';
  if (m.mode === 'duel') actions = `<button class="cta" id="rAgain" type="button">Rematch</button><div class="row"><button class="btn" type="button" data-go="topics">New topic</button><button class="btn" type="button" data-go="home">Home</button></div>`;
  else if (m.kind === 'bot') actions = `<button class="cta" id="rAgain" type="button">Play again</button><div class="row"><button class="btn" type="button" data-go="topics">New topic</button><button class="btn" type="button" data-go="home">Home</button></div>`;
  else if (r === 'p') actions = `<button class="cta" id="rShare" type="button">Send challenge to ${esc(nameOf('partner'))}<small>She plays the same 7 questions against your ghost</small></button><div class="linkbox" id="lbox" hidden></div><button class="btn" type="button" data-go="home">Home</button>`;
  else actions = `<button class="cta" id="rShare" type="button">Send your result back<small>Shows the full scoreboard on their phone</small></button><button class="btn" type="button" id="rBack">Challenge back with new questions</button><div class="linkbox" id="lbox" hidden></div><button class="btn" type="button" data-go="home">Home</button>`;
  $('results').innerHTML = `<div class="col">
    <p class="small" style="text-align:center"><span style="color:${T.c}">${T.ic}</span> ${m.topic === 'daily' ? '' : esc(T.name) + ' · '}${m.mode === 'duel' ? 'Duel on one phone' : m.kind === 'bot' ? 'Practice' : m.topic === 'daily' ? 'Daily Duel · ' + esc(m.date || today()) : 'Link challenge'}</p>
    <h1 class="winner">${head}</h1>
    <div class="sline"><div class="sb">${avatar(myName, S.me.color, 'l')}<b style="color:${S.me.color}">${s0}</b><span>${esc(myName)}</span></div><em>vs</em>
      <div class="sb">${avatar(oppName, oppColor, 'l')}<b style="color:${oppColor}">${showOpp ? s1 : '?'}</b><span>${esc(oppName)}</span></div></div>
    ${badgeHtml(newBadges)}
    <div class="card rounds"><div class="rr head"><span class="n"></span><span class="c" style="color:${S.me.color}">${esc(myName)}</span><span class="c" style="color:${oppColor}">${esc(oppName)}</span></div>${rows}</div>
    <div class="card lvls">${xpRow('me')}${xpRow('partner')}</div>
    ${actions}
    <details class="card"><summary style="cursor:pointer;font-weight:500">Review the answers</summary><div class="review" style="margin-top:10px">${m.log.map((l, i) => `<div class="rv">${i + 1}. ${esc(l.q)}<div class="a">✓ ${esc(l.a)}</div></div>`).join('')}</div></details>
  </div>`;
  go('results');
  requestAnimationFrame(() => setTimeout(() => $('results').querySelectorAll('.xpbar i[data-w]').forEach(i => i.style.width = i.dataset.w + '%'), 80));
  const winFx = (m.mode === 'duel' && r !== 'd') || r === 'w' || r === 'p';
  if (winFx){ SFX.win(); confetti(140, m.mode === 'duel' ? [r === 'w' ? S.me.color : S.partner.color, '#ffc53d', '#f2f4ff'] : undefined); buzz([30,50,30,50,80]); }
  else if (r === 'd'){ SFX.win(); } else { SFX.lose(); buzz([60]); }

  const myPack = {i: S.id, n: myName, c: S.me.color, lv: overallLevel('me'), p: m.log.map(l => [l.orig[0], Math.round(l.ms[0])]), s: s0};
  if ($('rAgain')) $('rAgain').onclick = () => m.mode === 'duel' ? startDuel(m.topic) : startSolo({kind:'bot', topic:m.topic});
  if ($('rShare')) $('rShare').onclick = async () => {
    let url, text;
    if (r === 'p'){
      url = linkFor('ch', m.topic, m.refs, myPack, null, m.date, m.T);
      text = `${myName} challenged you on Two Minds: ${T.name}. ${s0} points to beat!`;
      S.challenges.sent++; const nb = checkBadges(); save(); badgeToast(nb);
    } else {
      const ghostPack = {i: m.ghost.i, n: m.ghost.n, c: m.ghost.c, lv: m.ghost.lv, p: m.ghost.picks, s: s1};
      url = linkFor('res', m.topic, m.refs, ghostPack, myPack, m.date, m.T);
      text = `Two Minds result: ${myName} ${s0} vs ${m.ghost.n} ${s1} in ${T.name}`;
    }
    showLinkBox(url, text);
    const how = await shareLink(url, text);
    if (how === 'shared') toast('Sent!');
  };
  if ($('rBack')) $('rBack').onclick = () => startSolo({kind:'new', topic: m.topic === 'daily' ? 'mixed' : m.topic});
}
function showLinkBox(url, text){
  const box = $('lbox'); if (!box) return;
  box.hidden = false;
  box.innerHTML = `<input readonly value="${esc(url)}" id="lurl" aria-label="Challenge link"><div class="row"><button class="btn" type="button" id="lcopy">Copy link</button><a class="btn green" href="https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}" target="_blank" rel="noopener">WhatsApp</a></div>`;
  $('lcopy').onclick = async () => { try{ await navigator.clipboard.writeText(text + '\n' + url); toast('Link copied'); }catch(e){ const i = $('lurl'); i.select(); toast('Select and copy the link'); } };
}

/* ================= incoming links ================= */
function handleHash(){
  const h = location.hash;
  if (!h.startsWith('#c=')) return false;
  let p = null;
  try{ p = b64d(h.slice(3)); }catch(e){}
  history.replaceState(null, '', baseUrl());
  if (!validLink(p)){ toast('That link looks broken or is from an older version'); return false; }
  $('modal').hidden = true;
  const refs = unpackRefs(p.q), T = TOPICS[p.t] || TOPICS.mixed;
  const A = p.A, B = p.B;
  if (p.k === 'res' && B){
    // final scoreboard: A played first, B replied
    const meIsA = A.i ? A.i === S.id : A.n === nameOf('me'), mine = meIsA ? A : B, theirs = meIsA ? B : A;
    const r = mine.s > theirs.s ? 'w' : mine.s < theirs.s ? 'l' : 'd';
    const rows = refs.map((ref, i) => { const q = refQ(ref);
      const cell = pk => { const o = pk.p[i] || [-1]; return `<span class="c ${o[0] === 0 ? 'ok' : ''}">${o[0] === 0 ? '✓ ' + (o[1]/1000).toFixed(1) + 's' : o[0] === -1 ? 'too slow' : '✗'}</span>`; };
      return `<div class="rr"><span class="n">${i === ROUNDS - 1 ? 'Bonus' : 'R' + (i + 1)}</span>${cell(mine)}${cell(theirs)}</div>`; }).join('');
    $('incoming').innerHTML = `<div class="col"><p class="small" style="text-align:center">${T.ic} ${esc(T.name)} · Link challenge result</p>
      <h1 class="winner">${r === 'w' ? `${esc(mine.n)} wins!` : r === 'l' ? `${esc(theirs.n)} wins!` : "It's a draw!"}</h1>
      <div class="sline"><div class="sb">${avatar(mine.n, mine.c, 'l')}<b style="color:${mine.c}">${mine.s}</b><span>${esc(mine.n)}</span></div><em>vs</em><div class="sb">${avatar(theirs.n, theirs.c, 'l')}<b style="color:${theirs.c}">${theirs.s}</b><span>${esc(theirs.n)}</span></div></div>
      <div class="card rounds"><div class="rr head"><span class="n"></span><span class="c" style="color:${mine.c}">${esc(mine.n)}</span><span class="c" style="color:${theirs.c}">${esc(theirs.n)}</span></div>${rows}</div>
      <button class="cta" type="button" id="incRe">Rematch by link</button><button class="btn" type="button" data-go="home">Home</button></div>`;
    go('incoming');
    if (r === 'w') { confetti(120); SFX.win(); }
    const key = 'res:' + hash(h);
    if (meIsA && !S.history.some(x => x.key === key)){
      const pend = S.history.findIndex(x => x.r === 'p' && x.t === p.t && x.s[0] === mine.s);
      if (pend !== -1) S.history.splice(pend, 1);
      S.history.unshift({key, t: p.t, m:'Link', o: theirs.n, s:[mine.s, theirs.s], r, when: new Date().toLocaleDateString(undefined, {day:'numeric', month:'short'})});
      if (r === 'w'){ S.challenges.won++; } save();
    }
    $('incRe').onclick = () => startSolo({kind:'new', topic: p.t === 'daily' ? 'mixed' : p.t});
    return true;
  }
  // a challenge to play
  $('incoming').innerHTML = `<div class="col" style="min-height:70vh;align-content:center">
    <div style="display:grid;justify-items:center;gap:14px;text-align:center">
      ${avatar(A.n, A.c, 'l')}
      <h1 class="winner" style="font-size:30px">${esc(A.n)} challenged you!</h1>
      <span class="topic" style="padding:7px 14px;border-radius:999px;font-weight:700;font-size:13px;color:#10132a;background:${T.c}">${T.ic} ${esc(T.name)}</span>
      <p class="lede">Same 7 questions, ten seconds each. You'll see when ${esc(A.n)} answered, and their pick is revealed after yours. Score to beat: <b style="color:var(--gold)">${A.s}</b></p>
    </div>
    <div class="card stack"><div class="field">Your name<input id="incName" maxlength="14" autocomplete="off" value="${esc(S.me.name)}" placeholder="Type your name"></div>
      <div class="colors" id="incColors">${COLORS.map(c => `<button type="button" style="--c:${c}" data-c="${c}" aria-pressed="${S.me.color === c}" aria-label="Colour"></button>`).join('')}</div></div>
    <button class="cta" type="button" id="incGo">Accept challenge</button>
    <button class="btn" type="button" data-go="home">Not now</button></div>`;
  go('incoming');
  if (S.me.color === A.c){ S.me.color = COLORS.find(c => c !== A.c && c !== S.partner.color) || COLORS[1]; save(); $('incColors').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x.dataset.c === S.me.color)); }
  $('incColors').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; S.me.color = b.dataset.c; save(); $('incColors').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
  $('incGo').onclick = () => {
    const n = $('incName').value.trim(); if (!n){ toast('Type your name first'); $('incName').focus(); return; }
    S.me.name = n;
    if (!S.partner.name || S.partner.name === 'Partner') S.partner.name = A.n;
    save();
    startSolo({kind:'reply', topic: p.t, refs, ghost:{n:A.n, c:A.c, lv:A.lv, i:A.i, picks:A.p}, date:p.d, ms:p.ms});
  };
  return true;
}
addEventListener('hashchange', () => { if (location.hash.startsWith('#c=')){ M = null; $('duel').hidden = true; $('solo').hidden = true; handleHash(); } });

/* ================= couple corner ================= */
let C = null;
function renderCouple(){
  const pk = S.couple;
  $('couple').innerHTML = `<div class="col">
    <div class="top"><h1 class="logo" style="font-size:28px">Couple corner</h1></div>
    <p class="lede">Pass-the-phone games for the two of you. No timer, just honesty.</p>
    <button class="mode m-couple wide" type="button" id="cKnow" style="min-height:96px"><span class="mi">◎</span><div><b>How well do you know me?</b><span>One answers about themselves in secret, the other guesses. 10 questions.</span></div><span class="go">Play</span></button>
    <button class="mode m-daily wide" type="button" id="cLikely" style="min-height:96px"><span class="mi">≈</span><div><b>Who's more likely to…</b><span>You both vote in secret, then see if you agree. 10 prompts.</span></div><span class="go">Play</span></button>
    <button class="mode m-link wide" type="button" id="cUs" style="min-height:96px"><span class="mi">✎</span><div><b>Quiz about us</b><span>Write questions about your story and race to answer them.</span></div><span class="go">${S.us.length} Qs</span></button>
    <div class="statg"><div class="st">Best read<b>${pk.bestKnow}%</b></div><div class="st">Best sync<b>${pk.bestLikely}%</b></div><div class="st">Played<b>${pk.played}</b></div></div>
  </div>`;
  const need = fn => () => { if (!S.me.name || !S.partner.name){ askNames(fn); return; } fn(); };
  $('cKnow').onclick = need(() => startKnow());
  $('cLikely').onclick = need(() => startLikely());
  $('cUs').onclick = () => { topicSel = 'us'; go('topic'); };
}
function startKnow(){
  const pool = shuffle(QB.couple.know.slice()).slice(0, 10);
  C = {type:'know', items: pool.map((it, k) => ({...it, subject: k % 2, opts: shuffle(it.o.slice())})), i:0, score:[0,0], ans:[]};
  hideApp(); knowStep('cover');
}
function startLikely(){
  C = {type:'likely', items: shuffle(QB.couple.likely.slice()).slice(0, 10), i:0, agree:0, votes:[], log:[]};
  hideApp(); likelyStep('cover0');
}
const who = k => k ? 'partner' : 'me';
function cover(name, color, line, btn, then){
  const el = $('ccover'); el.style.setProperty('--c', color); el.hidden = false; $('cplay').hidden = true;
  el.innerHTML = `<div class="in">${avatar(name, color, 'l')}<h2>${esc(name)}'s turn</h2><p class="lede">${line}</p><button class="cta solid" style="--c:${color}" type="button" id="cvGo">${btn}</button><button class="btn" type="button" id="cvQuit" style="width:auto;padding:10px 16px">Quit game</button></div>`;
  $('cvGo').onclick = () => { SFX.tap(); el.hidden = true; then(); };
  $('cvQuit').onclick = () => { el.hidden = true; $('cplay').hidden = true; C = null; go('couple'); };
}
function cplay(html){ const el = $('cplay'); el._done = false; el.hidden = false; el.innerHTML = html; el.scrollTop = 0; return el; }
function knowStep(step){
  const it = C.items[C.i], subj = who(it.subject), guess = who(1 - it.subject);
  const sN = nameOf(subj), gN = nameOf(guess);
  const qText = `${esc(sN)}'s ${esc(it.q)}`;
  const counter = `${C.i + 1} / ${C.items.length}`;
  if (step === 'cover') return cover(sN, S[subj].color, `Answer honestly about yourself. Don't let ${esc(gN)} see.`, "I'm ready", () => knowStep('answer'));
  if (step === 'answer'){
    const el = cplay(`<div class="who" style="color:${S[subj].color}">${esc(sN)} answers · ${counter}</div><div class="qq">Your ${esc(it.q)}?</div><div class="olist">${it.opts.map((o, i) => `<button type="button" class="opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>`);
    el.querySelectorAll('.opt').forEach(b => b.onclick = () => { it.truth = +b.dataset.i; SFX.pick(); buzz(12); el.hidden = true; knowStep('cover2'); });
    return;
  }
  if (step === 'cover2') return cover(gN, S[guess].color, `Pass the phone to ${esc(gN)}. Guess what ${esc(sN)} picked.`, "Let me guess", () => knowStep('guess'));
  if (step === 'guess'){
    const el = cplay(`<div class="who" style="color:${S[guess].color}">${esc(gN)} guesses · ${counter}</div><div class="qq">${qText}?</div><div class="olist">${it.opts.map((o, i) => `<button type="button" class="opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>`);
    el.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      if (el._done) return; el._done = true;
      const g = +b.dataset.i, ok = g === it.truth;
      if (ok) C.score[1 - it.subject]++;
      C.ans.push(ok);
      el.querySelectorAll('.opt').forEach((x, i) => { if (i === it.truth) x.classList.add('right'); else if (i === g) x.classList.add('wrong'); else x.classList.add('dim'); });
      el.insertAdjacentHTML('beforeend', `<p class="lede" style="text-align:center;font-weight:700;color:${ok ? 'var(--good)' : 'var(--bad)'}">${ok ? `${esc(gN)} knows ${esc(sN)}!` : `Not quite. ${esc(sN)} picked "${esc(it.opts[it.truth])}"`}</p><button class="cta" type="button" id="kNext">${C.i + 1 < C.items.length ? 'Next question' : 'See results'}</button>`);
      ok ? (SFX.right(), confetti(40)) : SFX.wrong(); buzz(ok ? 20 : [20,30,20]);
      $('kNext').onclick = () => { C.i++; el.hidden = true; if (C.i < C.items.length) knowStep('cover'); else coupleResults(); };
    });
  }
}
function likelyStep(step){
  const p = C.items[C.i], counter = `${C.i + 1} / ${C.items.length}`;
  const voter = step === 'cover0' || step === 'vote0' ? 0 : 1, vN = nameOf(who(voter));
  if (step === 'cover0' || step === 'cover1') return cover(vN, S[who(voter)].color, `Vote in secret. ${esc(nameOf(who(1 - voter)))}, look away!`, 'Vote', () => likelyStep(voter ? 'vote1' : 'vote0'));
  if (step === 'vote0' || step === 'vote1'){
    const el = cplay(`<div class="who" style="color:${S[who(voter)].color}">${esc(vN)} votes · ${counter}</div><div class="qq">Who's more likely to ${esc(p)}?</div>
      <div class="vote">${[0,1].map(k => `<button type="button" data-v="${k}" style="border-color:${S[who(k)].color}">${avatar(nameOf(who(k)), S[who(k)].color, 'l')}<span>${esc(nameOf(who(k)))}</span></button>`).join('')}</div><div style="height:12px"></div>`);
    el.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { C.votes[voter] = +b.dataset.v; SFX.pick(); buzz(12); el.hidden = true; voter ? likelyStep('reveal') : likelyStep('cover1'); });
    return;
  }
  if (step === 'reveal'){
    const [a, b] = C.votes, same = a === b;
    if (same) C.agree++;
    C.log.push({p, a, b});
    const el = cplay(`<div class="who" style="color:var(--gold)">Reveal · ${counter}</div><div class="qq">Who's more likely to ${esc(p)}?</div>
      <div class="vote">${[0,1].map(k => { const v = C.votes[k]; return `<div style="border-radius:20px;padding:16px 8px;display:grid;justify-items:center;gap:8px;background:var(--bg2);border:2px solid ${S[who(v)].color}"><span class="small">${esc(nameOf(who(k)))} said</span>${avatar(nameOf(who(v)), S[who(v)].color, 'l')}<b>${esc(nameOf(who(v)))}</b></div>`; }).join('')}</div>
      <p class="lede" style="text-align:center;font-weight:700;color:${same ? 'var(--good)' : 'var(--gold)'}">${same ? `You agree, it's ${esc(nameOf(who(a)))}!` : 'You disagree! Time to argue it out.'}</p>
      <button class="cta" type="button" id="lNext">${C.i + 1 < C.items.length ? 'Next' : 'See results'}</button>`);
    same ? (SFX.right(), confetti(40)) : tone(300, 0.2, 'triangle', 0.06, 1.4);
    $('lNext').onclick = () => { C.i++; C.votes = []; el.hidden = true; if (C.i < C.items.length) likelyStep('cover0'); else coupleResults(); };
  }
}
function coupleResults(){
  $('cplay').hidden = true; $('ccover').hidden = true;
  const mN = nameOf('me'), pN = nameOf('partner');
  let pct, title, body;
  if (C.type === 'know'){
    const n = C.items.length / 2;
    pct = Math.round((C.score[0] + C.score[1]) / C.items.length * 100);
    S.couple.bestKnow = Math.max(S.couple.bestKnow, pct);
    title = pct >= 90 ? 'Basically one brain' : pct >= 70 ? 'Soulmate energy' : pct >= 50 ? 'Great team, still learning' : pct >= 30 ? 'Plenty left to discover' : 'Time for a long date night';
    body = `<div class="statg" style="grid-template-columns:1fr 1fr"><div class="st">${esc(mN)} knows ${esc(pN)}<b>${C.score[0]} / ${n}</b></div><div class="st">${esc(pN)} knows ${esc(mN)}<b>${C.score[1]} / ${n}</b></div></div>`;
  } else {
    pct = Math.round(C.agree / C.items.length * 100);
    S.couple.bestLikely = Math.max(S.couple.bestLikely, pct);
    title = pct >= 90 ? 'Same wavelength' : pct >= 70 ? 'In sync' : pct >= 50 ? 'Mostly on the same page' : 'Opposites attract';
    const tally = [0, 0]; C.log.forEach(l => { tally[l.a]++; tally[l.b]++; });
    body = `<div class="statg" style="grid-template-columns:1fr 1fr"><div class="st">Votes for ${esc(mN)}<b>${tally[0]}</b></div><div class="st">Votes for ${esc(pN)}<b>${tally[1]}</b></div></div>`;
  }
  S.couple.played++;
  const nb = checkBadges(); save();
  $('coupleRes').innerHTML = `<div class="col"><p class="small" style="text-align:center">${C.type === 'know' ? 'How well do you know me?' : "Who's more likely"}</p>
    <div class="big-pct">${pct}%</div><h1 class="winner" style="font-size:28px">${title}</h1>${body}${badgeHtml(nb)}
    <button class="cta" type="button" id="crAgain">Play again</button><button class="btn" type="button" data-go="couple">Couple corner</button></div>`;
  go('coupleRes');
  if (pct >= 50){ confetti(140, ['#ff8fa3','#c77dff','#ffc53d']); SFX.win(); }
  const t = C.type; C = null;
  $('crAgain').onclick = () => t === 'know' ? startKnow() : startLikely();
}

/* ================= us editor ================= */
function renderUs(){
  $('us').innerHTML = `<div class="col">
    <div class="top"><button class="btn" style="width:auto;padding:9px 12px" id="usBack">← Back</button><h1 class="logo" style="font-size:24px">Quiz about us</h1></div>
    <p class="lede">Write questions about your story. Put the real answer first, then three believable wrong ones. Play them as a duel, or send them to her as a link.</p>
    <form class="card stack" id="usForm" autocomplete="off">
      <div class="field">Question<input id="uq" maxlength="100" placeholder="Where did we have our first date?" required></div>
      <div class="field">Right answer<input id="ua" maxlength="40" placeholder="That little café near college" required style="border-color:rgba(61,220,132,.6)"></div>
      <div class="field">Wrong answers<input id="uw1" maxlength="40" placeholder="The movies" required><input id="uw2" maxlength="40" placeholder="A friend's party" required><input id="uw3" maxlength="40" placeholder="The beach" required></div>
      <button class="cta" type="submit">Add question</button>
    </form>
    <div class="h">Your questions · ${S.us.length}${S.us.length >= 3 ? '<button type="button" id="usPlay">Play these</button>' : ''}</div>
    <ul class="list">${S.us.length ? S.us.map((u, i) => `<li class="li"><div><div class="t1">${esc(u.q)}</div><div class="t2" style="color:var(--good)">✓ ${esc(u.a)}</div></div><button class="x" type="button" data-del="${i}">Delete</button></li>`).join('') : '<li class="li"><div class="t2">No questions yet. Add at least 3 to play.</div></li>'}</ul>
  </div>`;
  $('usBack').onclick = () => { topicSel = 'us'; go('topic'); };
  if ($('usPlay')) $('usPlay').onclick = () => { topicSel = 'us'; go('topic'); };
  $('usForm').onsubmit = e => {
    e.preventDefault();
    const v = id => $(id).value.trim(), item = {q: v('uq'), a: v('ua'), w: [v('uw1'), v('uw2'), v('uw3')]};
    if (!item.q || !item.a || item.w.some(x => !x)){ toast('Fill in the question and all four answers'); return; }
    if (new Set([item.a.toLowerCase(), ...item.w.map(x => x.toLowerCase())]).size < 4){ toast('All four answers need to be different'); return; }
    S.us.push(item); const nb = checkBadges(); save(); badgeToast(nb);
    SFX.right(); toast('Question added'); renderUs(); $('uq').focus();
  };
  $('us').querySelectorAll('[data-del]').forEach(b => b.onclick = () => { S.us.splice(+b.dataset.del, 1); save(); renderUs(); });
}

/* ================= profiles / me ================= */
function renderMe(){
  const st = S.stats.me, lm = overallLevel('me');
  const acc = st.answered ? Math.round(st.correct / st.answered * 100) : 0;
  const topTopics = TOPIC_IDS.map(id => ({id, L: topicLevel('me', id), xp: S.xp.me[id] || 0})).filter(x => x.xp > 0).sort((a, b) => b.xp - a.xp).slice(0, 5);
  const prof = whoK => `<div class="card stack"><div class="pp">${avatar(nameOf(whoK), S[whoK].color, 'l')}<div><div class="nm" style="font-size:18px">${esc(nameOf(whoK))}</div><div class="tt">Lv ${overallLevel(whoK)} · ${titleFor(overallLevel(whoK))}${whoK === 'me' ? ' · this phone' : ''}</div></div></div>
    <div class="field">${whoK === 'me' ? 'Your name' : 'Partner name'}<input data-name="${whoK}" maxlength="14" autocomplete="off" value="${esc(S[whoK].name)}" placeholder="${whoK === 'me' ? 'Your name' : 'Her name'}"></div>
    <div class="colors">${COLORS.map(c => `<button type="button" style="--c:${c}" data-col="${whoK}" data-c="${c}" aria-pressed="${S[whoK].color === c}" aria-label="Colour"></button>`).join('')}</div></div>`;
  $('me').innerHTML = `<div class="col">
    <div class="top"><h1 class="logo" style="font-size:28px">Profiles</h1></div>
    ${prof('me')}${prof('partner')}
    <div class="h">Your stats</div>
    <div class="statg"><div class="st">Played<b>${st.played}</b></div><div class="st">Won<b>${st.won}</b></div><div class="st">Accuracy<b>${acc}%</b></div><div class="st">Best streak<b>${st.best}</b></div><div class="st">Perfect<b>${st.perfect}</b></div><div class="st">Level<b>${lm}</b></div></div>
    ${topTopics.length ? `<div class="h">Top topics</div><div class="card lvls">${topTopics.map(x => { const T = TOPICS[x.id]; return `<div class="lvrow"><span class="av s" style="--c:${T.c}">${T.ic}</span><div><div class="meta"><b>${esc(T.name)}</b><span>Lv ${x.L.lv} · ${titleFor(x.L.lv, TOPIC_TITLES)}</span></div><div class="xpbar" style="--c:${T.c}"><i style="width:${Math.round(x.L.into / x.L.need * 100)}%"></i></div></div></div>`; }).join('')}</div>` : ''}
    <div class="h">Badges · ${S.badges.length}/${BADGES.length}</div>
    <div class="bgrid">${BADGES.map(b => `<div class="bd ${S.badges.includes(b[0]) ? 'on' : ''}"><span class="bi">${b[3]}</span><b>${esc(b[1])}</b>${esc(b[2])}</div>`).join('')}</div>
    <div class="h">Settings</div>
    <div class="card stack">
      <div class="small">Seating for duels on one phone</div>
      <div class="seg"><button type="button" data-set="seat" data-v="face" aria-pressed="${S.settings.seat === 'face'}">Face to face</button><button type="button" data-set="seat" data-v="side" aria-pressed="${S.settings.seat === 'side'}">Side by side</button></div>
      <div class="small">Answer time</div>
      <div class="seg"><button type="button" data-set="relaxed" data-v="0" aria-pressed="${!S.settings.relaxed}">10 seconds</button><button type="button" data-set="relaxed" data-v="1" aria-pressed="${S.settings.relaxed}">15 seconds</button></div>
      <div class="small">Practice bot</div>
      <div class="seg">${['Easy','Normal','Hard'].map((n, i) => `<button type="button" data-set="botLevel" data-v="${i}" aria-pressed="${S.settings.botLevel === i}">${n}</button>`).join('')}</div>
      <div class="seg"><button type="button" data-set="sound" data-v="t" aria-pressed="${S.settings.sound}">Sound ${S.settings.sound ? 'on' : 'off'}</button><button type="button" data-set="vib" data-v="t" aria-pressed="${S.settings.vib}">Vibration ${S.settings.vib ? 'on' : 'off'}</button></div>
    </div>
    <button class="btn" type="button" data-go="history">Match history</button>
    <button class="btn" type="button" id="resetBtn" style="color:var(--bad)">Reset all progress</button>
    <p class="small" style="text-align:center">Two Minds keeps everything on this phone. Inspired by the head-to-head trivia games we miss.</p>
  </div>`;
  $('me').querySelectorAll('[data-name]').forEach(i => i.onchange = () => {
    const k = i.dataset.name, other = k === 'me' ? 'partner' : 'me', v = i.value.trim();
    if (!v){ toast('Names can\'t be empty'); i.value = S[k].name; return; }
    if (S[other].name && v.toLowerCase() === S[other].name.toLowerCase()){ toast('Pick two different names'); i.value = S[k].name; return; }
    S[k].name = v; save(); renderMe();
  });
  $('me').querySelectorAll('[data-col]').forEach(b => b.onclick = () => { S[b.dataset.col].color = b.dataset.c; save(); SFX.tap(); renderMe(); });
  $('me').querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
    const k = b.dataset.set, v = b.dataset.v;
    if (k === 'seat') S.settings.seat = v; else if (k === 'relaxed') S.settings.relaxed = v === '1'; else if (k === 'botLevel') S.settings.botLevel = +v; else S.settings[k] = !S.settings[k];
    save(); SFX.tap(); renderMe(); $('me').scrollTop = $('me').scrollHeight;
  });
  const rb = $('resetBtn');
  rb.onclick = () => {
    if (!rb.dataset.arm){ rb.dataset.arm = '1'; rb.textContent = 'Tap again to erase everything'; setTimeout(() => { if (rb.isConnected){ delete rb.dataset.arm; rb.textContent = 'Reset all progress'; } }, 3000); return; }
    try{ localStorage.removeItem(KEY); }catch(e){} location.reload();
  };
}

/* ================= names prompt ================= */
function askNames(then){
  const md = $('modal'); md.hidden = false;
  md.innerHTML = `<div class="sheet"><h3>Who's playing?</h3><p class="small">Names show on the scoreboard. You can change them later in Profiles.</p>
    <div class="field">You (this phone)<input id="mdMe" maxlength="14" autocomplete="off" value="${esc(S.me.name)}" placeholder="Your name"></div>
    <div class="field">Your partner<input id="mdPa" maxlength="14" autocomplete="off" value="${esc(S.partner.name)}" placeholder="Her name"></div>
    <button class="cta" type="button" id="mdGo">Let's play</button><button class="btn" type="button" id="mdX">Cancel</button></div>`;
  $('mdGo').onclick = () => {
    const a = $('mdMe').value.trim(), b = $('mdPa').value.trim();
    if (!a || !b){ toast('Type both names'); return; }
    if (a.toLowerCase() === b.toLowerCase()){ toast('Pick two different names'); return; }
    S.me.name = a; S.partner.name = b; S.onboarded = true; save(); md.hidden = true; then && then();
  };
  $('mdX').onclick = () => { md.hidden = true; };
  setTimeout(() => (S.me.name ? $('mdPa') : $('mdMe')).focus(), 50);
}

/* ================= boot ================= */
document.addEventListener('visibilitychange', () => { if (document.hidden && M){ /* timers keep real time; nothing to pause in a live duel */ } });
if (!handleHash()){
  go('home');
  if (!S.me.name || !S.partner.name) setTimeout(() => askNames(null), 400);
}
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.__TM = {S, pickRefs, materialize, b64e, b64d, linkFor, validLink, TOPIC_IDS};
})();
