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
  ['gaming','Video Games','◆','#f15bb5','play'],
  ['emoji','Emoji Guess','☺','#ffd166','pop'], ['flags','Flags','⚑','#ff6b6b','world'],
  ['mythology','Mythology','✧','#f4a259','know'], ['books','Books','▤','#9ad1d4','know']
].filter(m => QB.topics[m[0]] && QB.topics[m[0]].length);
const TOPICS = {};
META.forEach(([id, name, ic, c, cat]) => TOPICS[id] = {id, name, ic, c, cat, q: QB.topics[id]});
TOPICS.mixed = {id:'mixed', name:'Mixed Bag', ic:'✳', c:'#f2f4ff', cat:'all', q:null};
TOPICS.us = {id:'us', name:'Us Two', ic:'❦', c:'#ffb3c1', cat:'all', q:null};
TOPICS.daily = {id:'daily', name:'Daily Duel', ic:'☀', c:'#ffc53d', cat:'all', q:null};
const TOPIC_IDS = META.map(m => m[0]);
const TOPIC_ICON = {gk:'bulb', brain:'puzzle', history:'hourglass', science:'flask', space:'rocket', animals:'paw', tech:'cpu', bollywood:'clapper', hollywood:'film', music:'music', love:'heart', geography:'globe', capitals:'flag', india:'landmark', food:'utensils', cricket:'cricket', sports:'trophy', gaming:'gamepad', mixed:'shuffle', us:'hearts', daily:'sun', emoji:'smile', flags:'flagw', mythology:'trident', books:'book'};
const CATS = [['all','All'],['know','Knowledge'],['pop','Pop culture'],['world','World'],['play','Sports & games']];
const COLORS = ['#ff6b5a','#38d6ff','#ffc53d','#3ddc84','#c77dff','#ff8fa3','#f4a259','#8f96ff'];
const TITLES = [[1,'Rookie'],[3,'Quizzer'],[6,'Brainiac'],[10,'Mastermind'],[15,'Genius'],[22,'Legend'],[30,'Grandmaster']];
const TOPIC_TITLES = [[1,'Novice'],[5,'Apprentice'],[10,'Expert'],[15,'Master'],[20,'Legend']];

/* ================= storage ================= */
const KEY = 'twominds.v2';
const blankStats = () => ({played:0, won:0, lost:0, draw:0, correct:0, answered:0, fast:0, perfect:0, streak:0, best:0, topics:{}});
let S = {
  me:{name:'', color: COLORS[(Math.random()*COLORS.length)|0]}, partner:{name:'', color:'#38d6ff'},
  xp:{me:{}, partner:{}}, stats:{me:blankStats(), partner:blankStats()},
  h2h:[0,0,0], history:[], used:{}, us:[], badges:[], fav:[], recent:[],
  daily:{}, settings:{sound:true, vib:true, relaxed:false, seat:'face', botLevel:1, theme:'velvet'},
  rivals:{}, sent:{}, played:{}, blocked:{}, outbox:[], code:'', friends:{}, reqIn:{}, reqOut:{}, inbox:[], ibSeen:[],
  streak:{cur:0, best:0, last:''}, week:{k:'', p:0, g:0}, fweek:{}, lastWeek:null, season:{k:'', p:0}, frames:[], frameOf:{},
  id: Math.random().toString(36).slice(2, 10), onboarded:false, couple:{bestKnow:0, bestLikely:0, played:0}, challenges:{sent:0, played:0, won:0}
};
function load(){
  try{
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d){
      S = Object.assign(S, d);
      S.stats.me = Object.assign(blankStats(), d.stats && d.stats.me);
      S.stats.partner = Object.assign(blankStats(), d.stats && d.stats.partner);
      S.settings = Object.assign({sound:true, vib:true, relaxed:false, seat:'face', botLevel:1, theme:'velvet'}, d.settings || {});
      S.rivals = d.rivals || {}; S.sent = d.sent || {}; S.played = d.played || {};
      S.streak = Object.assign({cur:0, best:0, last:''}, d.streak || {}); S.week = Object.assign({k:'', p:0, g:0}, d.week || {});
      S.fweek = d.fweek || {}; S.lastWeek = d.lastWeek || null; S.season = Object.assign({k:'', p:0}, d.season || {}); S.frames = d.frames || []; S.frameOf = d.frameOf || {};
      S.friends = d.friends || {}; S.reqIn = d.reqIn || {}; S.reqOut = d.reqOut || {}; S.inbox = d.inbox || []; S.ibSeen = d.ibSeen || [];
      if (!d.rivals && d.partner && d.partner.name && Array.isArray(d.h2h) && (d.h2h[0] + d.h2h[1] + d.h2h[2]) > 0)
        S.rivals['local:' + d.partner.name.trim().toLowerCase()] = {n: d.partner.name, c: d.partner.color || '#38d6ff', w: d.h2h[0], l: d.h2h[1], d: d.h2h[2], at: Date.now()};
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
let saveWarned = false;
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(S)); }
  catch(e){ prune(true); try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e2){ if (!saveWarned){ saveWarned = true; setTimeout(() => toast('Phone storage is full. Progress may not be saved', 3500), 50); } } }
}
// keep stored data small: old challenges, finished inbox items and stale lookups are dropped
function prune(hard){
  const now = Date.now(), keep = (hard ? 4 : 14) * 864e5;
  for (const map of [S.sent, S.played]) for (const k of Object.keys(map)) if (!map[k] || now - (map[k].at || 0) > keep) delete map[k];
  S.inbox = S.inbox.filter(it => it && now - (it.at || 0) < 7*864e5).slice(0, 30);
  const fk = Object.keys(S.frameOf); if (fk.length > 150) fk.slice(0, fk.length - 150).forEach(k => delete S.frameOf[k]);
  const rv = Object.entries(S.rivals).sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
  if (rv.length > 80) rv.slice(80).forEach(([k]) => delete S.rivals[k]);
  S.history = S.history.slice(0, hard ? 30 : 60);
  if (hard) S.used = {};
  S.recent = S.recent.filter(id => typeof id === 'string' && Object.prototype.hasOwnProperty.call(QB.topics, id) || id === 'mixed' || id === 'us');
  S.fav = S.fav.filter(id => typeof id === 'string' && Object.prototype.hasOwnProperty.call(QB.topics, id));
}
load();
try{ prune(false); }catch(e){}
S.outbox = Array.isArray(S.outbox) ? S.outbox : []; S.blocked = (S.blocked && typeof S.blocked === 'object') ? S.blocked : {};


/* ================= icons (hand-drawn line set, 24px grid) ================= */
const ICON = {
  home:'<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6.5H9V21H4.5a1 1 0 0 1-1-1z"/>',
  grid:'<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  heart:'<path d="M12 20.5s-7.5-4.6-9.3-9.4A4.9 4.9 0 0 1 12 6.3a4.9 4.9 0 0 1 9.3 4.8C19.5 15.9 12 20.5 12 20.5z"/>',
  hearts:'<path d="M9.5 19s-6-3.7-7.4-7.5A3.9 3.9 0 0 1 9.5 7.7a3.9 3.9 0 0 1 7.4 3.8"/><path d="M16.5 21s-4.4-2.7-5.4-5.5a2.9 2.9 0 0 1 5.4-2.3 2.9 2.9 0 0 1 5.4 2.3c-1 2.8-5.4 5.5-5.4 5.5z"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  swords:'<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6M16 16l4 4M19 21l2-2"/><path d="M9.5 6.5 13 3h3v3l-3.5 3.5"/><path d="m5 14 4 4M7 17l-3 3M3 19l2 2"/>',
  send:'<path d="M21.5 2.5 10.6 13.4"/><path d="M21.5 2.5 14.6 21.5l-4-8.1-8.1-4z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  chev:'<path d="m9 5 7 7-7 7"/>', back:'<path d="m15 5-7 7 7 7"/>',
  star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
  starf:'<path class="fill" d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
  bot:'<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13v1M15 13v1M9.5 17h5"/><circle cx="12" cy="3.5" r="1"/>',
  bulb:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
  puzzle:'<path d="M4 7h3.5a2 2 0 1 1 4 0H15v3.5a2 2 0 1 1 0 4V18h-3.5a2 2 0 1 0-4 0H4v-3.5a2 2 0 1 0 0-4z"/><path d="M15 10.5h1.5a2 2 0 1 1 0 4H15" opacity=".0"/>',
  hourglass:'<path d="M6 3h12M6 21h12"/><path d="M7 3c0 4 10 5 10 9s-10 5-10 9M17 3c0 4-10 5-10 9s10 5 10 9"/>',
  flask:'<path d="M9 3h6M10 3v6l-5.4 9.6A1.6 1.6 0 0 0 6 21h12a1.6 1.6 0 0 0 1.4-2.4L14 9V3"/><path d="M7.5 15h9"/>',
  rocket:'<path d="M12 2.5c3.2 2.2 5 5.9 5 10l-2 4H9l-2-4c0-4.1 1.8-7.8 5-10z"/><circle cx="12" cy="10" r="1.8"/><path d="M9 16.5 7 21l3-1.5M15 16.5l2 4.5-3-1.5"/>',
  paw:'<path d="M12 12.5c-3 0-5.5 3.2-5.5 5.4 0 1.5 1.3 2.1 2.6 2.1 1.2 0 1.8-.7 2.9-.7s1.7.7 2.9.7c1.3 0 2.6-.6 2.6-2.1 0-2.2-2.5-5.4-5.5-5.4z"/><ellipse cx="5.5" cy="10" rx="1.7" ry="2.2"/><ellipse cx="9.3" cy="5.8" rx="1.7" ry="2.2"/><ellipse cx="14.7" cy="5.8" rx="1.7" ry="2.2"/><ellipse cx="18.5" cy="10" rx="1.7" ry="2.2"/>',
  cpu:'<rect x="6" y="6" width="12" height="12" rx="2.5"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2.5v3.5M15 2.5v3.5M9 18v3.5M15 18v3.5M2.5 9h3.5M2.5 15h3.5M18 9h3.5M18 15h3.5"/>',
  clapper:'<path d="M3.5 10h17v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z"/><path d="m3.5 10 1.2-4.6a1.5 1.5 0 0 1 1.8-1.1l13 3.4-.6 2.3"/><path d="m8.5 5 1.5 4.5M13.5 6.3 15 10"/>',
  film:'<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M7.5 3.5v17M16.5 3.5v17M3.5 8h4M3.5 12h4M3.5 16h4M16.5 8h4M16.5 12h4M16.5 16h4"/>',
  music:'<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>',
  flag:'<path d="M5 21V4"/><path d="M5 4h12l-2.5 4.5L17 13H5"/>',
  landmark:'<path d="M3 21h18M5 21v-9M9.7 21v-9M14.3 21v-9M19 21v-9M2.5 10h19L12 3.5z"/>',
  utensils:'<path d="M6.5 2.5V11M4.5 2.5v5a2 2 0 0 0 4 0v-5M6.5 11v10.5"/><path d="M18 2.5c-2.2 1.1-3.5 4-3.5 7.5h3.5v11.5"/>',
  cricket:'<path d="m14.6 3.4 6 6-8.5 8.5a1.5 1.5 0 0 1-2.1 0L6.1 14a1.5 1.5 0 0 1 0-2.1z"/><path d="m7.5 16.5-4 4"/><circle cx="18" cy="18" r="2.4"/>',
  trophy:'<path d="M8 21h8M12 16.5V21"/><path d="M7 3.5h10V9a5 5 0 0 1-10 0z"/><path d="M7 5.5H4.5a3 3 0 0 0 3 4.4M17 5.5h2.5a3 3 0 0 1-3 4.4"/>',
  gamepad:'<path d="M7 7.5h10a4.5 4.5 0 0 1 4.4 5.5l-.8 3.4a2.4 2.4 0 0 1-4.1 1L14.6 15H9.4l-1.9 2.4a2.4 2.4 0 0 1-4.1-1L2.6 13A4.5 4.5 0 0 1 7 7.5z"/><path d="M8 10v3M6.5 11.5h3"/><circle cx="15.5" cy="10.5" r=".8" class="fill"/><circle cx="17.5" cy="12.5" r=".8" class="fill"/>',
  shuffle:'<path d="M16 3.5h4.5V8M3.5 20 20.5 3.5M20.5 16v4.5H16M14.5 14.5l6 6M3.5 4l5 5"/>',
  flame:'<path d="M12 21.5a7 7 0 0 0 7-7c0-4-3-6.3-4.2-10-2 2-3 4-3 6-1-.8-2-2.2-2.3-4C6.5 9 5 11.5 5 14.5a7 7 0 0 0 7 7z"/>',
  crown:'<path d="M3 18.5h18M4 8l4 3.5 4-6.5 4 6.5L20 8l-1.5 10.5h-13z"/>',
  check:'<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.7 2.7L16 9.5"/>',
  zap:'<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>',
  undo:'<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5"/>',
  scale:'<path d="M12 3.5v17M6.5 20.5h11M4.5 7h15"/><path d="m4.5 7-2.5 6a2.8 2.8 0 0 0 5 0zM19.5 7 17 13a2.8 2.8 0 0 0 5 0z"/>',
  compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  award:'<circle cx="12" cy="9" r="5.5"/><path d="m8.6 13.4-1.6 7.6 5-2.6 5 2.6-1.6-7.6"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  pen:'<path d="M4 20h4.5L19.6 8.9a2.1 2.1 0 0 0-3-3L5.5 17v3z"/><path d="m14.5 8 2.5 2.5"/>',
  eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  waves:'<path d="M2.5 9c2.4-2.4 4.4 2.4 6.8 0s4.4 2.4 6.8 0 4-2 5.4 0M2.5 15c2.4-2.4 4.4 2.4 6.8 0s4.4 2.4 6.8 0 4-2 5.4 0"/>',
  repeat:'<path d="M17 2.5 20.5 6 17 9.5"/><path d="M3.5 11V9.5A3.5 3.5 0 0 1 7 6h13.5M7 21.5 3.5 18 7 14.5"/><path d="M20.5 13v1.5A3.5 3.5 0 0 1 17 18H3.5"/>',
  moon:'<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a6.6 6.6 0 0 0 11 11z"/>',
  timer:'<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V10M9.5 2.5h5M19 6l1.5-1.5"/>',
  hundred:'<path d="M4 8.5 6 7v10M10.5 7h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM18 7h.5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/>',
  link:'<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  copy:'<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6A2.5 2.5 0 0 0 13 3.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14.5a5 5 0 0 0 8 0"/><circle cx="9" cy="10" r=".9" class="fill"/><circle cx="15" cy="10" r=".9" class="fill"/>',
  flagw:'<path d="M5 21V4"/><path d="M5 5c3-2 6 2 9 0s4-1 5 0v8c-1-1-2-2-5 0s-6-2-9 0"/>',
  trident:'<path d="M12 21V6M7 4v4a5 5 0 0 0 10 0V4M12 3v3M9.5 17h5"/>',
  book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  chat:'<path d="M20.5 12a8 8 0 0 1-11.6 7.2L3.5 20.5l1.3-4.9A8 8 0 1 1 20.5 12z"/>',
  medal:'<circle cx="12" cy="15" r="6"/><path d="M8.5 9.8 6 3h4l2 4.5L14 3h4l-2.5 6.8"/><path d="m12 12.5.9 1.9 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 20a6.5 6.5 0 0 0-3-5.5"/>',
  useradd:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/>',
  inbox:'<path d="M3.5 13.5 6 5h12l2.5 8.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z"/><path d="M3.5 13.5H8l1.5 2.5h5l1.5-2.5h4.5"/>', x:'<path d="M6 6l12 12M18 6 6 18"/>', history:'<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5M12 7.5V12l3 2"/>'
};
function icon(name, cls = ''){ return `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[name] || ICON.star}</svg>`; }
Object.values(TOPICS).forEach(T => T.ic = icon(TOPIC_ICON[T.id] || 'star'));

/* ================= small utils ================= */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function shuffle(a, rnd = Math.random){ for (let i = a.length - 1; i > 0; i--){ const j = (rnd()*(i+1))|0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
function hash(s){ let h = 2166136261; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed){ let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// the Daily Duel day is the same for everyone in the world (UTC), so friends in other time zones get the same questions
function today(){ return new Date().toISOString().slice(0, 10); }
const RESERVED = k => k in Object.prototype;          // 'constructor', '__proto__' … must never become map keys
const own = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
const topicOk = t => typeof t === 'string' && own(TOPICS, t);
const nameOf = who => (S[who].name || (who === 'me' ? 'You' : 'Partner')).trim();
const initial = n => (Array.from(String(n).trim())[0] || '?').toUpperCase();
const safeColor = c => (typeof c === 'string' && /^#[0-9a-f]{3,8}$/i.test(c)) ? c : '#9aa3d1';
const FRAME_IDS = ['bronze','silver','gold','plat','diamond','flame'];
const validFrame = f => f === undefined || f === '' || FRAME_IDS.includes(f);
function myFrame(){ return S.me.frame && S.frames.includes(S.me.frame) ? S.me.frame : ''; }
function frameFor(name, color){
  if (name === nameOf('me') && color === S.me.color) return myFrame();
  return S.frameOf[String(name).trim().toLowerCase()] || '';
}
function learnFrame(x){ if (x && typeof x.n === 'string' && validFrame(x.f)){ const k = x.n.trim().toLowerCase(); if (x.f) S.frameOf[k] = x.f; else delete S.frameOf[k]; } }
function avatar(name, color, cls = '', letter){ const f = letter === '?' ? '' : frameFor(name, color); return `<span class="av ${cls} ${f ? 'fr fr-' + f : ''}" style="--c:${safeColor(color)}">${esc(letter || initial(name))}</span>`; }
const randId = (len = 12) => Array.from(crypto.getRandomValues(new Uint8Array(len)), b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
const whenStr = () => new Date().toLocaleDateString(undefined, {day:'numeric', month:'short'}) + ' ' + new Date().toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit'});
if (!/^[a-z0-9]{6}$/.test(S.code || '')){ S.code = randId(6); save(); }
const fmtCode = c => String(c).toUpperCase().replace(/^(...)(...)$/, '$1 $2');
const normCode = c => String(c || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function rivalKey(name, id){ return id ? 'id:' + id : 'local:' + String(name).trim().toLowerCase(); }
function recordVs(key, n, c, res){
  // one person, one record: a same-name duel on this phone ('local:') belongs to the online player with that name.
  // Two different online players ('id:') are never merged, even if they share a name.
  const low = String(n).trim().toLowerCase(), isId = key.startsWith('id:');
  const twins = Object.keys(S.rivals).filter(k => k !== key && (isId ? k.startsWith('local:') : k.startsWith('id:')) && S.rivals[k].n.trim().toLowerCase() === low);
  if (twins.length === 1){
    const twin = twins[0], keepId = isId ? key : twin, other = isId ? twin : key;
    const a = S.rivals[keepId] || {n, c, w:0, l:0, d:0, at:0}, b = S.rivals[other];
    if (b){ a.w += b.w; a.l += b.l; a.d += b.d; delete S.rivals[other]; }
    S.rivals[keepId] = a; key = keepId;
  }
  const r = S.rivals[key] || (S.rivals[key] = {n, c: safeColor(c), w:0, l:0, d:0, at:0});
  r.n = n; r.c = safeColor(c); r.at = Date.now();
  if (res === 'w') r.w++; else if (res === 'l') r.l++; else if (res === 'd') r.d++;
}
function rivalsList(){ return Object.entries(S.rivals).map(([k, v]) => Object.assign({k}, v)).sort((a, b) => b.at - a.at); }
function freeColor(avoid){ return COLORS.find(c => !avoid.includes(c)) || COLORS[1]; }
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
function linkFor(kind, topic, refs, A, B, date, ms, cid){
  const payload = {v:2, k:kind, t:topic, q:packRefs(refs), A, ms: (M && M.T) || (S.settings.relaxed ? 15000 : 10000)};
  if (cid) payload.x = cid;
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
  if (x.i !== undefined && !(typeof x.i === 'string' && /^[a-z0-9]{1,16}$/.test(x.i) && !RESERVED(x.i))) return false;
  if (!validFrame(x.f)) return false;
  return validPicks(x.p);
}
const validPicks = p => Array.isArray(p) && p.length === ROUNDS && p.every(k => Array.isArray(k) && Number.isInteger(k[0]) && k[0] >= -1 && k[0] <= 3 && Number.isFinite(k[1]) && k[1] >= 0 && k[1] <= 20000);
// packed question refs: [topicIndex, questionIndex] or {c:[q, right, wrong x3]} for custom "Us" questions
function validRefs(q, allowCustom = true){
  if (!Array.isArray(q) || q.length !== ROUNDS) return false;
  return q.every(x => {
    if (Array.isArray(x)) return x.length === 2 && Number.isInteger(x[0]) && Number.isInteger(x[1]) && x[0] >= 0 && x[0] < TOPIC_IDS.length && x[1] >= 0 && Array.isArray(QB.topics[TOPIC_IDS[x[0]]][x[1]]);
    return allowCustom && x && Array.isArray(x.c) && x.c.length === 5 && x.c.every(s => typeof s === 'string' && s.trim() && s.length <= 120) && new Set(x.c.slice(1).map(s => s.trim().toLowerCase())).size === 4;
  });
}
// the score is always worked out from the answers, never taken from the message
function ptsFor(leftMs, T, bonus){ const base = clamp(10 + Math.ceil(leftMs / T * 10), 11, 20); return bonus ? base*2 : base; }
function scoreOf(picks, T){ return picks.reduce((a, k, r) => a + (k[0] === 0 ? ptsFor(Math.max(0, T - k[1]), T, r === ROUNDS - 1) : 0), 0); }
function validLink(p){
  if (!p || typeof p !== 'object' || p.v !== 2 || !validRefs(p.q) || !validPlayer(p.A)) return false;
  if (p.k !== 'ch' && p.k !== 'res') return false;
  if (p.B !== undefined && !validPlayer(p.B)) return false;
  if (!topicOk(p.t)) return false;
  if (p.ms !== undefined && p.ms !== 10000 && p.ms !== 15000) return false;
  if (p.d !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(p.d))) return false;
  if (p.x !== undefined && !validCid(p.x)) return false;
  const T = p.ms || 10000;
  p.A.s = scoreOf(p.A.p, T); if (p.B) p.B.s = scoreOf(p.B.p, T);
  return true;
}
function validLiveLink(p){
  return !!(p && typeof p === 'object' && p.v === 2 && p.k === 'live' && validCid(p.r) && topicOk(p.t) && validRefs(p.q) && validMini(p.h) && (p.ms === 10000 || p.ms === 15000));
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

/* ================= relay: results travel back automatically ================= */
// A tiny public message relay (ntfy.sh). Each challenge has a random topic; players post their score,
// the challenger's phone polls for new scores. Messages stay on the relay for about 12 hours.
const RELAY = 'https://ntfy.sh/';
const relayTopic = cid => 'twominds-' + cid;
const validCid = x => typeof x === 'string' && /^[a-z0-9]{8,24}$/.test(x) && !RESERVED(x);
async function postTopic(topic, obj){
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 9000);
  try{
    const r = await fetch(RELAY + topic, {method:'POST', body: JSON.stringify(obj), signal: ctl.signal});
    if (!r.ok) throw new Error('relay ' + r.status);
    try{ return await r.json(); }catch(e){ return {}; }       // the relay answers with the stored message (id, time)
  }
  finally{ clearTimeout(t); }
}
const relayPost = (cid, obj) => postTopic(relayTopic(cid), obj);
// one request reads many topics at once (the relay accepts a comma-separated list)
async function pollTopics(topics, since = 'all'){
  if (!topics.length) return [];
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 9000);
  try{
    const r = await fetch(RELAY + topics.join(',') + '/json?poll=1&since=' + encodeURIComponent(since), {cache:'no-store', signal: ctl.signal});
    if (!r.ok) throw new Error('relay ' + r.status);
    const out = [];
    for (const line of (await r.text()).split('\n')){
      if (!line.trim()) continue;
      let m; try{ m = JSON.parse(line); }catch(e){ continue; }
      if (!m || m.event !== 'message' || typeof m.message !== 'string') continue;
      let x; try{ x = JSON.parse(m.message); }catch(e){ continue; }
      if (x && typeof x === 'object') out.push({topic: m.topic || topics[0], id: m.id, time: m.time, x});
    }
    return out;
  } finally{ clearTimeout(t); }
}
async function relayPoll(cid){ return (await pollTopics([relayTopic(cid)])).map(m => m.x).filter(x => validPlayer(x) && x.i); }
// a score for a challenge I sent; returns true when it is new. Used by the relay and by result links alike.
function applyResult(cid, x){
  const st = S.sent[cid]; if (!st || !validPlayer(x) || !x.i || x.i === S.id) return null;
  st.res = st.res || {};
  if (own(st.res, x.i)) return null;
  x.s = scoreOf(x.p, st.ms || 10000);
  learnFrame(x);
  st.res[x.i] = {n:x.n, c:x.c, s:x.s, p:x.p};
  const r = st.s > x.s ? 'w' : st.s < x.s ? 'l' : 'd';
  recordVs('id:' + x.i, x.n, x.c, r);
  S.history = S.history.filter(h => h.key !== 'pend:' + cid);
  S.history.unshift({key:'rl:' + cid + x.i, cid, t: st.t, m:'Link', o: x.n, s:[st.s, x.s], r, when: whenStr()});
  S.history = S.history.slice(0, 60);
  if (r === 'w') S.challenges.won++;
  return {cid, st, x, r};
}
let syncing = false, syncN = 0;
async function syncChallenges(force){
  if (syncing || M || (navigator.onLine === false)) return;
  syncing = true; syncN++;
  const now = Date.now(), fresh = [];
  try{
    // fresh challenges every time, older ones (results can still trickle in for a day and a half) every 4th time
    const cids = Object.entries(S.sent).filter(([cid, st]) => st.shared && now - st.at < 36*3600e3 && (force || now - st.at < 3*3600e3 || syncN % 4 === 0))
      .sort((a, b) => b[1].at - a[1].at).slice(0, 20).map(([cid]) => cid);
    if (cids.length){
      let msgs = []; try{ msgs = await pollTopics(cids.map(relayTopic)); }catch(e){}
      for (const m of msgs){ const cid = String(m.topic).replace(/^twominds-/, ''); if (cids.includes(cid)){ const f = applyResult(cid, m.x); if (f) fresh.push(f); } }
    }
    // retry any score of mine that failed to send earlier, and friend replies that could not be delivered
    for (const [cid, pl] of Object.entries(S.played)){
      if (pl.sent || !pl.pack || now - pl.at > 24*3600e3) continue;
      try{ await relayPost(cid, pl.pack); pl.sent = true; save(); }catch(e){}
    }
    await flushOutbox();
  } finally{ syncing = false; }
  if (!fresh.length) return;
  const nb = checkBadges(); save();
  fresh.forEach((f, k) => setTimeout(() => {
    const T = TOPICS[f.st.t] || TOPICS.mixed;
    toast(`${f.x.n} played your ${T.name} challenge · ${f.r === 'w' ? 'you won' : f.r === 'l' ? f.x.n + ' won' : 'draw'} ${f.st.s}–${f.x.s}`, 3200);
    f.r === 'w' ? SFX.win() : SFX.badge(); buzz([20, 40, 20]);
  }, k*3400));
  badgeToast(nb);
  if (current === 'home' || current === 'board') go(current, {keepScroll:true, cid: boardCid});
  if (current === 'results' && results_ctx && results_ctx.board) results_ctx.board();
}
setInterval(() => { if (!document.hidden) syncChallenges(); }, 25000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncChallenges(); });
addEventListener('online', () => { syncChallenges(true); inboxOpen(); });
// friend replies (accept / decline / cancel / remove) wait here until the relay takes them
async function flushOutbox(){
  if (!S.outbox.length) return;
  const keep = [];
  for (const o of S.outbox){
    if (Date.now() - o.at > 3*864e5) continue;
    try{ await sendTo(o.code, o.msg); }catch(e){ keep.push(o); }
  }
  S.outbox = keep; save();
}
function sendSure(code, msg){ return sendTo(code, msg).catch(() => { S.outbox.push({code, msg, at: Date.now()}); save(); throw new Error('queued'); }); }

/* ================= friends + inbox ================= */
// Every phone has a private inbox topic on the relay, named by its friend code.
// Friend requests, challenges and live invites are small messages posted to the other person's inbox.
const inboxTopic = code => 'twominds-u-' + code;
const IB = {es:null};
const validCode = c => typeof c === 'string' && /^[a-z0-9]{6}$/.test(c);
const meCard_ = () => ({i: S.id, n: nameOf('me'), c: S.me.color, code: S.code, f: myFrame() || undefined});
function sendTo(code, obj){ return postTopic(inboxTopic(code), Object.assign(meCard_(), obj)); }
function isFriend(i){ return own(S.friends, i); }
const friendOf = i => own(S.friends, i) ? S.friends[i] : null;
function friendList(){ return Object.values(S.friends).sort((a, b) => (b.at || 0) - (a.at || 0)); }
function touchFriend(x){ const f = friendOf(x.i); if (f){ f.n = x.n; f.c = safeColor(x.c); f.code = x.code; } }
// an EventSource that the browser gave up on (relay restart, network switch) is reopened with a growing delay
function reviveLater(key, fn){ const st = reviveLater[key] = reviveLater[key] || {n:0, t:0}; clearTimeout(st.t); st.n = Math.min(st.n + 1, 6); st.t = setTimeout(fn, 1000 * Math.pow(2, st.n)); }
const reviveOk = key => { if (reviveLater[key]) reviveLater[key].n = 0; };
function inboxOpen(){
  if (IB.es || !S.me.name) return;
  try{
    const es = new EventSource(RELAY + inboxTopic(S.code) + '/sse?since=all');
    IB.es = es;
    es.onopen = () => reviveOk('ib');
    es.onerror = () => { if (IB.es === es && es.readyState === 2){ IB.es = null; reviveLater('ib', inboxOpen); } };
    es.onmessage = ev => {
      if (IB.es !== es) return;
      let m; try{ m = JSON.parse(ev.data); }catch(e){ return; }
      if (!m || m.event !== 'message' || typeof m.message !== 'string' || S.ibSeen.includes(m.id)) return;
      S.ibSeen.push(m.id); if (S.ibSeen.length > 400) S.ibSeen = S.ibSeen.slice(-300);
      let x; try{ x = JSON.parse(m.message); }catch(e){ save(); return; }
      try{ onInbox(x, (m.time || Date.now()/1000) * 1000); }catch(e){}
      save();
    };
  }catch(e){}
}
function inboxClose(){ if (IB.es) IB.es.close(); IB.es = null; }
document.addEventListener('visibilitychange', () => { if (!document.hidden) inboxOpen(); });
function refreshSocial(){ if (['home','friends'].includes(current)) go(current, {keepScroll:true}); updateFriendDot(); }
function updateFriendDot(){ const t = document.querySelector('.tab[data-go="friends"]'); if (t) t.classList.toggle('has-note', Object.keys(S.reqIn).length > 0 || pendingInbox().length > 0); }
function pendingInbox(){ const now = Date.now(); return S.inbox.filter(it => !it.done && (it.k !== 'lv' || now - it.at < 15*60e3) && (it.k !== 'ch' || !S.played[it.cid])); }

function onInbox(x, at){
  if (!x || typeof x !== 'object' || x.i === S.id || !validMini(x) || !validCode(x.code)) return;
  learnFrame(x);
  const known = isFriend(x.i);
  if (own(S.blocked, x.i)) return;        // removed friends can't send requests again
  if (x.type === 'freq'){                       // someone asks to be friends
    if (known){ touchFriend(x); sendSure(x.code, {type:'facc'}).catch(() => {}); return; }
    if (own(S.reqOut, x.code)){ acceptFriend(x); return; }   // we both asked: just become friends
    S.reqIn[x.i] = {i: x.i, n: x.n, c: safeColor(x.c), code: x.code, at};
    toast(`${x.n} sent you a friend request`); SFX.badge(); buzz([20, 40, 20]); refreshSocial();
    return;
  }
  if (x.type === 'facc'){                       // they accepted my request
    if (!own(S.reqOut, x.code) && !known) return;
    delete S.reqOut[x.code];
    S.friends[x.i] = {i: x.i, n: x.n, c: safeColor(x.c), code: x.code, at: Date.now()};
    if (!known){ toast(`${x.n} accepted your friend request`); SFX.right(); }
    refreshSocial(); return;
  }
  if (x.type === 'fdec'){ delete S.reqOut[x.code]; refreshSocial(); return; }
  if (x.type === 'fcancel'){ if (own(S.reqIn, x.i)){ delete S.reqIn[x.i]; refreshSocial(); } return; }
  if (x.type === 'funf'){ if (known){ delete S.friends[x.i]; delete S.fweek[x.i]; refreshSocial(); } return; }
  if (!known) return;                           // challenges only from friends
  touchFriend(x);
  if (x.type === 'wk'){ takeWeek(x.i, x); return; }
  if (x.type === 'ch' || x.type === 'lv'){
    if (typeof x.link !== 'string' || x.link.length > 6000) return;
    const pre = x.type === 'ch' ? 'c=' : 'L=';
    if (!x.link.startsWith(pre)) return;
    let p; try{ p = b64d(x.link.slice(2)); }catch(e){ return; }
    if (x.type === 'ch' ? !(validLink(p) && p.k === 'ch') : !validLiveLink(p)) return;    // same checks as opening the link
    const T = TOPICS[p.t];
    const item = {id: randId(8), k: x.type, from: x.i, n: x.n, c: safeColor(x.c), t: p.t, s: p.A ? p.A.s : null, cid: p.x || null, link: x.link, at};
    S.inbox = [item, ...S.inbox.filter(it => !(it.k === 'lv' && it.from === x.i))].slice(0, 30);
    if (x.type === 'lv' && Date.now() - at < 10*60e3){
      if (!M && current !== 'lobby') liveInvitePopup(item);
      else toast(`${x.n} wants to play live. It's waiting on Home`, 3200);    // never interrupt a match or a search
    }
    else if (x.type === 'ch'){ toast(`${x.n} challenged you: ${T.name}`); SFX.badge(); buzz([20, 40, 20]); }
    refreshSocial();
  }
}
function takeWeek(i, x){
  if (!(typeof x.k === 'string' && /^w\d{4}-\d{2}-\d{2}$/.test(x.k) && Number.isInteger(x.p) && x.p >= 0 && x.p < 1e6 && Number.isInteger(x.g) && x.g >= 0 && x.g < 1e4)) return false;
  const cur = own(S.fweek, i) ? S.fweek[i] : null;
  if (cur && cur.k === x.k && x.p < cur.p) return false;
  S.fweek[i] = {k: x.k, p: x.p, g: x.g};
  if (current === 'friends' && !document.activeElement.matches('input')) go('friends', {keepScroll:true});
  return true;
}
function acceptFriend(r){
  S.friends[r.i] = {i: r.i, n: r.n, c: safeColor(r.c), code: r.code, at: Date.now()};
  delete S.reqIn[r.i]; delete S.reqOut[r.code]; save();
  sendSure(r.code, {type:'facc'}).catch(() => toast('Accepted. They will see it as soon as you are back online'));
  toast(`You and ${r.n} are friends now`); SFX.right(); refreshSocial();
}
function declineFriend(r){ delete S.reqIn[r.i]; save(); sendSure(r.code, {type:'fdec'}).catch(() => {}); refreshSocial(); }
function removeFriend(f){
  delete S.friends[f.i]; delete S.fweek[f.i];
  S.blocked[f.i] = f.code;
  S.inbox = S.inbox.filter(it => it.from !== f.i); save();
  sendSure(f.code, {type:'funf'}).catch(() => {});
  toast(`${f.n} removed from friends`); refreshSocial();
}
async function requestFriend(code, nameHint){
  code = normCode(code);
  if (!validCode(code)){ toast('Friend codes have 6 letters and numbers'); return false; }
  if (code === S.code){ toast("That's your own code"); return false; }
  for (const k of Object.keys(S.blocked)) if (S.blocked[k] === code) delete S.blocked[k];     // adding someone again lifts the removal
  if (friendList().some(f => f.code === code)){ toast('You are already friends'); return false; }
  const back = Object.values(S.reqIn).find(r => r.code === code);
  if (back){ acceptFriend(back); return true; }
  try{ await sendTo(code, {type:'freq'}); }
  catch(e){ toast("Couldn't send the request. Check your internet"); return false; }
  S.reqOut[code] = {code, n: nameHint || '', at: Date.now()}; save();
  toast('Friend request sent'); SFX.right(); refreshSocial();
  return true;
}
function openInboxItem(it){
  it.done = true; save();
  if (MM.active) mmStop(true);
  location.hash = '#' + it.link;
}
function liveInvitePopup(it){
  const T = TOPICS[it.t] || TOPICS.mixed, md = $('modal'); md.hidden = false;
  md.innerHTML = `<div class="sheet invite"><span class="grab"></span>
    <div class="lobby-vs"><div class="sb">${avatar(it.n, it.c, 'l')}<span class="nm2">${esc(it.n)}</span></div><div class="pulse live"><i></i><i></i><i></i></div><div class="sb">${avatar(nameOf('me'), S.me.color, 'l')}<span class="nm2">You</span></div></div>
    <h3 style="text-align:center">${esc(it.n)} wants to play live</h3>
    <div style="display:flex;justify-content:center"><span class="pill" style="--c:${T.c}">${icon(TOPIC_ICON[T.id] || 'star','sm')}${esc(T.name)}</span></div>
    <button class="cta" type="button" id="ivGo">${icon('zap','sm')}Join now</button><button class="btn ghost" type="button" id="ivNo">Not now</button></div>`;
  SFX.vs(); buzz([30, 60, 30, 60]);
  $('ivGo').onclick = () => { md.hidden = true; autoJoin = true; openInboxItem(it); };
  $('ivNo').onclick = () => { md.hidden = true; refreshSocial(); };
}
let autoJoin = false;
// a live invite that came in during a match is offered once the match is over
function flushQueued(){
  const it = pendingInbox().find(x => x.k === 'lv' && !x.popped && Date.now() - x.at < 10*60e3);
  if (!it || M || current === 'lobby') return;
  it.popped = true; save();
  if (current === 'results') toast(`${it.n} is waiting to play live. Join from Home`, 3500);
  else liveInvitePopup(it);
}

/* ================= router ================= */
const APP_SCREENS = ['welcome','home','topics','topic','couple','me','us','results','incoming','coupleRes','history','board','lobby','friends'];
let boardCid = null;
let current = 'home', topicSel = 'gk';
function go(id, opts = {}){
  // leaving a search or a waiting room by any route closes it, so it can't pull you into a match later
  if (id !== 'lobby' && MM.active) mmStop(true);
  if (LV.room && !LV.started && id !== 'lobby' && id !== 'incoming') liveBye();
  current = id;
  if (id !== 'results' && id !== 'coupleRes' && id !== 'incoming'){ parts = []; }
  for (const s of APP_SCREENS) $(s).hidden = s !== id;
  const tabbed = ['home','topics','topic','couple','me','friends'].includes(id);
  $('tabbar').hidden = !tabbed;
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-current', t.dataset.go === id || (id === 'topic' && t.dataset.go === 'topics') ? 'page' : 'false'));
  ({friends:renderFriends, welcome:renderWelcome, home:renderHome, topics:renderTopics, topic:renderTopic, couple:renderCouple, me:renderMe, us:renderUs, history:renderHistory, board:renderBoard}[id] || (() => {}))(opts);
  const el = $(id);
  if (el && !opts.keepScroll){ el.scrollTop = 0; el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-go]'); if (t){ SFX.tap(); if (t.classList.contains('tab')){ topicIntent = null; withFriend = null; } go(t.dataset.go); return; }
  const tp = e.target.closest('[data-topic]'); if (tp){ SFX.tap(); topicSel = tp.dataset.topic; go('topic'); return; }
  const bd = e.target.closest('[data-board]'); if (bd){ SFX.tap(); go('board', {cid: bd.dataset.board}); return; }
});

/* ================= home ================= */
function meCard(){
  rollPeriods();
  const xp = totalXp('me') / 3, L = levelOf(xp), lv = L.lv;
  const rv = rivalsList().slice(0, 8);
  return `<div class="mecard" style="--c:${S.me.color}">
    <button type="button" class="mehead" data-go="me"><span class="ring-av" style="--pct:${Math.round(L.into / L.need * 100)}">${avatar(nameOf('me'), S.me.color, 'l')}<span class="lvb">${lv}</span></span><div><div class="hi">Hi, ${esc(nameOf('me'))}</div><div class="lv"><b>${titleFor(lv)}</b> · ${L.need - Math.round(L.into)} XP to level ${lv + 1}</div><div class="xpbar" style="--c:${S.me.color}"><i style="width:${Math.round(L.into / L.need * 100)}%"></i></div></div></button>
    <div class="chips">
      <span class="chipx ${S.streak.last === dayKey() ? 'hot' : ''}">${icon('flame','sm')}${S.streak.cur && (S.streak.last === dayKey() || S.streak.last === (() => { const y = new Date(); y.setDate(y.getDate() - 1); return dayKey(y); })()) ? `${S.streak.cur}-day streak${S.streak.last === dayKey() ? '' : ' · play today'}` : 'Start a streak today'}</span>
      <button type="button" class="chipx tier t-${tierOf(S.season.p)[0]}" data-go="me">${icon('medal','sm')}${tierOf(S.season.p)[1]} · ${S.season.p} pts</button>
    </div>
    ${rv.length ? `<div class="rivals">${rv.map(r => `<div class="rival">${avatar(r.n, r.c, 's')}<span class="rn">${esc(r.n)}</span><span class="rs"><b class="res-w">${r.w}</b>–<b class="res-l">${r.l}</b></span></div>`).join('')}</div>`
      : `<p class="small">Play a duel or share a challenge link. Everyone you play shows up here with your record.</p>`}
  </div>`;
}
function inboxBanners(){
  const reqs = Object.values(S.reqIn), items = pendingInbox().slice(0, 4);
  if (!reqs.length && !items.length) return '';
  const rows = [
    ...reqs.map(r => `<div class="bn">${avatar(r.n, r.c, 's')}<div><b>${esc(r.n)}</b><span>wants to be friends</span></div><button type="button" class="pillbtn ok" data-acc="${esc(r.i)}">Accept</button></div>`),
    ...items.map(it => { const T = TOPICS[it.t] || TOPICS.mixed; return `<div class="bn ${it.k === 'lv' ? 'live' : ''}">${avatar(it.n, it.c, 's')}<div><b>${esc(it.n)}</b><span>${it.k === 'lv' ? 'is waiting to play live' : 'challenged you'} · ${esc(T.name)}${Number.isInteger(it.s) ? ' · ' + it.s + ' to beat' : ''}</span></div><button type="button" class="pillbtn" data-ib="${it.id}">${it.k === 'lv' ? 'Join' : 'Play'}</button></div>`; })
  ];
  return `<div class="banners">${rows.join('')}</div>`;
}
function challengeRows(){
  const now = Date.now();
  return Object.entries(S.sent).filter(([cid, st]) => st.shared && now - st.at < 7*24*3600e3).sort((a, b) => b[1].at - a[1].at).slice(0, 4).map(([cid, st]) => {
    const T = TOPICS[st.t] || TOPICS.mixed, res = Object.values(st.res || {});
    const sub = res.length ? res.slice(0, 3).map(x => `${x.n} ${x.s}`).join(' · ') + (res.length > 3 ? ` +${res.length - 3}` : '') : (now - st.at < 36*3600e3 ? 'Waiting for players…' : 'No one played yet');
    return `<li><button type="button" class="li" data-board="${cid}"><span class="tic" style="--c:${T.c}">${T.ic}</span><div><div class="t1">${esc(T.name)} · you scored ${st.s}</div><div class="t2">${esc(sub)}</div></div><span class="cnt">${res.length ? res.length + ' played' : ''}${icon('chev','sm')}</span></button></li>`;
  }).join('');
}
function topicTile(id){
  const T = TOPICS[id];
  const lv = topicLevel('me', id).lv;
  const sub = id === 'us' ? `${S.us.length} written` : id === 'mixed' ? 'All topics' : `Lv ${lv} · ${T.q.length} Qs`;
  return `<button type="button" class="tp" data-topic="${id}" style="--c:${T.c}">${S.fav.includes(id) ? `<span class="star">${icon('starf','sm')}</span>` : ''}<span class="ic">${T.ic}</span><span><b>${esc(T.name)}</b><small>${sub}</small></span></button>`;
}
function renderHome(){
  const dDone = S.daily[today()];
  const recent = [...new Set([...S.fav, ...S.recent])].filter(id => TOPICS[id] && id !== 'daily').slice(0, 6);
  const show = recent.length ? recent : ['gk','bollywood','love','cricket','india','mixed'];
  $('home').innerHTML = `<div class="col">
    <div class="top"><h1 class="logo"><span class="a">Two</span> <span class="b">Minds</span></h1><button class="iconbtn" type="button" data-go="me" aria-label="Profile">${icon('user')}</button></div>
    ${meCard()}
    ${inboxBanners()}
    <div class="hero" role="group" aria-label="Quick match">
      <button class="hero-main" type="button" id="hmQuick"><span class="hero-ey">${icon('zap','sm')}Quick match</span><b>Find an opponent</b><span class="hero-d">Pick a topic. Anyone playing it right now gets matched with you.</span></button>
      <button class="hero-any" type="button" id="hmAny">${icon('shuffle','sm')}Any topic</button>
      <span class="hero-art" aria-hidden="true"><i></i><i></i><i></i></span>
    </div>
    <div class="modes">
      <button class="mode m-live wide" type="button" id="hmLive"><span class="mi">${icon('zap')}</span><div><b>Play live with a link</b><span class="d">Invite someone specific to play right now</span></div><span class="go">${icon('chev','sm')}</span></button>
      <button class="mode m-link wide" type="button" id="hmLink"><span class="mi">${icon('send')}</span><div><b>Challenge by link</b><span class="d">Play now, they play whenever they like</span></div><span class="go">${icon('chev','sm')}</span></button>
      <button class="mode m-duel wide" type="button" id="hmDuel"><span class="mi">${icon('swords')}</span><div><b>Duel on this phone</b><span class="d">Sitting together? Split the screen, race to tap.</span></div><span class="go">${icon('chev','sm')}</span></button>
      <button class="mode m-daily wide" type="button" id="hmDaily"><span class="mi">${icon('sun')}</span><div><b>Daily Duel</b><span class="d">7 mixed questions, the same for everyone today</span></div><span class="go">${dDone ? '<b class="sc">' + dDone.score + '</b>' : ''}${icon('chev','sm')}</span></button>
      <button class="mode m-couple wide" type="button" data-go="couple"><span class="mi">${icon('heart')}</span><div><b>Couple corner</b><span class="d">How well do you know me? Who's more likely?</span></div><span class="go">${icon('chev','sm')}</span></button>
    </div>
    ${challengeRows() ? `<div class="h">Your challenges</div><ul class="list">${challengeRows()}</ul>` : ''}
    <div class="h">${S.fav.length || S.recent.length ? 'Your topics' : 'Popular topics'}<button type="button" data-go="topics">All ${TOPIC_IDS.length} topics</button></div>
    <div class="tgrid">${show.map(topicTile).join('')}</div>
    ${S.history.length ? `<div class="h">Recent matches<button type="button" data-go="history">See all</button></div><ul class="list">${S.history.slice(0, 3).map(histRow).join('')}</ul>` : ''}
  </div>`;
  $('hmDuel').onclick = () => { SFX.tap(); pickTopicThen('duel'); };
  $('hmLink').onclick = () => { SFX.tap(); pickTopicThen('link'); };
  $('hmLive').onclick = () => { SFX.tap(); pickTopicThen('live'); };
  $('hmQuick').onclick = () => { SFX.tap(); pickTopicThen('quick'); };
  $('hmAny').onclick = e => { e.stopPropagation(); SFX.tap(); startQuick('mixed'); };
  $('hmDaily').onclick = () => { SFX.tap(); startSolo({kind:'daily', topic:'daily'}); };
  wireSocial($('home'));
}
function pickTopicThen(mode){ go('topics', {intent: mode}); }

function histRow(h){
  const cls = h.r === 'w' ? 'res-w' : h.r === 'l' ? 'res-l' : h.r === 'd' ? 'res-d' : 'res-p';
  const word = h.r === 'w' ? 'Won' : h.r === 'l' ? 'Lost' : h.r === 'd' ? 'Draw' : 'Played';
  const T = TOPICS[h.t] || {name: h.t, c:'#888', ic:'?'};
  return `<li class="li"><span class="tic" style="--c:${T.c}">${T.ic}</span><div><div class="t1">${esc(T.name)}</div><div class="t2">${esc(h.m)} vs ${esc(h.o)} · ${esc(h.when)}</div></div><span class="sc"><b>${h.s[0]}–${h.s[1]}</b><span class="${cls}">${word}</span></span></li>`;
}
function renderHistory(){
  $('history').innerHTML = `<div class="col"><div class="top"><button class="iconbtn" type="button" data-go="home" aria-label="Back">${icon('back')}</button><h1 class="title">Match history</h1></div>
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
  const FF = withFriend && friendOf(withFriend);
  const intentLine = FF ? `Pick a topic to play with ${esc(FF.n)}` : topicIntent === 'duel' ? 'Pick a topic for your duel on this phone' : topicIntent === 'link' ? 'Pick a topic for your link challenge' : topicIntent === 'live' ? 'Pick a topic to play live' : topicIntent === 'quick' ? 'Pick a topic. You get matched with anyone playing it now' : 'Tap a topic to see your levels and play';
  $('topics').innerHTML = `<div class="col">
    <div class="top"><h1 class="title">Topics</h1></div>
    <p class="lede">${intentLine}</p>
    <input class="search" id="tsearch" type="search" placeholder="Search topics" value="${esc(searchTerm)}" autocomplete="off">
    <div class="cats">${CATS.map(([id, n]) => `<button type="button" class="chip" data-cat="${id}" aria-pressed="${catSel === id}">${n}</button>`).join('')}</div>
    <div class="tgrid">${ids.map(topicTile).join('') || '<p class="small">No topic matches that search.</p>'}</div>
  </div>`;
  $('tsearch').oninput = e => { searchTerm = e.target.value; const pos = e.target.selectionStart; renderTopics(); const s = $('tsearch'); s.focus(); try{ s.setSelectionRange(pos, pos); }catch(_){} };
  $('topics').querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { catSel = b.dataset.cat; SFX.tap(); renderTopics(); });
}

let withFriend = null;
function renderTopic(){
  const T = TOPICS[topicSel] || TOPICS.gk, id = T.id;
  const F = withFriend && friendOf(withFriend);
  const lm = topicLevel('me', id);
  const fav = S.fav.includes(id);
  const count = id === 'us' ? S.us.length : id === 'mixed' ? TOPIC_IDS.reduce((a, t) => a + QB.topics[t].length, 0) : T.q.length;
  const usNote = id === 'us' ? (S.us.length < 3 ? `<p class="small">Write at least 3 questions about you two to play this topic. With fewer than 7, the rest come from Mixed Bag.</p>` : `<p class="small">${S.us.length} questions written. Share them as a link and see who knows your story best.</p>`) : '';
  const lvRow = (who, L) => `<div class="lvrow">${avatar(nameOf(who), S[who].color, 's')}<div><div class="meta"><b>${esc(nameOf(who))}</b><span>Lv ${L.lv} · ${titleFor(L.lv, TOPIC_TITLES)}</span></div><div class="xpbar" style="--c:${S[who].color}"><i style="width:${Math.round(L.into / L.need * 100)}%"></i></div></div></div>`;
  $('topic').innerHTML = `<div class="col">
    <div class="top"><button class="iconbtn" type="button" data-go="topics" aria-label="All topics">${icon('back')}</button><span class="small">${F ? 'Playing with ' + esc(F.n) : topicIntent === 'duel' ? 'Duel on this phone' : topicIntent === 'link' ? 'Challenge by link' : topicIntent === 'live' ? 'Play live' : topicIntent === 'quick' ? 'Quick match' : 'Topic'}</span></div>
    <div class="thero" style="--c:${T.c}"><span class="ic">${T.ic}</span><div><h1>${esc(T.name)}</h1><p>${count} questions · 7 rounds · bonus round ×2</p></div>
      ${id !== 'us' && id !== 'mixed' ? `<button type="button" class="fav" id="favBtn" aria-pressed="${fav}">${icon(fav ? 'starf' : 'star', 'sm')}${fav ? 'Favourite' : 'Favourite'}</button>` : ''}</div>
    ${usNote}
    ${id === 'us' ? `<button class="btn" type="button" data-go="us">${icon('pen','sm')}Write questions about us</button>` : ''}
    <div class="card lvls"><div class="h" style="margin:0 0 -2px">Your level</div>${lvRow('me', lm)}</div>
    ${F ? `<div class="stack">
    <button class="cta" type="button" id="tpFLive">${icon('zap','sm')}Play live with ${esc(F.n)}</button>
    <button class="btn" type="button" id="tpFCh">${icon('send','sm')}<span class="tx">Challenge ${esc(F.n)}<small>Play now, it lands in their inbox</small></span></button>
    <button class="btn ghost" type="button" id="tpFX">Play another way</button></div>` : `<div class="stack">
    <button class="cta" type="button" id="tpQuick">${icon('zap','sm')}<span class="tx">Quick match<small>Get matched with anyone playing this now</small></span></button>
    <button class="btn" type="button" id="tpLive">${icon('users','sm')}<span class="tx">Play live with a link<small>Invite someone specific</small></span></button>
    <button class="btn" type="button" id="tpLink">${icon('send','sm')}<span class="tx">Challenge by link<small>Play now, they play whenever they like</small></span></button>
    <button class="btn" type="button" id="tpDuel">${icon('swords','sm')}<span class="tx">Duel on this phone<small>Sitting together, one screen</small></span></button>
    <button class="btn" type="button" id="tpBot">${icon('bot','sm')}<span class="tx">Practice against a bot<small>${['Easy','Normal','Hard'][S.settings.botLevel]} · change in Profile</small></span></button></div>`}
  </div>`;
  if ($('favBtn')) $('favBtn').onclick = () => { S.fav = fav ? S.fav.filter(x => x !== id) : [id, ...S.fav]; save(); SFX.tap(); renderTopic(); };
  const usOk = id !== 'us' || S.us.length >= 3;
  const guard = fn => () => { if (!usOk){ toast('Write at least 3 Us questions first'); go('us'); return; } fn(); };
  if (F){
    $('tpFLive').onclick = guard(() => startLive(id, F.i));
    $('tpFCh').onclick = guard(() => startSolo({kind:'new', topic:id, toFriend: F.i}));
    $('tpFX').onclick = () => { withFriend = null; renderTopic(); };
    return;
  }
  $('tpDuel').onclick = guard(() => startDuel(id));
  $('tpLink').onclick = guard(() => startSolo({kind:'new', topic:id}));
  $('tpLive').onclick = guard(() => startLive(id));
  $('tpQuick').onclick = guard(() => { if (id === 'us'){ toast('Quick match uses the shared topics. Try Mixed Bag'); return; } startQuick(id); });
  $('tpBot').onclick = guard(() => startSolo({kind:'bot', topic:id}));
}
function noteRecent(id){ if (!TOPICS[id] || id === 'daily') return; S.recent = [id, ...S.recent.filter(x => x !== id)].slice(0, 8); }

/* ================= VS intro ================= */
function vsIntro(a, b, topicId, face, then){
  const T = TOPICS[topicId];
  const el = $('vs');
  el.className = 'vs' + (face ? ' face' : '');
  el.style.setProperty('--ca', safeColor(a.c)); el.style.setProperty('--cb', safeColor(b.c)); el.style.setProperty('--tc', T.c);
  el.innerHTML = `<div class="side b">${avatar(b.n, b.c, 'l', b.l)}<div class="nm">${esc(b.n)}</div><div class="tt">${esc(b.sub)}</div></div>
    <div class="mid"><div class="big">VS</div><span class="pill topic" style="--c:${T.c}">${icon(TOPIC_ICON[T.id] || 'star','sm')}${esc(T.name)}</span></div>
    <div class="side a">${avatar(a.n, a.c, 'l')}<div class="nm">${esc(a.n)}</div><div class="tt">${esc(a.sub)}</div></div>`;
  el.hidden = false;
  SFX.vs(); buzz([30, 60, 30]);
  const mid = M && M.id;
  setTimeout(() => { if (!M || M.id !== mid) return; el.hidden = true; then(); }, 2300);
}

/* ================= shared round helpers ================= */
const answerMs = () => (M && M.T) || (S.settings.relaxed ? 15000 : 10000);
function pointsFor(leftMs, bonus){ return ptsFor(leftMs, answerMs(), bonus); }
function wakeLock(){ try{ navigator.wakeLock && navigator.wakeLock.request('screen').catch(() => {}); }catch(e){} }

/* ================= split-screen duel ================= */
let M = null, raf = 0;
const H = [$('h0'), $('h1')];
function startDuel(topicId, ready){
  if (!ready){ pickOpponent('duel', () => startDuel(topicId, true)); return; }
  noteRecent(topicId);
  const refs = pickRefs(topicId);
  const Q = refs.map(materialize);
  if (Q.some(q => !q)){ toast('Could not load questions for this topic'); return; }
  M = null;
  M = {T: S.settings.relaxed ? 15000 : 10000, mode:'duel', topic:topicId, refs, Q, round:-1, scores:[0,0], log:[], picks:[null,null], times:[0,0], phase:'intro', id: Math.random()};
  const face = S.settings.seat === 'face';
  $('duel').classList.toggle('face', face);
  $('duel').style.setProperty('--tc', (TOPICS[topicId] || TOPICS.mixed).c);
  const nm = [nameOf('me'), nameOf('partner')], col = [S.me.color, S.partner.color];
  H.forEach((h, p) => { h.style.setProperty('--c', col[p]); h.querySelector('.who').textContent = nm[p]; h.querySelector('.pts').firstChild.nodeValue = '0'; h.querySelector('.bar i').style.width = '0%'; h.querySelector('.q').textContent = ''; h.querySelector('.opts').innerHTML = ''; });
  armQuit($('quitBtn'), true);
  hideApp(); $('duel').hidden = false; wakeLock();
  const lm = topicLevel('me', topicId).lv, rv = S.rivals[rivalKey(nm[1])];
  vsIntro({n:nm[0], c:col[0], sub:`Lv ${lm} · ${titleFor(lm, TOPIC_TITLES)}`}, {n:nm[1], c:col[1], sub: rv ? `Your record ${rv.w}–${rv.l}` : 'First duel'}, topicId, face, () => duelNext());
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
document.addEventListener('click', e => { const b = e.target.closest('#duel .opt'); if (b) duelAnswer(+b.dataset.p, +b.dataset.i); });
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
  if (MM.active) mmStop(true);
  const m = M;
  if (m && m.kind === 'live'){
    liveBye();
    if (m.round >= 0 && m.ghost){       // walking out of a live match counts as a loss
      recordVs(rivalKey(m.ghost.n, m.ghost.i), m.ghost.n, m.ghost.c, 'l');
      S.stats.me.played++; S.stats.me.lost++; S.stats.me.streak = 0;
      S.history.unshift({t: m.topic, m:'Live', o: m.ghost.n, s:[m.score, m.gscore], r:'l', quit:true, when: whenStr()});
      S.history = S.history.slice(0, 60); save();
    }
  }
  M = null; cancelAnimationFrame(raf);
  $('duel').hidden = true; $('solo').hidden = true; $('vs').hidden = true; $('modal').hidden = true;
  const t = m && m.topic;
  if (t && topicOk(t) && t !== 'daily'){ topicSel = t; go('topic'); } else go('home');
  flushQueued();
}

/* ================= solo: link challenge / reply / bot / daily ================= */
// ghost = {n, c, lv, picks:[[orig, ms] x7]}; picks orig: 0 right, 1-3 wrong, -1 no answer
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
  // the Daily Duel counts once a day; replays are practice (no XP, no stats)
  M.practice = kind === 'daily' && !!S.daily[today()];
  if (M.practice) setTimeout(() => toast("Today's score is already in. This replay is practice"), 2400);
  M.cid = o.cid || null; M.toFriend = o.toFriend || null;
  $('solo').style.setProperty('--tc', (TOPICS[o.topic] || TOPICS.mixed).c);
  $('emoBar').hidden = kind !== 'live';
  const me = {n:nameOf('me'), c:S.me.color}, opp = ghost ? {n:ghost.n, c:ghost.c} : {n:'Anyone', c:'#8b92bf', l:'?'};
  $('soloMe').innerHTML = `${avatar(me.n, me.c, 's')}<div><div class="nm">${esc(me.n)}</div><div class="sc">0<span class="gain"></span></div></div>`;
  $('soloOpp').innerHTML = `${avatar(opp.n, opp.c, 's', opp.l)}<div><div class="nm">${esc(opp.n)}</div><div class="sc">${ghost ? '0' : '–'}<span class="gain"></span></div><div class="state" id="oppState">${ghost ? '' : 'plays your link'}</div></div>`;
  $('vbarL').style.setProperty('--c', me.c); $('vbarR').style.setProperty('--c', opp.c);
  $('vbarL').querySelector('i').style.height = '0%'; $('vbarR').querySelector('i').style.height = '0%';
  $('sQ').textContent = ''; $('sOpts').innerHTML = '';
  armQuit($('squit'), false);
  hideApp(); $('solo').hidden = false; wakeLock();
  const lvMe = o.topic === 'daily' ? overallLevel('me') : topicLevel('me', o.topic).lv;
  const oppSub = ghost ? (ghost.bot ? 'Practice bot' : ghost.live ? `Lv ${ghost.lv || 1} · live now` : `Lv ${ghost.lv || 1} · already played`) : 'Whoever opens your link';
  vsIntro({n:me.n, c:me.c, sub:`Lv ${lvMe}`}, {n:opp.n, c:opp.c, sub:oppSub, l:opp.l}, o.topic, false, () => soloNext());
}
function soloNext(){
  if (!M || M.mode !== 'solo') return;
  M.round++;
  if (M.round >= ROUNDS){ finishMatch(); return; }
  const bonus = M.round === ROUNDS - 1, id = M.id, Q = M.Q[M.round];
  $('sLabel').textContent = bonus ? 'Bonus round · ×2' : `Round ${M.round + 1} of ${ROUNDS}`;
  $('sQ').textContent = Q.q; $('sQ').classList.remove('pop'); void $('sQ').offsetWidth; $('sQ').classList.add('pop');
  $('sOpts').className = 'olist hide opts';
  $('sOpts').innerHTML = Q.opts.map((x, i) => `<button type="button" class="opt" data-i="${i}">${esc(x.text)}</button>`).join('');
  M.pick = null; M.left = 0; M.phase = 'question'; M.gAnswered = false; M.liveSent = false;
  if ($('oppState') && M.ghost){ $('oppState').textContent = M.ghost.live ? (M.ghost.gone ? 'offline' : 'thinking…') : ''; $('oppState').className = 'state'; }
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
    const arrived = M.ghost.live ? (g !== undefined && g[0] !== -1) : (g && g[0] !== -1 && el >= g[1]);
    if (arrived){ M.gAnswered = true; if ($('oppState')){ $('oppState').textContent = 'answered'; $('oppState').className = 'state ok'; } tone(700, 0.05, 'triangle', 0.04); }
  }
  if (M.ghost && M.ghost.live){
    const g = M.ghost.picks[M.round];
    if (left <= 0 && M.pick === null && !M.liveSent) liveAnswer(-1, T);
    const gDoneL = g !== undefined || M.ghost.gone || el > T + LIVE_GRACE;
    if ((M.pick !== null || left <= 0) && !gDoneL && $('oppState') && $('oppState').textContent !== 'waiting…'){ $('oppState').textContent = 'waiting…'; $('oppState').className = 'state'; }
    if ((M.pick !== null || left <= 0) && gDoneL){
      if (g === undefined){ M.ghost.picks[M.round] = [-1, T]; M.ghost.missed = (M.ghost.missed || 0) + 1; if (M.ghost.missed >= 2 && !M.ghost.gone){ M.ghost.gone = true; toast(`${M.ghost.n} seems to be offline`); } }
      else M.ghost.missed = 0;
      soloReveal(); return;
    }
    raf = requestAnimationFrame(soloTick); return;
  }
  const gDone = !M.ghost || M.gAnswered || (M.ghost.picks[M.round] || [-1])[0] === -1;
  if ((M.pick !== null && gDone) || left <= 0){ soloReveal(); return; }
  raf = requestAnimationFrame(soloTick);
}
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('#sOpts .opt'); if (!b) return;
  e.preventDefault();
  soloPick(b);
});
document.addEventListener('click', e => { const b = e.target.closest('#sOpts .opt'); if (b) soloPick(b); });     // keyboard / screen readers
function soloPick(b){
  if (!M || M.mode !== 'solo' || M.phase !== 'answer' || M.pick !== null) return;
  const T = answerMs(), el = performance.now() - M.t0;
  if (M.kind === 'live' && (M.liveSent || el >= T)) return;      // time is up: the "no answer" already went to the other phone
  const ms = Math.min(T, Math.round(el));                          // whole milliseconds, so both phones and links score identically
  M.pick = +b.dataset.i; M.left = Math.max(0, T - ms);
  if (M.kind === 'live') liveAnswer(M.Q[M.round].opts[M.pick].orig, ms);
  b.classList.add('mine'); $('sOpts').classList.add('locked');
  SFX.pick(); buzz(12);
}
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
  $('soloMe').classList.toggle('lead', M.score > M.gscore); $('soloOpp').classList.toggle('lead', !!M.ghost && M.gscore > M.score);
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
  const me = S.stats.me;
  const gained = {me:0, partner:0}, before = {me: topicLevel('me', m.topic === 'daily' ? 'mixed' : m.topic).lv};
  const xpTopic = m.topic === 'daily' ? 'mixed' : m.topic;
  let s0, s1, oppName, oppColor, r;   // r from my side: w / l / d / p (played, no opponent yet)
  if (m.mode === 'duel'){
    [s0, s1] = m.scores; oppName = nameOf('partner'); oppColor = S.partner.color;
    r = s0 > s1 ? 'w' : s1 > s0 ? 'l' : 'd';
    m.empty = s0 === 0 && s1 === 0;          // nobody answered anything: no result, no XP, no badge
    if (!m.empty){
      S.h2h[r === 'w' ? 0 : r === 'l' ? 1 : 2]++;
      recordVs(rivalKey(S.partner.name), S.partner.name, S.partner.color, r);
      applyStats(me, r, m.log.map(l => [l.orig[0], l.ms[0]]), m.topic);
      gained.me = s0 + (r === 'w' ? 50 : r === 'd' ? 20 : 0);
    }
  } else {
    s0 = m.score; s1 = m.ghost ? m.gscore : null; oppName = m.ghost ? m.ghost.n : 'Anyone'; oppColor = m.ghost ? m.ghost.c : '#8b92bf';
    r = s1 === null ? 'p' : s0 > s1 ? 'w' : s1 > s0 ? 'l' : 'd';
    m.empty = s0 === 0 && (s1 === null || s1 === 0) && m.log.every(l => l.orig[0] === -1);
    if (!m.practice && !(m.empty && r === 'd')){
      applyStats(me, r, m.log.map(l => [l.orig[0], l.ms[0]]), m.topic);
      gained.me = s0 + (r === 'w' ? 50 : r === 'd' ? 20 : 0);
    }
    if (m.ghost && !m.ghost.bot && m.kind !== 'bot'){ S.challenges.played++; if (r === 'w') S.challenges.won++; recordVs(rivalKey(m.ghost.n, m.ghost.i), m.ghost.n, m.ghost.c, r); }
    if (r === 'p'){ m.cid = randId(); S.sent[m.cid] = {t: m.topic, s: s0, ms: m.T, at: Date.now(), res: {}, shared: false, url: null}; }
    if (m.kind === 'reply' && m.cid){
      m.pack = {i: S.id, n: nameOf('me'), c: S.me.color, f: myFrame() || undefined, lv: overallLevel('me'), p: m.log.map(l => [l.orig[0], Math.round(l.ms[0])]), s: s0};
      S.played[m.cid] = {t: m.topic, s: s0, ms: m.T, at: Date.now(), A: {i: m.ghost.i, n: m.ghost.n, c: m.ghost.c, s: s1}, pack: m.pack, sent: false};
    }
    if (m.topic === 'daily' && !S.daily[today()] && m.date === today()) S.daily[today()] = {score: s0};
  }
  S.xp.me[xpTopic] = (S.xp.me[xpTopic] || 0) + gained.me;
  m.trailedBeforeBonus = (() => { const pre = m.log.slice(0, ROUNDS - 1).reduce((a, l) => [a[0] + l.g[0], a[1] + l.g[1]], [0, 0]); return pre[0] < pre[1]; })();
  const modeName = m.mode === 'duel' ? 'Duel' : m.kind === 'live' ? 'Live' : m.kind === 'bot' ? 'Practice' : m.topic === 'daily' ? (m.practice ? 'Daily practice' : 'Daily') : m.kind === 'reply' ? 'Link reply' : 'Link';
  // round-by-round detail kept with the match, so history can show it later
  const det = m.log.map((l, i) => ({q: l.q, a: l.a, o: [l.orig[0], l.orig[1]], g: l.g.slice(), w: [pickText(m.Q[i], l.orig[0]), pickText(m.Q[i], l.orig[1])]}));
  const hkey = r === 'p' ? 'pend:' + m.cid : 'm:' + randId(8);
  S.history.unshift({key: hkey, t: m.topic, m: modeName, o: r === 'p' ? 'anyone' : oppName, oc: oppColor, s:[s0, s1 === null ? '?' : s1], r, when: whenStr(), det});
  S.history = S.history.slice(0, 60);
  if (m.kind === 'live') LV.last = {gm: LV.game, hkey, r, s0, s1, T: m.T, key: rivalKey(m.ghost.n, m.ghost.i), picks: m.ghost.picks.slice(), mine: m.log.map(l => [l.orig[0], Math.round(l.ms[0])])};
  if (m.empty) {} else if (m.kind === 'bot' || m.practice) onPlayed(0, 0); else onPlayed(gained.me, s0);
  const newBadges = checkBadges({m, r, s0, s1});
  save();
  renderResults({m, r, s0, s1, oppName, oppColor, gained, before, xpTopic, newBadges});
  if (m.kind === 'reply' && m.cid) autoSend(m.cid);
  if (m.kind === 'live') livePost({type:'fin', p: LV.last.mine}).catch(() => {});    // both phones check they scored the same answers
  M = null;
  setTimeout(flushQueued, 1500);
}
function pickText(Q, orig){ if (orig === null || orig === undefined || orig === -1 || !Q) return null; const o = Q.opts.find(x => x.orig === orig); return o ? o.text : null; }
function applyStats(st, r, picks, topic){
  st.played++; if (r === 'w'){ st.won++; st.streak++; st.best = Math.max(st.best, st.streak); } else if (r === 'l'){ st.lost++; st.streak = 0; } else if (r === 'd'){ st.draw++; }
  let right = 0;
  picks.forEach(([o, ms]) => { if (o !== -1) st.answered++; if (o === 0){ st.correct++; right++; if (ms <= 2000) st.fast++; } });
  if (right === ROUNDS) st.perfect++;
  st.topics[topic] = (st.topics[topic] || 0) + 1;
}

/* ================= streak, weekly board, seasons ================= */
const TIERS = [['bronze','Bronze',0], ['silver','Silver',400], ['gold','Gold',1200], ['plat','Platinum',2500], ['diamond','Diamond',4500]];
const FRAME_NAMES = {bronze:'Bronze', silver:'Silver', gold:'Gold', plat:'Platinum', diamond:'Diamond', flame:'Flame'};
function dayKey(d = new Date()){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function weekKey(d = new Date()){ const x = new Date(d); x.setHours(0,0,0,0); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return 'w' + dayKey(x); }
function seasonKey(d = new Date()){ return dayKey(d).slice(0, 7); }
function weekDaysLeft(){ const d = new Date(), dow = (d.getDay() + 6) % 7; return 7 - dow; }
function seasonDaysLeft(){ const d = new Date(), end = new Date(d.getFullYear(), d.getMonth() + 1, 0); return end.getDate() - d.getDate() + 1; }
function tierOf(p){ let t = TIERS[0]; for (const x of TIERS) if (p >= x[2]) t = x; return t; }
function nextTier(p){ return TIERS.find(x => x[2] > p) || null; }
function rollPeriods(){
  const wk = weekKey(), sk = seasonKey();
  if (S.week.k && S.week.k !== wk){
    const board = weekBoard(S.week.k);
    if (board.length > 1 || (board[0] && board[0].p > 0)) S.lastWeek = {k: S.week.k, board: board.slice(0, 5)};
    S.week = {k: wk, p: 0, g: 0};
  }
  if (!S.week.k) S.week.k = wk;
  if (S.season.k && S.season.k !== sk) S.season = {k: sk, p: 0};
  if (!S.season.k) S.season.k = sk;
}
function weekBoard(k = weekKey()){
  const rows = [{i: S.id, n: nameOf('me'), c: S.me.color, p: S.week.k === k ? S.week.p : 0, g: S.week.k === k ? S.week.g : 0, me: true}];
  Object.entries(S.fweek).forEach(([i, w]) => { const f = S.friends[i]; if (f && w.k === k) rows.push({i, n: f.n, c: f.c, p: w.p, g: w.g}); });
  return rows.sort((a, b) => b.p - a.p);
}
function onPlayed(xp, score){
  rollPeriods();
  const today = dayKey(), y = new Date(); y.setDate(y.getDate() - 1);
  const st = S.streak, before = st.cur;
  if (st.last !== today){ st.cur = st.last === dayKey(y) ? st.cur + 1 : 1; st.last = today; st.best = Math.max(st.best, st.cur); }
  if (st.cur >= 7 && !S.frames.includes('flame')) S.frames.push('flame');
  S.week.p += score || 0; S.week.g++;
  const tBefore = tierOf(S.season.p)[0];
  S.season.p += xp || 0;
  TIERS.forEach(t => { if (S.season.p >= t[2] && t[0] !== 'bronze' && !S.frames.includes(t[0])) S.frames.push(t[0]); });
  if (!S.frames.includes('bronze') && S.season.p > 0) S.frames.push('bronze');
  const tAfter = tierOf(S.season.p);
  const notes = [];
  if (st.cur > before && st.cur > 1) notes.push(`${st.cur}-day streak! Keep it going tomorrow`);
  if (tAfter[0] !== tBefore) notes.push(`Season rank up: ${tAfter[1]}! New avatar frame unlocked`);
  notes.forEach((t, k) => setTimeout(() => { toast(t, 2600); SFX.badge(); }, 2600 + k*2800));
  // my weekly total goes to my own board topic (one message); friends read it when they open Friends
  if (friendList().length) postTopic(weekTopic(S.code), {k: S.week.k, p: S.week.p, g: S.week.g}).catch(() => {});
}
const weekTopic = code => 'twominds-w-' + code;
let weekPulled = 0;
async function pullWeeks(){
  const fl = friendList(); if (!fl.length || Date.now() - weekPulled < 60e3) return;
  weekPulled = Date.now();
  let msgs; try{ msgs = await pollTopics(fl.slice(0, 30).map(f => weekTopic(f.code))); }catch(e){ return; }
  let changed = false;
  for (const m of msgs){ const f = fl.find(f => weekTopic(f.code) === m.topic); if (f && takeWeek(f.i, m.x)) changed = true; }
  if (changed) save();
}

/* ================= badges ================= */
const BADGES = [
  ['first_win','First win','Win any match','✌'], ['win10','On a roll','Win 10 matches','⚡'], ['streak3','Hat-trick','Win 3 in a row','♛'],
  ['perfect','Flawless','7 of 7 correct','✔'], ['score140','Speed demon','Score 140+ in a match','➶'], ['comeback','Clutch','Win from behind in the bonus round','↺'],
  ['draw','Perfect balance','Draw a match','☯'], ['topics5','Explorer','Play 5 topics','⌖'], ['topics12','Globetrotter','Play 12 topics','✈'],
  ['lv5','Rising star','Reach level 5 in a topic','★'], ['lv10','Expert','Reach level 10 in a topic','✪'], ['daily1','Early bird','Finish a Daily Duel','☀'],
  ['daily7','Week warrior','Daily Duel on 7 days','☼'], ['sent','Gauntlet','Send a challenge link','✉'], ['ldw','Long-distance win','Win a link challenge','❤'],
  ['us5','Storyteller','Write 5 Us questions','✎'], ['know80','Mind reader','80%+ in How well do you know me','◎'], ['likely80','Same wavelength','80%+ in Who\'s more likely','≈'],
  ['bothard','Beat the machine','Beat the Hard bot','⚙'], ['played25','Regular','Play 25 matches','♺'], ['century','Century','100 correct answers','C'],
  ['night','Night owl','Play between midnight and 4 am','☾'], ['fast20','Quick draw','20 answers under 2 seconds','⌁'], ['h2h10','Rivals','Play 10 duels on one phone','⚔'],
  ['streak7','On fire','7-day play streak','f'], ['streak30','Unstoppable','30-day play streak','f'], ['champ','Weekly champ','Top your friends for a week','m'], ['goldtier','Golden','Reach Gold in a season','m']
];
function checkBadges(ctx = {}){
  const st = S.stats.me, got = new Set(S.badges), add = [];
  const has = (id, cond) => { if (!got.has(id) && cond){ got.add(id); add.push(id); } };
  const m = ctx.m || {}, maxLv = Math.max(0, ...Object.keys(S.xp.me).map(t => topicLevel('me', t).lv));
  has('first_win', st.won >= 1); has('win10', st.won >= 10); has('streak3', st.best >= 3);
  has('perfect', st.perfect >= 1); has('score140', ctx.s0 >= 140); has('comeback', ctx.r === 'w' && !!m.trailedBeforeBonus && !m.practice);
  has('draw', st.draw >= 1); has('topics5', Object.keys(st.topics).length >= 5); has('topics12', Object.keys(st.topics).length >= 12);
  has('lv5', maxLv >= 5); has('lv10', maxLv >= 10); has('daily1', Object.keys(S.daily).length >= 1); has('daily7', Object.keys(S.daily).length >= 7);
  has('sent', S.challenges.sent >= 1); has('ldw', S.challenges.won >= 1); has('us5', S.us.length >= 5);
  has('know80', S.couple.bestKnow >= 80); has('likely80', S.couple.bestLikely >= 80);
  has('bothard', m.kind === 'bot' && ctx.r === 'w' && S.settings.botLevel === 2);
  has('played25', st.played >= 25); has('century', st.correct >= 100);
  has('night', ctx.m && new Date().getHours() < 4); has('fast20', st.fast >= 20);
  has('h2h10', S.h2h[0] + S.h2h[1] + S.h2h[2] >= 10);
  has('streak7', S.streak.best >= 7); has('streak30', S.streak.best >= 30);
  has('champ', !!(S.lastWeek && S.lastWeek.board.length > 1 && S.lastWeek.board[0].me && S.lastWeek.board[0].p > S.lastWeek.board[1].p));
  has('goldtier', S.frames.includes('gold'));
  S.badges = [...got];
  return add;
}
const BADGE_ICON = {first_win:'trophy', win10:'flame', streak3:'crown', perfect:'check', score140:'zap', comeback:'undo', draw:'scale', topics5:'compass', topics12:'globe',
  lv5:'star', lv10:'award', daily1:'sun', daily7:'calendar', sent:'send', ldw:'heart', us5:'pen', know80:'eye', likely80:'waves', bothard:'bot', played25:'repeat', century:'hundred', night:'moon', fast20:'timer', h2h10:'swords', streak7:'flame', streak30:'flame', champ:'trophy', goldtier:'medal'};
BADGES.forEach(b => b[3] = icon(BADGE_ICON[b[0]] || 'star'));
function badgeHtml(ids){ return ids.map(id => { const b = BADGES.find(x => x[0] === id); return b ? `<div class="newb"><span class="bi">${b[3]}</span><div><b>Badge unlocked: ${esc(b[1])}</b><span>${esc(b[2])}</span></div></div>` : ''; }).join(''); }
function badgeToast(ids){ ids.forEach((id, k) => { const b = BADGES.find(x => x[0] === id); if (b) setTimeout(() => { toast(`Badge unlocked: ${b[1]}`); SFX.badge(); }, 600 + k*2200); }); }

/* ================= results screen ================= */
let lastShare = null;
function renderResults(o){
  const {m, r, s0, s1, oppName, oppColor, gained, before, xpTopic, newBadges} = o;
  const T = TOPICS[m.topic];
  const myName = nameOf('me');
  let head;
  if (m.mode === 'duel') head = r === 'd' ? "It's a draw!" : `<span style="color:${r === 'w' ? S.me.color : safeColor(S.partner.color)}">${esc(r === 'w' ? myName : oppName)}</span> wins!`;
  else if (r === 'p') head = m.topic === 'daily' ? 'Daily done!' : 'Challenge ready';
  else head = r === 'w' ? 'You win!' : r === 'l' ? `${esc(oppName)} wins` : "It's a draw!";
  const showOpp = s1 !== null;
  const rows = m.log.map((l, i) => {
    const best = !showOpp ? -1 : l.g[0] > l.g[1] ? 0 : l.g[1] > l.g[0] ? 1 : -1;
    const cell = (p) => { if (p === 1 && !showOpp) return '<span class="c">?</span>'; const g = l.g[p], o = l.orig[p]; return `<span class="c ${g ? 'ok' : ''} ${best === p ? 'best' : ''}">${g ? '+' + g : o === -1 || o === null ? 'too slow' : '✗'}</span>`; };
    return `<div class="rr"><span class="n">${i === ROUNDS - 1 ? 'Bonus' : 'R' + (i + 1)}</span>${cell(0)}${cell(1)}</div>`;
  }).join('');
  const L = topicLevel('me', xpTopic), up = L.lv > before.me;
  const xpRow = `<div class="lvrow">${avatar(myName, S.me.color, 's')}<div><div class="meta"><b>+${gained.me} XP</b><span class="${up ? 'lvup' : ''}">${up ? 'Level up! ' : ''}Lv ${L.lv} · ${titleFor(L.lv, TOPIC_TITLES)}</span></div><div class="xpbar" style="--c:${S.me.color}"><i style="width:0%" data-w="${Math.round(L.into / L.need * 100)}"></i></div></div></div>`;
  let actions = '', extra = '';
  if (m.mode === 'duel') actions = `<button class="cta" id="rAgain" type="button">Rematch</button><div class="row"><button class="btn" type="button" data-go="topics">New topic</button><button class="btn" type="button" data-go="home">Home</button></div>`;
  else if (m.kind === 'live') actions = `<div id="liveRm"></div><button class="cta" id="lvRe" type="button">Rematch live<small>New questions, same topic</small></button><button class="btn" type="button" id="lvHome">Home</button>`;
  else if (m.kind === 'bot') actions = `<button class="cta" id="rAgain" type="button">Play again</button><div class="row"><button class="btn" type="button" data-go="topics">New topic</button><button class="btn" type="button" data-go="home">Home</button></div>`;
  else if (r === 'p' && m.toFriend && friendOf(m.toFriend)){
    const F = friendOf(m.toFriend);
    extra = `<div class="sync" id="friendSend"><span class="spin"></span>Sending to ${esc(F.n)}…</div><div class="card" id="liveBoard" hidden></div>`;
    actions = `<button class="btn" type="button" data-go="home">Done</button>`;
  }
  else if (r === 'p'){
    actions = `<button class="cta" id="rShare" type="button">Share challenge link<small>Anyone with the link can play. Scores come back here automatically.</small></button><div class="linkbox" id="lbox" hidden></div><button class="btn" type="button" data-go="home">Home</button>`;
    extra = `<div class="card" id="liveBoard" hidden></div>`;
  } else {
    extra = `<div class="sync" id="syncState"><span class="spin"></span>Sending your score to ${esc(oppName)}…</div><div class="card" id="liveBoard" hidden></div>`;
    actions = `<button class="cta" type="button" id="rBack">Challenge ${esc(oppName)} back<small>New questions in ${esc(m.topic === 'daily' ? 'Mixed Bag' : T.name)}</small></button><div class="linkbox" id="lbox" hidden></div><button class="btn" type="button" data-go="home">Home</button>`;
  }
  $('results').innerHTML = `<div class="col">
    <div class="kicker"><span class="pill" style="--c:${T.c}">${icon(TOPIC_ICON[T.id] || 'star','sm')}${m.topic === 'daily' ? '' : esc(T.name) + ' · '}${m.mode === 'duel' ? 'Duel' : m.kind === 'live' ? 'Live' : m.kind === 'bot' ? 'Practice' : m.topic === 'daily' ? 'Daily Duel · ' + esc(m.date || today()) : 'Link challenge'}</span></div>
    <h1 class="winner">${head}</h1>
    <div class="card board">
      <div class="sb ${showOpp && s0 > s1 ? 'win' : ''}">${showOpp && s0 > s1 ? `<span class="crown">${icon('crown')}</span>` : ''}${avatar(myName, S.me.color, 'l')}<b style="color:${S.me.color}" data-count="${s0}">0</b><span class="nm2">${esc(myName)}</span></div><em>VS</em>
      <div class="sb ${showOpp && s1 > s0 ? 'win' : ''}">${showOpp && s1 > s0 ? `<span class="crown">${icon('crown')}</span>` : ''}${avatar(oppName, oppColor, 'l', showOpp ? '' : '?')}<b style="color:${safeColor(oppColor)}" ${showOpp ? `data-count="${s1}"` : ''}>${showOpp ? 0 : '?'}</b><span class="nm2">${esc(oppName)}</span></div></div>
    ${extra}
    ${actions}
    ${badgeHtml(newBadges)}
    <div class="card rounds"><div class="rr head"><span class="n"></span><span class="c" style="color:${S.me.color}">${esc(myName)}</span><span class="c" style="color:${safeColor(oppColor)}">${esc(oppName)}</span></div>${rows}</div>
    <div class="card lvls">${xpRow}</div>
    <details class="card"><summary>Review the answers</summary><div class="review">${m.log.map((l, i) => `<div class="rv">${i + 1}. ${esc(l.q)}<div class="a">✓ ${esc(l.a)}</div></div>`).join('')}</div></details>
  </div>`;
  go('results');
  requestAnimationFrame(() => setTimeout(() => $('results').querySelectorAll('.xpbar i[data-w]').forEach(i => i.style.width = i.dataset.w + '%'), 80));
  countUp($('results'));
  const winFx = (m.mode === 'duel' && r !== 'd') || r === 'w' || r === 'p';
  if (winFx){ SFX.win(); confetti(140, m.mode === 'duel' ? [r === 'w' ? S.me.color : S.partner.color, '#ffc53d', '#f2f4ff'] : undefined); buzz([30,50,30,50,80]); }
  else if (r === 'd'){ SFX.win(); } else { SFX.lose(); buzz([60]); }

  const myPack = {i: S.id, n: myName, c: S.me.color, f: myFrame() || undefined, lv: overallLevel('me'), p: m.log.map(l => [l.orig[0], Math.round(l.ms[0])]), s: s0};
  results_ctx = {m, s1, myPack};
  if ($('rAgain')) $('rAgain').onclick = () => m.mode === 'duel' ? startDuel(m.topic, true) : startSolo({kind:'bot', topic:m.topic});
  if ($('rShare')) $('rShare').onclick = async () => {
    const st = S.sent[m.cid];
    const url = (st && st.url) || linkFor('ch', m.topic, m.refs, myPack, null, m.date, m.T, m.cid);
    const text = `${myName} challenged you on Two Minds: ${T.name}. ${s0} points to beat!`;
    if (st && !st.shared){ st.shared = true; st.url = url; S.challenges.sent++; const nb = checkBadges(); save(); badgeToast(nb); }
    showLinkBox(url, text);
    liveBoard(m.cid, 'sender');
    const how = await shareLink(url, text);
    if (how === 'shared') toast('Shared! Scores will show up here');
  };
  if ($('rBack')) $('rBack').onclick = () => startSolo({kind:'new', topic: m.topic === 'daily' ? 'mixed' : m.topic});
  if (m.kind === 'reply' && m.cid) liveBoard(m.cid, 'player');
  if (m.kind === 'live') liveResultsUI(m);
  if (r === 'p' && m.toFriend && friendOf(m.toFriend)) deliverChallenge(m, myPack);
}
let results_ctx = null;
async function deliverChallenge(m, myPack){
  const F = friendOf(m.toFriend), st = S.sent[m.cid], T = TOPICS[m.topic];
  const url = linkFor('ch', m.topic, m.refs, myPack, null, m.date, m.T, m.cid);
  st.shared = true; st.url = url; st.to = F.i; S.challenges.sent++; save();
  const el = () => $('friendSend');
  try{
    await sendTo(F.code, {type:'ch', link: url.split('#')[1]});
    if (el()){ el().className = 'sync ok'; el().innerHTML = `${icon('check','sm')}Sent to ${esc(F.n)}. Their score shows up here when they play.`; }
    liveBoard(m.cid, 'sender');
  }catch(e){
    if (!el()) return;
    el().className = 'sync bad';
    el().innerHTML = `<span>Couldn't reach ${esc(F.n)}'s inbox (no connection?).</span><button type="button" class="btn" id="fsLink">${icon('link','sm')}Send as a link instead</button>`;
    $('fsLink').onclick = () => shareLink(url, `${myPack.n} challenged you on Two Minds: ${T.name}. ${myPack.s} points to beat!`);
  }
  const nb = checkBadges(); save(); badgeToast(nb);
}

function countUp(root){
  root.querySelectorAll('[data-count]').forEach(el => {
    const to = +el.dataset.count, t0 = performance.now(), dur = 900;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches){ el.textContent = to; return; }
    const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
/* automatic send for the person who played a link */
async function autoSend(cid){
  const pl = S.played[cid]; if (!pl) return;
  const el = () => $('syncState');
  try{
    await relayPost(cid, pl.pack);
    pl.sent = true; save();
    if (el()) el().innerHTML = `${icon('check','sm')}Score sent to ${esc(pl.A.n)} automatically`;
    if (el()) el().className = 'sync ok';
    liveBoard(cid, 'player');
  }catch(e){
    if (!el()) return;
    el().className = 'sync bad';
    el().innerHTML = `<span>Couldn't send automatically (no connection?).</span><button type="button" class="btn" id="manualRes">${icon('link','sm')}Send result link instead</button>`;
    $('manualRes').onclick = async () => {
      const ctx = results_ctx; if (!ctx) return;
      const m = ctx.m, ghostPack = {i: m.ghost.i, n: m.ghost.n, c: m.ghost.c, lv: m.ghost.lv, p: m.ghost.picks, s: ctx.s1};
      const url = linkFor('res', m.topic, m.refs, ghostPack, ctx.myPack, m.date, m.T, m.cid);
      const text = `Two Minds result: ${ctx.myPack.n} ${ctx.myPack.s} vs ${m.ghost.n} ${ctx.s1} in ${TOPICS[m.topic].name}`;
      showLinkBox(url, text); await shareLink(url, text);
    };
  }
}

/* live leaderboard for a challenge (on the results screen) */
let liveTimer = 0;
function boardEntries(cid, role){
  const out = {};
  if (role === 'sender'){
    const st = S.sent[cid]; if (!st) return [];
    out[S.id] = {i: S.id, n: nameOf('me'), c: S.me.color, s: st.s, me: true, host: true};
    Object.entries(st.res || {}).forEach(([i, x]) => out[i] = {i, n: x.n, c: x.c, s: x.s});
  } else {
    const pl = S.played[cid]; if (!pl) return [];
    if (pl.A) out[pl.A.i || 'host'] = {i: pl.A.i, n: pl.A.n, c: pl.A.c, s: pl.A.s, host: true};
    Object.entries(pl.others || {}).forEach(([i, x]) => out[i] = {i, n: x.n, c: x.c, s: x.s});
    out[S.id] = {i: S.id, n: nameOf('me'), c: S.me.color, s: pl.s, me: true};
  }
  return Object.values(out).sort((a, b) => b.s - a.s);
}
function boardList(entries){
  return `<ol class="lb">${entries.map((e, k) => `<li class="${e.me ? 'me' : ''}"><span class="rk">${k + 1}</span>${avatar(e.n, e.c, 's')}<span class="ln">${esc(e.n)}${e.me ? ' <em>you</em>' : ''}${e.host ? ' <em>sent it</em>' : ''}</span><b>${e.s}</b></li>`).join('')}</ol>`;
}
function liveBoard(cid, role){
  const box = $('liveBoard'); if (!box) return;
  const draw = () => {
    const b = $('liveBoard'); if (!b) return;
    const es = boardEntries(cid, role);
    b.hidden = false;
    b.innerHTML = `<div class="h" style="margin:0 0 10px">Leaderboard<span class="live"><i></i>live</span></div>${es.length > 1 ? boardList(es) : `<p class="small">Waiting for players… Scores appear here as soon as someone finishes your link.</p>${boardList(es)}`}`;
  };
  draw();
  clearInterval(liveTimer);
  const pull = async () => {
    if (current !== 'results' || !$('liveBoard') || document.hidden){ if (current !== 'results') clearInterval(liveTimer); return; }
    try{
      if (role === 'sender') await syncChallenges(true);
      else {
        const list = await relayPoll(cid), pl = S.played[cid];
        if (pl){ pl.others = pl.others || {}; list.forEach(x => { if (x.i !== S.id && (!pl.A || x.i !== pl.A.i)) pl.others[x.i] = {n:x.n, c:x.c, s: scoreOf(x.p, pl.ms || 10000)}; }); save(); }
      }
    }catch(e){}
    draw();
  };
  if (results_ctx) results_ctx.board = draw;
  pull(); liveTimer = setInterval(pull, 12000);
}

/* leaderboard screen for a challenge you sent */
function renderBoard(opts = {}){
  if (opts.cid) boardCid = opts.cid;
  const cid = boardCid, st = S.sent[cid] || null, pl = S.played[cid] || null;
  const role = st ? 'sender' : 'player', T = TOPICS[(st || pl || {}).t] || TOPICS.mixed;
  const es = boardEntries(cid, role);
  const age = Date.now() - (st || pl || {at: Date.now()}).at;
  $('board').innerHTML = `<div class="col">
    <div class="top"><button class="iconbtn" type="button" data-go="home" aria-label="Back">${icon('back')}</button><span class="pill" style="--c:${T.c}">${icon(TOPIC_ICON[T.id] || 'star','sm')}${esc(T.name)}</span></div>
    <h1 class="winner" style="text-align:left">${role === 'sender' ? 'Your challenge' : 'You already played this'}</h1>
    <div class="card">${es.length > 1 ? boardList(es) : `<p class="small" style="margin-bottom:10px">No one has finished it yet.</p>${boardList(es)}`}</div>
    ${role === 'sender' && st.url ? `<button class="cta" type="button" id="bdShare">Share the link again<small>Anyone with the link can play</small></button>` : ''}
    ${role === 'player' && pl.A ? `<button class="cta" type="button" id="bdBack">Challenge ${esc(pl.A.n)} back</button>` : ''}
    <p class="small">${age < 36*3600e3 ? 'Scores sync automatically while the challenge is fresh (about 12 hours after each play).' : 'This challenge is older than a day, so new scores no longer sync automatically.'}</p>
  </div>`;
  if ($('bdShare')) $('bdShare').onclick = () => shareLink(st.url, `${nameOf('me')} challenged you on Two Minds: ${T.name}. ${st.s} points to beat!`);
  if ($('bdBack')) $('bdBack').onclick = () => startSolo({kind:'new', topic: pl.t === 'daily' ? 'mixed' : pl.t});
  if (role === 'sender' && !opts.keepScroll) syncChallenges();
}
function showLinkBox(url, text){
  const box = $('lbox'); if (!box) return;
  box.hidden = false;
  box.innerHTML = `<input readonly value="${esc(url)}" id="lurl" aria-label="Challenge link"><div class="row"><button class="btn" type="button" id="lcopy">${icon('copy','sm')}Copy link</button><a class="btn green" href="https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}" target="_blank" rel="noopener">WhatsApp</a></div>`;
  $('lcopy').onclick = async () => { try{ await navigator.clipboard.writeText(text + '\n' + url); toast('Link copied'); }catch(e){ const i = $('lurl'); i.select(); toast('Select and copy the link'); } };
}

/* ================= incoming links ================= */
function handleHash(){
  const h = location.hash;
  if (h.startsWith('#L=')) return handleLiveHash(h);
  if (h.startsWith('#F=')) return handleFriendHash(h);
  if (!h.startsWith('#c=')) return false;
  let p = null;
  try{ p = b64d(h.slice(3)); }catch(e){}
  history.replaceState(null, '', baseUrl());
  if (!validLink(p)){ toast('That link looks broken or is from an older version'); return false; }
  $('modal').hidden = true;
  const refs = unpackRefs(p.q), T = TOPICS[p.t] || TOPICS.mixed;
  learnFrame(p.A); if (p.B) learnFrame(p.B);
  const A = p.A, B = p.B;
  if (p.k === 'res' && B){
    // final scoreboard: A played first, B replied
    const meIsA = A.i ? A.i === S.id : A.n === nameOf('me'), mine = meIsA ? A : B, theirs = meIsA ? B : A;
    const r = mine.s > theirs.s ? 'w' : mine.s < theirs.s ? 'l' : 'd';
    const rows = refs.map((ref, i) => { const q = refQ(ref);
      const cell = pk => { const o = pk.p[i] || [-1]; return `<span class="c ${o[0] === 0 ? 'ok' : ''}">${o[0] === 0 ? '✓ ' + (o[1]/1000).toFixed(1) + 's' : o[0] === -1 ? 'too slow' : '✗'}</span>`; };
      return `<div class="rr"><span class="n">${i === ROUNDS - 1 ? 'Bonus' : 'R' + (i + 1)}</span>${cell(mine)}${cell(theirs)}</div>`; }).join('');
    $('incoming').innerHTML = `<div class="col"><div class="kicker"><span class="pill" style="--c:${T.c}">${icon(TOPIC_ICON[T.id] || 'star','sm')}${esc(T.name)} · Link result</span></div>
      <h1 class="winner">${r === 'w' ? `${esc(mine.n)} wins!` : r === 'l' ? `${esc(theirs.n)} wins!` : "It's a draw!"}</h1>
      <div class="card board"><div class="sb">${mine.s > theirs.s ? `<span class="crown">${icon('crown')}</span>` : ''}${avatar(mine.n, mine.c, 'l')}<b style="color:${safeColor(mine.c)}">${mine.s}</b><span class="nm2">${esc(mine.n)}</span></div><em>VS</em><div class="sb">${theirs.s > mine.s ? `<span class="crown">${icon('crown')}</span>` : ''}${avatar(theirs.n, theirs.c, 'l')}<b style="color:${safeColor(theirs.c)}">${theirs.s}</b><span class="nm2">${esc(theirs.n)}</span></div></div>
      <div class="card rounds"><div class="rr head"><span class="n"></span><span class="c" style="color:${mine.c}">${esc(mine.n)}</span><span class="c" style="color:${theirs.c}">${esc(theirs.n)}</span></div>${rows}</div>
      <button class="cta" type="button" id="incRe">Rematch by link</button><button class="btn" type="button" data-go="home">Home</button></div>`;
    go('incoming');
    if (r === 'w') { confetti(120); SFX.win(); }
    const key = 'res:' + hash(h);
    if (meIsA && p.x && own(S.sent, p.x)){
      // same bookkeeping as a score that arrives through the relay, so it can never count twice
      const f = applyResult(p.x, Object.assign({}, B)); if (f){ checkBadges(); save(); }
    }
    else if (meIsA && !S.history.some(x => x.key === key)){
      const pend = S.history.findIndex(x => x.r === 'p' && x.t === p.t && x.s[0] === mine.s);
      if (pend !== -1) S.history.splice(pend, 1);
      S.history.unshift({key, t: p.t, m:'Link', o: theirs.n, s:[mine.s, theirs.s], r, when: new Date().toLocaleDateString(undefined, {day:'numeric', month:'short'})});
      if (r === 'w'){ S.challenges.won++; } save();
    }
    $('incRe').onclick = () => startSolo({kind:'new', topic: p.t === 'daily' ? 'mixed' : p.t});
    return true;
  }
  // a challenge to play
  if (p.x && (A.i === S.id || S.played[p.x])){
    if (A.i === S.id && !own(S.sent, p.x)) S.sent[p.x] = {t: p.t, s: A.s, ms: p.ms || 10000, at: Date.now(), res: {}, shared: true, url: baseUrl() + h};
    go('board', {cid: p.x});
    if (A.i === S.id) toast('This is your own challenge. Here is who played it');
    return true;
  }
  $('incoming').innerHTML = `<div class="col" style="min-height:70vh;align-content:center">
    <div style="display:grid;justify-items:center;gap:14px;text-align:center">
      ${avatar(A.n, A.c, 'l')}
      <h1 class="winner">${esc(A.n)} challenged you</h1>
      <span class="pill" style="--c:${T.c}">${icon(TOPIC_ICON[T.id] || 'star','sm')}${esc(T.name)}</span>
      <p class="lede">Same 7 questions, ten seconds each. You'll see when ${esc(A.n)} answered, and their pick is revealed after yours. Score to beat: <b style="color:var(--gold)">${A.s}</b></p>
    </div>
    <div class="card stack"><div class="field">Your name<input id="incName" maxlength="14" autocomplete="off" value="${esc(S.me.name)}" placeholder="Type your name"></div>
      <div class="colors" id="incColors">${COLORS.map(c => `<button type="button" style="--c:${c}" data-c="${c}" aria-pressed="${S.me.color === c}" aria-label="Colour"></button>`).join('')}</div></div>
    <p class="small" style="text-align:center">Your score goes back to ${esc(A.n)} automatically when you finish.</p>
    <button class="cta" type="button" id="incGo">Accept challenge</button>
    <button class="btn" type="button" data-go="home">Not now</button></div>`;
  go('incoming');
  if (S.me.color === A.c){ S.me.color = freeColor([A.c]); save(); $('incColors').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x.dataset.c === S.me.color)); }
  $('incColors').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; S.me.color = b.dataset.c; save(); $('incColors').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
  $('incGo').onclick = () => {
    const n = $('incName').value.trim(); if (!n){ toast('Type your name first'); $('incName').focus(); return; }
    S.me.name = n;
    save();
    startSolo({kind:'reply', topic: p.t, refs, ghost:{n:A.n, c:A.c, lv:A.lv, i:A.i, picks:A.p}, date:p.d, ms:p.ms, cid: p.x});
  };
  return true;
}
addEventListener('hashchange', () => {
  if (!(location.hash.startsWith('#c=') || location.hash.startsWith('#L=') || location.hash.startsWith('#F='))) return;
  if (MM.active) mmStop(true);
  if (LV.room) liveBye();
  if (M){ M = null; cancelAnimationFrame(raf); }
  $('duel').hidden = true; $('solo').hidden = true; $('vs').hidden = true;
  handleHash();
});

/* ================= live play: two phones at the same time ================= */
// Both phones listen to one relay topic (server-sent events) and post small messages:
// join -> go (host picks the first joiner) -> one answer per round from each side -> rematch / bye.
// Each phone times its own rounds; answers carry the elapsed ms so both phones score identically.
const LIVE_GRACE = 6000;
const LV = {es:null, room:null, seen:new Set(), opp:null, role:null, game:0, buf:{}, started:false, pendingRm:null, ctx:null, errs:0, opened:false};
const liveTopic = room => 'twominds-live-' + room;
const validMini = x => x && validFrame(x.f) && typeof x.n === 'string' && x.n.trim() && x.n.length <= 24 && /^#[0-9a-f]{3,8}$/i.test(String(x.c)) && typeof x.i === 'string' && /^[a-z0-9]{1,16}$/.test(x.i) && !RESERVED(x.i) && (x.lv === undefined || (Number.isInteger(x.lv) && x.lv >= 0 && x.lv < 1000));
// since: 'all' for a brand-new room (host), or the id of my own join message (guest) so an old match
// that happened in the same room earlier is never replayed into this one
function liveOpen(room, onMsg, since = 'all'){
  liveClose();
  Object.assign(LV, {room, seen:new Set(), onMsg, errs:0, opened:false, since});
  liveConnect();
}
function liveConnect(){
  const room = LV.room;
  try{
    const es = new EventSource(RELAY + liveTopic(room) + '/sse?since=' + encodeURIComponent(LV.since || 'all'));
    LV.es = es;
    es.onopen = () => { if (LV.es === es){ LV.opened = true; LV.errs = 0; reviveOk('lv'); } };
    es.onerror = () => {
      if (LV.es !== es) return;
      LV.errs++;
      if (es.readyState === 2) reviveLater('lv', () => { if (LV.es === es && LV.room === room) liveConnect(); });   // pick up where we left off
    };
    es.onmessage = ev => {
      if (LV.es !== es) return;   // a closed room's late messages must never reach the current room
      let m; try{ m = JSON.parse(ev.data); }catch(e){ return; }
      if (!m || m.event !== 'message' || typeof m.message !== 'string' || LV.seen.has(m.id)) return;
      LV.seen.add(m.id); LV.since = m.id;
      let x; try{ x = JSON.parse(m.message); }catch(e){ return; }
      if (!x || typeof x !== 'object' || x.i === S.id || typeof x.type !== 'string') return;
      if (x.gm !== undefined && !(Number.isInteger(x.gm) && x.gm >= 0 && x.gm < 1000)) return;
      try{ LV.onMsg && LV.onMsg(x); }catch(e){}
    };
  }catch(e){ LV.errs = 99; }
}
// guest: post the join first, then listen from that message on
async function liveJoin(room, join, onMsg){
  liveClose(); LV.room = room;
  const res = await postTopic(liveTopic(room), Object.assign({i: S.id, gm: LV.game, type:'join'}, join));
  if (LV.room !== room) return;                    // cancelled meanwhile
  liveOpen(room, onMsg, res && typeof res.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(res.id) ? res.id : '20s');
}
function liveClose(){ if (LV.es) LV.es.close(); LV.es = null; LV.onMsg = null; }
function livePost(obj){ return LV.room ? postTopic(liveTopic(LV.room), Object.assign({i: S.id, gm: LV.game}, obj)) : Promise.reject(new Error('no room')); }
function liveBye(){
  if (LV.room) livePost({type:'bye'}).catch(() => {});
  const es = LV.es; LV.es = null; LV.onMsg = null; LV.room = null; LV.opp = null; LV.started = false; LV.pendingRm = null; LV.offerRm = null;
  clearTimeout(LV.joinT);
  setTimeout(() => { if (es) es.close(); }, 400);
}
// closing the tab or app mid-match tells the other phone straight away
addEventListener('pagehide', () => {
  if (!LV.room || !LV.opp) return;
  try{ navigator.sendBeacon(RELAY + liveTopic(LV.room), JSON.stringify({i: S.id, gm: LV.game, type:'bye'})); }catch(e){}
});
function liveAnswer(o, ms){
  if (!M) return;
  M.liveSent = true;
  const msg = {type:'a', r: M.round, o, ms}, gm = LV.game;     // the round is fixed now, retries can't drift to the next one
  const send = n => livePost(Object.assign(msg, {gm})).catch(() => { if (n < 3 && LV.game === gm) setTimeout(() => send(n + 1), 700 * (n + 1)); });
  send(0);
}

function liveBegin(refs, t, ms){
  if (M && M.phase !== 'done') return;              // never start a match on top of another one
  LV.chat = LV.chat || []; emoCount = 0;
  const picks = []; Object.entries(own(LV.buf, LV.game) ? LV.buf[LV.game] : {}).forEach(([r, v]) => picks[+r] = v);
  startSolo({kind:'live', topic:t, refs, ms, ghost:{n: LV.opp.n, c: LV.opp.c, lv: LV.opp.lv, i: LV.opp.i, picks, live:true}});
}
function liveCommon(x){
  if (!LV.opp || x.i !== LV.opp.i) return;
  if (x.type === 'a'){
    if (!Number.isInteger(x.r) || x.r < 0 || x.r >= ROUNDS || !Number.isInteger(x.o) || x.o < -1 || x.o > 3 || !Number.isFinite(x.ms) || x.ms < 0 || x.ms > 20000) return;
    if (M && M.kind === 'live' && x.gm === LV.game && M.ghost.i === x.i){ if (M.ghost.picks[x.r] === undefined) M.ghost.picks[x.r] = [x.o, x.ms]; }
    else if (Number.isInteger(x.gm) && x.gm >= LV.game){ const b = own(LV.buf, x.gm) ? LV.buf[x.gm] : (LV.buf[x.gm] = {}); if (!own(b, x.r)) b[x.r] = [x.o, x.ms]; }
    return;
  }
  if (x.type === 'fin'){ liveFin(x); return; }
  if (x.type === 'bye'){
    LV.opp.gone = true;
    if (M && M.kind === 'live'){ M.ghost.gone = true; toast(`${LV.opp.n} left the match`); }
    if (current === 'results') liveResultsUI(null);
    if (current === 'lobby' && LV.role === 'guest') { toast(`${LV.opp.n} closed the room`); go('home'); }
    return;
  }
  if (x.type === 'rm'){
    if (!validRefs(x.q) || !topicOk(x.t) || (x.ms !== 10000 && x.ms !== 15000) || typeof x.id !== 'string' || x.id.length > 16) return;
    const refs = unpackRefs(x.q);
    const incoming = {id: x.id, refs, t: x.t, ms: x.ms};
    if (LV.pendingRm){ if (x.i < S.id){ LV.pendingRm = null; acceptRematch(incoming); } return; }
    LV.offerRm = incoming;
    if (current === 'results') liveResultsUI(null);
    else toast(`${LV.opp.n} wants a rematch`);
    SFX.badge(); buzz([20, 40, 20]);
    return;
  }
  if (x.type === 'emo'){ if (Number.isInteger(x.e) && x.e >= 0 && x.e < EMOS.length) showEmo(EMOS[x.e], 'opp'); return; }
  if (x.type === 'chat'){
    if (typeof x.t !== 'string' || !x.t.trim() || x.t.length > 80) return;
    LV.chat.push({me:false, t:x.t.trim()}); renderChat();
    if (current !== 'results' || !$('chatBox')) toast(`${LV.opp.n}: ${x.t.trim()}`);
    tone(880, 0.06, 'sine', 0.05); return;
  }
  if (x.type === 'rmok' && LV.pendingRm && x.id === LV.pendingRm.id){
    const r = LV.pendingRm; LV.pendingRm = null; LV.game++; liveBegin(r.refs, r.t, r.ms);
  }
}
// after a live match each phone sends every answer it gave; if one went missing on the way, both sides fix the score
function liveFin(x){
  const L = LV.last; if (!L || x.gm !== L.gm || !validPicks(x.p) || L.fixed) return;
  const their = x.p, same = their.every((k, r) => { const g = L.picks[r] || [-1, 0]; return k[0] === g[0] && (k[0] !== 0 || Math.abs(k[1] - g[1]) < 2); });
  if (same) return;
  L.fixed = true;
  const s1 = scoreOf(their, L.T), s0 = L.s0, r = s0 > s1 ? 'w' : s1 > s0 ? 'l' : 'd';
  const h = S.history.find(e => e.key === L.hkey);
  if (h){ h.s = [s0, s1]; h.r = r; }
  const rv = own(S.rivals, L.key) ? S.rivals[L.key] : null;
  if (rv && r !== L.r){ const dec = {w:'w', l:'l', d:'d'}[L.r]; if (rv[dec] > 0) rv[dec]--; rv[r]++; }
  const st = S.stats.me;
  if (r !== L.r){ const f = {w:'won', l:'lost', d:'draw'}; if (st[f[L.r]] > 0) st[f[L.r]]--; st[f[r]]++; }
  save();
  if (current === 'results'){
    const b = $('results').querySelectorAll('.board .sb b'); if (b[1]){ b[1].textContent = s1; b[1].removeAttribute('data-count'); }
    const w = $('results').querySelector('.winner'); if (w) w.textContent = r === 'w' ? 'You win!' : r === 'l' ? `${LV.opp ? LV.opp.n : 'They'} win${LV.opp ? 's' : ''}` : "It's a draw!";
  }
  toast('Scores synced with the other phone');
}
const EMOS = ['😂','🔥','😮','👏','😤','❤️'];
const QUICK = ['GG!', 'Rematch?', 'Lucky guess 😏', 'You\'re too good ❤️', 'Again!', 'So close 😩'];
let emoLast = 0, emoCount = 0;
function sendEmo(k){
  const now = Date.now();
  if (now - emoLast < 1500 || emoCount >= 15){ return; }
  emoLast = now; emoCount++;
  showEmo(EMOS[k], 'me'); livePost({type:'emo', e:k}).catch(() => {}); buzz(8);
}
function showEmo(ch, side){
  const host = $('solo').hidden ? document.body : $('solo');
  const el = document.createElement('div'); el.className = 'emo ' + side; el.textContent = ch;
  el.style.left = (side === 'me' ? 18 + Math.random()*14 : 64 + Math.random()*14) + '%';
  host.appendChild(el); setTimeout(() => el.remove(), 2200);
  if (side === 'opp') tone(1200, 0.05, 'triangle', 0.04);
}
function renderChat(){
  const box = $('chatList'); if (!box) return;
  box.innerHTML = LV.chat.length ? LV.chat.map(c => `<div class="msg ${c.me ? 'me' : ''}">${esc(c.t)}</div>`).join('') : `<p class="small">Say something to ${esc(LV.opp ? LV.opp.n : 'them')}</p>`;
  box.scrollTop = box.scrollHeight;
}
function sendChat(t){
  t = String(t || '').trim().slice(0, 80); if (!t || !LV.opp || LV.opp.gone) return;
  if (LV.chatSent >= 30) { toast('That is a lot of messages. Rematch?'); return; }
  LV.chatSent = (LV.chatSent || 0) + 1;
  LV.chat.push({me:true, t}); renderChat(); livePost({type:'chat', t}).catch(() => toast('Message not sent'));
}
function acceptRematch(r){
  LV.offerRm = null;
  livePost({type:'rmok', id: r.id}).then(() => { LV.game++; liveBegin(r.refs, r.t, r.ms); }).catch(() => toast('Connection problem. Try again'));
}
function liveResultsUI(m){
  const box = $('liveRm'), btn = $('lvRe'); if (!box || !btn) return;
  if (!$('chatBox')){
    box.insertAdjacentHTML('beforebegin', `<div class="card chat" id="chatBox"><div class="h" style="margin:0 0 10px">${icon('chat','sm')} Chat</div><div class="chatlist" id="chatList"></div>
      <div class="quick">${QUICK.map((q, k) => `<button type="button" class="chip" data-q="${k}">${esc(q)}</button>`).join('')}</div>
      <form class="addrow" id="chatForm" autocomplete="off"><input id="chatIn" maxlength="80" placeholder="Message"><button class="pillbtn" type="submit">Send</button></form></div>`);
    $('chatBox').querySelectorAll('[data-q]').forEach(b => b.onclick = () => sendChat(QUICK[+b.dataset.q]));
    $('chatForm').onsubmit = e => { e.preventDefault(); sendChat($('chatIn').value); $('chatIn').value = ''; };
    renderChat();
  }
  const opp = LV.opp;
  if (!opp || opp.gone){ box.innerHTML = `<div class="sync">${opp ? esc(opp.n) + ' left the match' : 'The live match has ended'}</div>`; btn.hidden = true; }
  else if (LV.offerRm){
    box.innerHTML = `<div class="offer">${avatar(opp.n, opp.c, 's')}<span><b>${esc(opp.n)}</b> wants a rematch</span><button type="button" class="cta" id="rmYes">Accept</button></div>`;
    $('rmYes').onclick = () => acceptRematch(LV.offerRm);
    btn.hidden = true;
  } else { box.innerHTML = ''; btn.hidden = false; }
  btn.onclick = () => {
    if (!LV.opp || LV.opp.gone) return;
    const t = LV.ctx.t === 'daily' ? 'mixed' : LV.ctx.t, refs = pickRefs(t), id = randId(6);
    LV.pendingRm = {id, refs, t, ms: LV.ctx.ms};
    livePost({type:'rm', id, t, q: packRefs(refs), ms: LV.ctx.ms}).catch(() => { LV.pendingRm = null; toast('Connection problem. Try again'); liveResultsUI(null); });
    btn.disabled = true; btn.innerHTML = `Waiting for ${esc(LV.opp.n)}…<small>They'll see your rematch request</small>`;
  };
  if ($('lvHome')) $('lvHome').onclick = () => { liveBye(); go('home'); };
}

/* host: make a room, share it, wait */
function startLive(topicId, friendId){
  if (MM.active) mmStop(true);
  if (LV.room) liveBye();
  noteRecent(topicId);
  const refs = pickRefs(topicId), room = randId(), ms = S.settings.relaxed ? 15000 : 10000;
  const host = {i: S.id, n: nameOf('me'), c: S.me.color, f: myFrame() || undefined, lv: overallLevel('me')};
  const url = baseUrl() + '#L=' + b64e({v:2, k:'live', r: room, t: topicId, q: packRefs(refs), h: host, ms});
  const F = friendId && friendOf(friendId);
  Object.assign(LV, {chat:[], chatSent:0, role:'host', game:1, buf:{}, opp:null, started:false, pendingRm:null, offerRm:null, last:null, ctx:{room, refs, t: topicId, ms, url, friend: F ? F.i : null}});
  if (F) sendTo(F.code, {type:'lv', link: url.split('#')[1]}).then(() => { const e = $('lbState'); if (e && !LV.started){ e.className = 'sync ok'; e.innerHTML = `${icon('check','sm')}Invite sent to ${esc(F.n)}`; } }).catch(() => { const e = $('lbState'); if (e){ e.className = 'sync bad'; e.textContent = `Couldn't reach ${F.n}'s inbox. Share the link instead.`; } });
  liveOpen(room, x => {
    if (x.type === 'join' && !LV.started && validMini(x)){
      LV.started = true; LV.opp = {i: x.i, n: x.n, c: x.c, lv: x.lv}; learnFrame(x);
      livePost({type:'go', g: x.i}).then(() => { recordSeen(); liveBegin(refs, topicId, ms); })
        .catch(() => { LV.started = false; LV.opp = null; toast('Connection problem. Ask them to tap Join again'); });
      return;
    }
    if (x.type === 'join' && LV.started && LV.opp && x.i !== LV.opp.i){ livePost({type:'full', g: x.i}).catch(() => {}); return; }   // tell latecomers the room is taken
    liveCommon(x);
  });
  renderLobby();
  go('lobby');
}
function recordSeen(){ if (LV.opp) S.rivals[rivalKey(LV.opp.n, LV.opp.i)] && (S.rivals[rivalKey(LV.opp.n, LV.opp.i)].at = Date.now()); }
function renderLobby(){
  const c = LV.ctx, T = TOPICS[c.t] || TOPICS.mixed, F = c.friend && friendOf(c.friend);
  const text = `${nameOf('me')} wants to play Two Minds live: ${T.name}. Tap to join!`;
  $('lobby').innerHTML = `<div class="col lobby">
    <div class="kicker"><span class="pill" style="--c:${T.c}">${icon(TOPIC_ICON[T.id] || 'star','sm')}${esc(T.name)} · Live</span></div>
    <h1 class="winner">${F ? 'Waiting for ' + esc(F.n) : 'Waiting for a player'}</h1>
    <div class="lobby-vs">
      <div class="sb">${avatar(nameOf('me'), S.me.color, 'l')}<span class="nm2">${esc(nameOf('me'))}</span></div>
      <div class="pulse"><i></i><i></i><i></i></div>
      <div class="sb ghostav">${F ? avatar(F.n, F.c, 'l') : avatar('?', '#8b92bf', 'l', '?')}<span class="nm2">${F ? esc(F.n) : 'Waiting…'}</span></div>
    </div>
    <p class="lede" style="text-align:center">${F ? `${esc(F.n)} gets an invite in the app. If their app is closed, give them a nudge.` : 'Send this link. The match starts the moment they open it and tap <b>Join</b>. Keep this screen open.'}</p>
    <button class="${F ? 'btn' : 'cta'}" type="button" id="lbShare">${icon('send','sm')}${F ? 'Nudge with a link' : 'Share live link'}</button>
    <div class="linkbox" id="lbox" hidden></div>
    <div class="sync" id="lbState"><span class="spin"></span>${F ? 'Sending invite…' : 'Room open'}</div>
    <button class="btn ghost" type="button" id="lbCancel">Cancel</button>
  </div>`;
  $('lbShare').onclick = async () => { showLinkBox(c.url, text); await shareLink(c.url, text); };
  $('lbCancel').onclick = () => { liveBye(); go('home'); };
  clearTimeout(LV.lobbyT);
  LV.lobbyT = setTimeout(() => { if (current === 'lobby' && !LV.opened && LV.errs > 0 && $('lbState')){ $('lbState').className = 'sync bad'; $('lbState').textContent = "Can't reach the live server. Check your internet, or use Challenge by link instead."; } }, 7000);
}

/* guest: open a live link */
function handleLiveHash(h){
  let p = null; try{ p = b64d(h.slice(3)); }catch(e){}
  history.replaceState(null, '', baseUrl());
  if (!validLiveLink(p)){ toast('That live link looks broken'); return false; }
  $('modal').hidden = true;
  const T = TOPICS[p.t], H = p.h, refs = unpackRefs(p.q); learnFrame(H);
  if (H.i === S.id){ toast('This is your own live link. Send it to someone else'); return false; }
  $('incoming').innerHTML = `<div class="col" style="min-height:70vh;align-content:center">
    <div style="display:grid;justify-items:center;gap:14px;text-align:center">
      <div class="lobby-vs" style="width:100%"><div class="sb">${avatar(H.n, H.c, 'l')}<span class="nm2">${esc(H.n)}</span></div><div class="pulse live"><i></i><i></i><i></i></div><div class="sb">${avatar(S.me.name || '?', S.me.color, 'l', S.me.name ? '' : '?')}<span class="nm2">${esc(S.me.name || 'You')}</span></div></div>
      <h1 class="winner">${esc(H.n)} wants to play live</h1>
      <span class="pill" style="--c:${T.c}">${icon(TOPIC_ICON[T.id] || 'star','sm')}${esc(T.name)}</span>
      <p class="lede">You're both online now. Same 7 questions at the same time, ten seconds each.</p>
    </div>
    <div class="card stack"><div class="field">Your name<input id="incName" maxlength="14" autocomplete="off" value="${esc(S.me.name)}" placeholder="Type your name"></div>
      <div class="colors" id="incColors">${COLORS.map(c => `<button type="button" style="--c:${c}" data-c="${c}" aria-pressed="${S.me.color === c}" aria-label="Colour"></button>`).join('')}</div></div>
    <button class="cta" type="button" id="incGo">${icon('zap','sm')}Join live match</button>
    <div class="sync" id="joinState" hidden></div>
    <button class="btn" type="button" data-go="home">Not now</button></div>`;
  go('incoming');
  if (autoJoin && S.me.name){ autoJoin = false; setTimeout(() => $('incGo') && $('incGo').click(), 50); }
  if (S.me.color === H.c){ S.me.color = freeColor([H.c]); save(); }
  $('incColors').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x.dataset.c === S.me.color));
  $('incColors').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; S.me.color = b.dataset.c; save(); $('incColors').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); };
  $('incGo').onclick = () => {
    const n = $('incName').value.trim(); if (!n){ toast('Type your name first'); $('incName').focus(); return; }
    S.me.name = n; save();
    const st = $('joinState'); st.hidden = false; st.className = 'sync'; st.innerHTML = `<span class="spin"></span>Joining ${esc(H.n)}…`;
    $('incGo').disabled = true;
    if (LV.room) liveBye();
    Object.assign(LV, {chat:[], chatSent:0, role:'guest', game:1, buf:{}, opp:{i: H.i, n: H.n, c: H.c, lv: H.lv}, started:false, pendingRm:null, offerRm:null, last:null, ctx:{room: p.r, refs, t: p.t, ms: p.ms}});
    const stop = () => { clearTimeout(LV.joinT); liveClose(); LV.room = null; };
    liveJoin(p.r, {n: S.me.name, c: S.me.color, f: myFrame() || undefined, lv: overallLevel('me')}, x => {
      if (x.i !== H.i) return;
      if (x.type === 'go' || x.type === 'full'){
        if (x.type === 'go' && x.g === S.id){ if (!LV.started){ LV.started = true; clearTimeout(LV.joinT); liveBegin(refs, p.t, p.ms); } }
        else if (!LV.started && (x.type === 'go' || x.g === S.id)){ stop(); st.className = 'sync bad'; st.textContent = `Someone else already joined this match. Ask ${H.n} for a new live link.`; }
        return;
      }
      if (x.type === 'bye' && !LV.started){ stop(); st.className = 'sync bad'; st.textContent = `${H.n} closed this room. Ask for a new live link.`; return; }
      liveCommon(x);
    }).catch(() => {
      LV.room = null; st.className = 'sync bad'; st.textContent = "Couldn't connect. Check your internet and try again."; $('incGo').disabled = false;
    });
    clearTimeout(LV.joinT);
    LV.joinT = setTimeout(() => { if (!LV.started && current === 'incoming'){ stop(); st.className = 'sync bad'; st.textContent = `No answer from ${H.n}. They may have left the waiting screen. Ask them to open a new live room.`; $('incGo').disabled = false; } }, 20000);
  };
  return true;
}

/* ================= quick match: pair up with whoever picks the same topic ================= */
// Everyone searching a topic posts a short 'seek' to that topic's public pool and listens to it.
// Pairing rule (no server needed): the player with the smaller id hosts; the other one joins the host's
// room using the normal live protocol. If a room was taken by someone else, keep searching.
const MM = {es:null, active:false, topic:null, seekT:0, offerT:0, tickT:0, start:0, joining:null, taken:new Map(), seen:new Set(), room:null, refs:null, ms:10000};
const mmTopic = t => 'twominds-mm-v1-' + t;
function mmMe(){ return {i: S.id, n: nameOf('me'), c: S.me.color, f: myFrame() || undefined, lv: overallLevel('me')}; }
function mmStop(announce){
  clearInterval(MM.seekT); clearTimeout(MM.offerT); clearInterval(MM.tickT); clearTimeout(MM.joinT);
  if (MM.es) MM.es.close(); MM.es = null;
  if (announce && MM.active && MM.topic) postTopic(mmTopic(MM.topic), Object.assign(mmMe(), {type:'gone', r: MM.room})).catch(() => {});
  MM.active = false; MM.joining = null;
}
function mmIsTaken(i){ const t = MM.taken.get(i); if (t && Date.now() - t < 15000) return true; MM.taken.delete(i); return false; }
const MM_MAX = 180000;     // stop searching after 3 minutes, so a forgotten search doesn't run all day
function startQuick(topicId){
  if (!S.me.name){ go('welcome'); return; }
  mmStop(true); if (LV.room) liveBye();
  noteRecent(topicId);
  Object.assign(MM, {active:true, topic: topicId, start: Date.now(), joining:null, taken:new Map(), gone:new Set(), seen:new Set(), room: null, refs: pickRefs(topicId), ms: S.settings.relaxed ? 15000 : 10000});
  mmHost();
  mmListen();
  mmSeek(); MM.seekT = setInterval(mmSeek, 12000);
  renderSearch(); go('lobby');
  MM.tickT = setInterval(() => {
    const el = $('mmSecs'); if (el) el.textContent = Math.round((Date.now() - MM.start) / 1000) + 's';
    if (MM.active && !MM.joining && !LV.started && Date.now() - MM.start > MM_MAX) mmTimeout();
  }, 1000);
  MM.offerT = setTimeout(mmOffer, 25000);
}
function mmListen(){
  const topic = MM.topic;
  try{
    const es = new EventSource(RELAY + mmTopic(topic) + '/sse?since=30s');
    MM.es = es;
    es.onmessage = ev => {
      if (MM.es !== es) return;
      let m; try{ m = JSON.parse(ev.data); }catch(e){ return; }
      if (!m || m.event !== 'message' || typeof m.message !== 'string' || MM.seen.has(m.id)) return;
      MM.seen.add(m.id);
      let x; try{ x = JSON.parse(m.message); }catch(e){ return; }
      try{ mmOn(x); }catch(e){}
    };
    es.onerror = () => { MM.errs = (MM.errs || 0) + 1; if (MM.es === es && es.readyState === 2) reviveLater('mm', () => { if (MM.es === es && MM.active && MM.topic === topic) mmListen(); }); };
    es.onopen = () => { MM.errs = 0; reviveOk('mm'); };
  }catch(e){}
}
function mmSeek(){
  if (!MM.active || MM.joining || LV.started || document.hidden) return;       // no posting from a phone in a pocket
  postTopic(mmTopic(MM.topic), Object.assign(mmMe(), {type:'seek', r: MM.room, t: MM.topic, q: packRefs(MM.refs), ms: MM.ms}))
    .then(() => { const e = $('mmState'); if (e && e.classList.contains('bad')){ e.className = 'sync'; e.innerHTML = `<span class="spin"></span>Searching… <span id="mmSecs"></span>`; } })
    .catch(() => { const e = $('mmState'); if (e){ e.className = 'sync bad'; e.textContent = "Can't reach the match server. Check your internet."; } });
}
// every hosting attempt gets a fresh room, so a join left over from an earlier attempt can't start a match
function mmHost(){
  MM.room = randId();
  const refs = MM.refs, t = MM.topic, ms = MM.ms;
  Object.assign(LV, {chat:[], chatSent:0, role:'host', game:1, buf:{}, opp:null, started:false, pendingRm:null, offerRm:null, last:null, ctx:{room: MM.room, refs, t, ms, quick:true}});
  liveOpen(MM.room, x => {
    if (x.type === 'join' && !LV.started && !MM.joining && MM.active && validMini(x)){
      LV.started = true; LV.opp = {i: x.i, n: x.n, c: x.c, lv: x.lv}; learnFrame(x);
      livePost({type:'go', g: x.i}).then(() => { mmFound(x); liveBegin(refs, t, ms); })
        .catch(() => { LV.started = false; LV.opp = null; });
      return;
    }
    if (x.type === 'join' && LV.started && LV.opp && x.i !== LV.opp.i){ livePost({type:'full', g: x.i}).catch(() => {}); return; }
    liveCommon(x);
  });
}
function mmFound(x){
  mmStop(true);
  recordSeen(); toast(`Matched with ${x.n}!`); SFX.right(); buzz([20, 40, 20]);
}
function mmOn(x){
  if (!MM.active || !x || typeof x !== 'object' || x.i === S.id || !validMini(x)) return;
  if (x.type === 'gone'){ if (validCid(x.r)) MM.gone.add(x.r); return; }        // that room is closed (the person may search again later)
  if (x.type !== 'seek' || x.t !== MM.topic || !validCid(x.r) || (x.ms !== 10000 && x.ms !== 15000) || !validRefs(x.q, false)) return;
  if (MM.gone.has(x.r)) return;
  learnFrame(x);
  if (x.i < S.id && !MM.joining && !LV.started && !mmIsTaken(x.r)) mmJoin(x, unpackRefs(x.q));     // the smaller id hosts
}
function mmJoin(x, refs){
  MM.joining = x.i;
  const st = $('mmState'); if (st){ st.className = 'sync ok'; st.innerHTML = `<span class="spin"></span>Found ${esc(x.n)}! Connecting…`; }
  Object.assign(LV, {chat:[], chatSent:0, role:'guest', game:1, buf:{}, opp:{i: x.i, n: x.n, c: x.c, lv: x.lv}, started:false, pendingRm:null, offerRm:null, last:null, ctx:{room: x.r, refs, t: x.t, ms: x.ms, quick:true}});
  const fail = () => {
    if (LV.started || !MM.active || MM.joining !== x.i) return;
    MM.taken.set(x.r, Date.now()); MM.joining = null; clearTimeout(MM.joinT);
    const e = $('mmState'); if (e){ e.className = 'sync'; e.innerHTML = `<span class="spin"></span>Searching… <span id="mmSecs"></span>`; }
    mmHost(); mmSeek();
  };
  liveJoin(x.r, {n: nameOf('me'), c: S.me.color, f: myFrame() || undefined, lv: overallLevel('me')}, y => {
    if (y.i !== x.i) return;
    if (y.type === 'full'){ if (y.g === S.id && !LV.started) fail(); return; }
    if (y.type === 'go'){
      if (y.g === S.id){ if (!LV.started && MM.active){ LV.started = true; clearTimeout(MM.joinT); mmFound(x); liveBegin(refs, x.t, x.ms); } }
      else if (!LV.started) fail();
      return;
    }
    if (y.type === 'bye' && !LV.started){ fail(); return; }
    liveCommon(y);
  }).catch(fail);
  clearTimeout(MM.joinT); MM.joinT = setTimeout(fail, 8000);
}
function mmTimeout(){
  mmStop(true); liveBye();
  const box = $('mmOffer'), stEl = $('mmState');
  if (stEl){ stEl.className = 'sync'; stEl.textContent = 'Search stopped after 3 minutes'; }
  if (box) mmOffer(true);
}
function renderSearch(){
  const T = TOPICS[MM.topic] || TOPICS.mixed;
  $('lobby').innerHTML = `<div class="col lobby mmsearch" style="--tc:${T.c}">
    <div class="kicker"><span class="pill" style="--c:${T.c}">${icon(TOPIC_ICON[T.id] || 'star','sm')}${esc(T.name)} · Quick match</span></div>
    <h1 class="winner">Finding an opponent</h1>
    <div class="radar"><i></i><i></i><i></i>${avatar(nameOf('me'), S.me.color, 'l')}</div>
    <p class="lede" style="text-align:center">Anyone who picks <b>${esc(T.name)}</b> right now gets matched with you automatically.</p>
    <div class="sync" id="mmState"><span class="spin"></span>Searching… <span id="mmSecs">0s</span></div>
    <div id="mmOffer"></div>
    <button class="btn ghost" type="button" id="mmCancel">Cancel</button>
  </div>`;
  $('mmCancel').onclick = () => { mmStop(true); liveBye(); go('home'); };
}
function mmOffer(stopped){
  const box = $('mmOffer'); if (!box || (!stopped && (!MM.active || LV.started || MM.joining))) return;
  const T = TOPICS[MM.topic] || TOPICS.mixed, t = MM.topic;
  box.innerHTML = `<div class="card stack offerq"><b>No one's playing ${esc(T.name)} right now</b>
    <button class="cta" type="button" id="mmBot">${icon('bot','sm')}Play a bot instead</button>
    ${t !== 'mixed' ? `<button class="btn" type="button" id="mmMixed">${icon('shuffle','sm')}Search Mixed Bag instead</button>` : ''}
    <button class="btn ghost" type="button" id="mmKeep">${stopped ? 'Search again' : 'Keep searching'}</button></div>`;
  $('mmBot').onclick = () => { mmStop(true); liveBye(); startSolo({kind:'bot', topic: t}); };
  if ($('mmMixed')) $('mmMixed').onclick = () => startQuick('mixed');
  $('mmKeep').onclick = () => { if (stopped || !MM.active){ startQuick(t); return; } box.innerHTML = ''; clearTimeout(MM.offerT); MM.offerT = setTimeout(mmOffer, 30000); };
}
addEventListener('pagehide', () => { if (MM.active && MM.topic){ try{ navigator.sendBeacon(RELAY + mmTopic(MM.topic), JSON.stringify(Object.assign(mmMe(), {type:'gone', r: MM.room}))); }catch(e){} } });

/* ================= friends screen ================= */
function friendLink(){ return baseUrl() + '#F=' + b64e({v:2, i: S.id, n: nameOf('me'), c: S.me.color, code: S.code}); }
function renderFriends(){
  const fl = friendList(), reqs = Object.values(S.reqIn), outs = Object.values(S.reqOut), items = pendingInbox();
  $('friends').innerHTML = `<div class="col">
    <div class="top"><h1 class="title">Friends</h1></div>
    <div class="card codecard">
      <div class="cc-top">${avatar(nameOf('me'), S.me.color, 'l')}<div><div class="cc-n">${esc(nameOf('me'))}</div><div class="small">Your friend code</div><button type="button" class="code" id="copyCode" aria-label="Copy friend code">${fmtCode(S.code)}${icon('copy','sm')}</button></div></div>
      <button class="cta" type="button" id="shareMe">${icon('useradd','sm')}Invite a friend</button>
      <form class="addrow" id="addForm" autocomplete="off"><input id="addCode" maxlength="9" placeholder="Enter a friend code" autocapitalize="characters" spellcheck="false"><button class="pillbtn" type="submit">Send request</button></form>
    </div>
    ${fl.length ? weekCard() : ''}
    ${reqs.length ? `<div class="h">Friend requests</div><ul class="list">${reqs.map(r => `<li class="li">${avatar(r.n, r.c, 's')}<div><div class="t1">${esc(r.n)}</div><div class="t2">Code ${fmtCode(r.code)}</div></div><button type="button" class="pillbtn ghost" data-dec="${esc(r.i)}">Decline</button><button type="button" class="pillbtn ok" data-acc="${esc(r.i)}">Accept</button></li>`).join('')}</ul>` : ''}
    ${items.length ? `<div class="h">Waiting for you</div><div class="banners">${items.map(it => { const T = TOPICS[it.t] || TOPICS.mixed; return `<div class="bn ${it.k === 'lv' ? 'live' : ''}">${avatar(it.n, it.c, 's')}<div><b>${esc(it.n)}</b><span>${it.k === 'lv' ? 'is waiting to play live' : 'challenged you'} · ${esc(T.name)}</span></div><button type="button" class="pillbtn" data-ib="${it.id}">${it.k === 'lv' ? 'Join' : 'Play'}</button></div>`; }).join('')}</div>` : ''}
    <div class="h">Your friends · ${fl.length}</div>
    ${fl.length ? `<ul class="list">${fl.map(f => { const r = S.rivals['id:' + f.i] || {w:0, l:0}; return `<li class="li fr">${avatar(f.n, f.c, 's')}<div><div class="t1">${esc(f.n)}</div><div class="t2">You <b class="res-w">${r.w}</b> – <b class="res-l">${r.l}</b> ${esc(f.n)}</div></div><button type="button" class="pillbtn live" data-flive="${esc(f.i)}">${icon('zap','sm')}Live</button><button type="button" class="pillbtn" data-fch="${esc(f.i)}">Challenge</button><button type="button" class="iconbtn sm" data-fmore="${esc(f.i)}" aria-label="More options for ${esc(f.n)}">⋯</button></li>`; }).join('')}</ul>`
      : `<div class="empty">${icon('users','xl')}<b>No friends yet</b><span>Tap <b>Invite a friend</b> and send it to her, or type her friend code. Once she accepts, you can challenge each other right from here, no links.</span></div>`}
    ${outs.length ? `<div class="h">Requests you sent</div><ul class="list">${outs.map(o => `<li class="li"><span class="tic" style="--c:var(--muted)">${icon('send','sm')}</span><div><div class="t1">${o.n ? esc(o.n) : 'Code ' + fmtCode(o.code)}</div><div class="t2">Waiting for them to accept</div></div><button type="button" class="pillbtn ghost" data-cancel="${esc(o.code)}">Cancel</button></li>`).join('')}</ul>` : ''}
    <p class="small" style="text-align:center">Requests and challenges arrive when the other person's app is open, or the next time they open it (within about 12 hours).</p>
  </div>`;
  $('copyCode').onclick = async () => { try{ await navigator.clipboard.writeText(fmtCode(S.code)); toast('Friend code copied'); }catch(e){ toast('Your code: ' + fmtCode(S.code)); } };
  $('shareMe').onclick = () => shareLink(friendLink(), `Add me on Two Minds! Tap to send me a friend request (my code is ${fmtCode(S.code)}).`);
  $('addForm').onsubmit = async e => { e.preventDefault(); if (await requestFriend($('addCode').value)) $('addCode').value = ''; };
  wireSocial($('friends'));
  $('friends').querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => { const code = b.dataset.cancel; delete S.reqOut[code]; save(); sendSure(code, {type:'fcancel'}).catch(() => {}); renderFriends(); });
  $('friends').querySelectorAll('[data-fmore]').forEach(b => b.onclick = () => { const f = friendOf(b.dataset.fmore); if (f) friendSheet(f); });
  pullWeeks();
  $('friends').querySelectorAll('[data-dec]').forEach(b => b.onclick = () => { const r = S.reqIn[b.dataset.dec]; if (r) declineFriend(r); });
  $('friends').querySelectorAll('[data-flive],[data-fch]').forEach(b => b.onclick = () => {
    withFriend = b.dataset.flive || b.dataset.fch; topicIntent = b.dataset.flive ? 'live' : 'link'; SFX.tap(); go('topics');
  });
  updateFriendDot();
}
function friendSheet(f){
  const md = $('modal'), r = own(S.rivals, 'id:' + f.i) ? S.rivals['id:' + f.i] : {w:0, l:0, d:0};
  md.hidden = false;
  md.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(f.n)}"><span class="grab"></span>
    <div class="pp">${avatar(f.n, f.c, 'l')}<div><div class="nm" style="font-size:19px">${esc(f.n)}</div><div class="tt">Code ${fmtCode(f.code)} · You ${r.w}–${r.l} ${esc(f.n)}</div></div></div>
    <button class="btn danger" type="button" id="fsRemove">Remove friend</button>
    <button class="btn ghost" type="button" id="fsX">Close</button></div>`;
  const rb = $('fsRemove');
  rb.onclick = () => {
    if (!rb.dataset.arm){ rb.dataset.arm = '1'; rb.textContent = `Tap again to remove ${f.n}`; return; }
    md.hidden = true; removeFriend(f);
  };
  $('fsX').onclick = () => { md.hidden = true; };
}
function weekCard(){
  rollPeriods();
  const prev = new Date(); prev.setDate(prev.getDate() - 7);
  const b = weekBoard(), lw = S.lastWeek && S.lastWeek.k === weekKey(prev) ? S.lastWeek : null;   // only last week, not an older one
  return `<div class="card week">
    <div class="h" style="margin:0 0 10px">This week<span class="small" style="text-transform:none;letter-spacing:0">${weekDaysLeft()} day${weekDaysLeft() === 1 ? '' : 's'} left</span></div>
    <ol class="lb">${b.map((e, k) => `<li class="${e.me ? 'me' : ''}"><span class="rk">${k === 0 && e.p > 0 ? icon('crown','sm') : k + 1}</span>${avatar(e.n, e.c, 's')}<span class="ln">${esc(e.n)}${e.me ? ' <em>you</em>' : ''}<em>${e.g} game${e.g === 1 ? '' : 's'}</em></span><b>${e.p}</b></li>`).join('')}</ol>
    ${lw && lw.board[0] ? `<p class="small" style="margin-top:10px">${icon('trophy','sm')} Last week's champion: <b style="color:var(--ink)">${esc(lw.board[0].n)}</b> with ${lw.board[0].p} points</p>` : `<p class="small" style="margin-top:10px">Points from every match you play this week. Resets Monday.</p>`}
  </div>`;
}
function wireSocial(root){
  root.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => { const r = S.reqIn[b.dataset.acc]; if (r) acceptFriend(r); });
  root.querySelectorAll('[data-ib]').forEach(b => b.onclick = () => { const it = S.inbox.find(x => x.id === b.dataset.ib); if (!it) return; if (it.k === 'lv') autoJoin = true; openInboxItem(it); });
}
function handleFriendHash(h){
  let p = null; try{ p = b64d(h.slice(3)); }catch(e){}
  history.replaceState(null, '', baseUrl());
  if (!p || p.v !== 2 || !validMini(p) || !validCode(p.code)){ toast('That friend link looks broken'); return false; }
  if (p.i === S.id){ toast('This is your own friend link. Send it to someone else'); go('friends'); return true; }
  if (isFriend(p.i)){ toast(`You and ${p.n} are already friends`); go('friends'); return true; }
  $('modal').hidden = true;
  $('incoming').innerHTML = `<div class="col" style="min-height:70vh;align-content:center">
    <div style="display:grid;justify-items:center;gap:14px;text-align:center">
      ${avatar(p.n, p.c, 'l')}
      <h1 class="winner">Add ${esc(p.n)} as a friend?</h1>
      <p class="lede">${esc(p.n)} gets your request and taps Accept. Then you can challenge each other from the Friends tab, no links needed.</p>
    </div>
    ${S.me.name ? '' : `<div class="card stack"><div class="field">Your name<input id="incName" maxlength="14" autocomplete="off" placeholder="Type your name"></div></div>`}
    <button class="cta" type="button" id="frGo">${icon('useradd','sm')}Send friend request</button>
    <button class="btn" type="button" data-go="home">Not now</button></div>`;
  go('incoming');
  $('frGo').onclick = async () => {
    if (!S.me.name){ const n = $('incName').value.trim(); if (!n){ toast('Type your name first'); $('incName').focus(); return; } S.me.name = n; save(); inboxOpen(); }
    $('frGo').disabled = true;
    if (await requestFriend(p.code, p.n)) go('friends'); else $('frGo').disabled = false;
  };
  return true;
}

/* ================= couple corner ================= */
let C = null;
function renderCouple(){
  const pk = S.couple;
  $('couple').innerHTML = `<div class="col">
    <div class="top"><h1 class="title">Couple corner</h1></div>
    <p class="lede">Pass-the-phone games for the two of you. No timer, just honesty.</p>
    <button class="mode m-couple wide" type="button" id="cKnow"><span class="mi">${icon('eye')}</span><div><b>How well do you know me?</b><span class="d">One answers in secret, the other guesses. 10 rounds.</span></div><span class="go">${icon('chev')}</span></button>
    <button class="mode m-daily wide" type="button" id="cLikely"><span class="mi">${icon('scale')}</span><div><b>Who's more likely to…</b><span class="d">Vote in secret, then see if you agree. 10 prompts.</span></div><span class="go">${icon('chev')}</span></button>
    <button class="mode m-us wide" type="button" id="cUs"><span class="mi">${icon('pen')}</span><div><b>Quiz about us</b><span class="d">Write questions about your story and race to answer.</span></div><span class="go">${S.us.length} Qs${icon('chev','sm')}</span></button>
    <div class="statg"><div class="st">Best read<b>${pk.bestKnow}%</b></div><div class="st">Best sync<b>${pk.bestLikely}%</b></div><div class="st">Played<b>${pk.played}</b></div></div>
  </div>`;
  const need = fn => () => pickOpponent('couple', fn);
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
  const el = $('ccover'); el.style.setProperty('--c', safeColor(color)); el.hidden = false; $('cplay').hidden = true;
  el.innerHTML = `<div class="in">${avatar(name, color, 'l')}<h2>${esc(name)}'s turn</h2><p class="lede">${line}</p><button class="cta" style="--c:${safeColor(color)}" type="button" id="cvGo">${btn}</button><button class="btn ghost" type="button" id="cvQuit">Quit game</button></div>`;
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
      <div class="vote">${[0,1].map(k => { const v = C.votes[k]; return `<div class="vc" style="border-color:${S[who(v)].color}"><span class="small">${esc(nameOf(who(k)))} said</span>${avatar(nameOf(who(v)), S[who(v)].color, 'l')}<b>${esc(nameOf(who(v)))}</b></div>`; }).join('')}</div>
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
  S.couple.played++; onPlayed(40, 0);
  const nb = checkBadges(); save();
  $('coupleRes').innerHTML = `<div class="col"><p class="small" style="text-align:center">${C.type === 'know' ? 'How well do you know me?' : "Who's more likely"}</p>
    <div class="big-pct">${pct}%</div><h1 class="winner">${title}</h1>${body}${badgeHtml(nb)}
    <button class="cta" type="button" id="crAgain">Play again</button><button class="btn" type="button" data-go="couple">Couple corner</button></div>`;
  go('coupleRes');
  if (pct >= 50){ confetti(140, ['#ff8fa3','#c77dff','#ffc53d']); SFX.win(); }
  const t = C.type; C = null;
  $('crAgain').onclick = () => t === 'know' ? startKnow() : startLikely();
}

/* ================= us editor ================= */
function renderUs(){
  $('us').innerHTML = `<div class="col">
    <div class="top"><button class="iconbtn" type="button" id="usBack" aria-label="Back">${icon('back')}</button><h1 class="title">Quiz about us</h1></div>
    <p class="lede">Write questions about your story. Put the real answer first, then three believable wrong ones. Play them as a duel, or send them to her as a link.</p>
    <form class="card stack" id="usForm" autocomplete="off">
      <div class="field">Question<input id="uq" maxlength="100" placeholder="Where did we have our first date?" required></div>
      <div class="field">Right answer<input id="ua" class="ok" maxlength="40" placeholder="That little café near college" required></div>
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
const THEMES = [
  ['velvet','Velvet','#1a1129','#ffb37a','#ff7aa2'], ['midnight','Midnight','#0a0e22','#ffc53d','#38d6ff'],
  ['ocean','Lagoon','#06181d','#ffd166','#3fe0c5'], ['blush','Blush','#fff4f1','#ff8a65','#c77dff']
];
function applyTheme(){
  const t = THEMES.find(x => x[0] === S.settings.theme) ? S.settings.theme : 'velvet';
  document.documentElement.dataset.theme = t;
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = THEMES.find(x => x[0] === t)[2];
}
function seasonCard(){
  rollPeriods();
  const p = S.season.p, t = tierOf(p), nx = nextTier(p), pct = nx ? Math.round((p - t[2]) / (nx[2] - t[2]) * 100) : 100;
  return `<div class="card season">
    <div class="srow"><span class="tierbadge t-${t[0]}">${icon('medal')}</span><div><b>${t[1]}</b><span>${p} season points · ${seasonDaysLeft()} days left</span></div></div>
    <div class="xpbar t-${t[0]}"><i style="width:${pct}%"></i></div>
    <p class="small">${nx ? `${nx[2] - p} points to ${nx[1]}. Each rank unlocks an avatar frame you keep forever.` : 'Top rank reached. Legendary!'}</p>
    <div class="h" style="margin:4px 0 0">Avatar frames</div>
    <div class="frames">${['', ...FRAME_IDS].map(f => { const have = !f || S.frames.includes(f); return `<button type="button" class="frame-pick" data-frame="${f}" aria-pressed="${(S.me.frame || '') === f}" ${have ? '' : 'disabled'}><span class="av s ${f ? 'fr fr-' + f : ''}" style="--c:${S.me.color}">${esc(initial(nameOf('me')))}</span><span>${f ? FRAME_NAMES[f] : 'None'}</span>${have ? '' : `<small>${f === 'flame' ? '7-day streak' : 'Reach ' + FRAME_NAMES[f]}</small>`}</button>`; }).join('')}</div>
  </div>`;
}
function renderMe(){
  const st = S.stats.me, lm = overallLevel('me');
  const acc = st.answered ? Math.round(st.correct / st.answered * 100) : 0;
  const topTopics = TOPIC_IDS.map(id => ({id, L: topicLevel('me', id), xp: S.xp.me[id] || 0})).filter(x => x.xp > 0).sort((a, b) => b.xp - a.xp).slice(0, 5);
  const rv = rivalsList();
  $('me').innerHTML = `<div class="col">
    <div class="top"><h1 class="title">Profile</h1></div>
    <div class="card stack"><div class="pp">${avatar(nameOf('me'), S.me.color, 'l')}<div><div class="nm" style="font-size:19px">${esc(nameOf('me'))}</div><div class="tt">Level ${lm} · ${titleFor(lm)} · code ${fmtCode(S.code)}</div></div></div>
      <div class="field">Your name<input id="meName" maxlength="14" autocomplete="off" value="${esc(S.me.name)}" placeholder="Your name"></div>
      <div class="colors">${COLORS.map(c => `<button type="button" style="--c:${c}" data-col="${c}" aria-pressed="${S.me.color === c}" aria-label="Colour"></button>`).join('')}</div></div>
    <div class="h">Season · ${new Date().toLocaleDateString(undefined, {month:'long'})}</div>
    ${seasonCard()}
    <div class="h">Look</div>
    <div class="themes">${THEMES.map(([id, name, bg, a1, a2]) => `<button type="button" class="theme" data-theme-pick="${id}" aria-pressed="${S.settings.theme === id}"><span class="sw" style="background:${bg}"><i style="background:${a1}"></i><i style="background:${a2}"></i></span>${name}</button>`).join('')}</div>
    <div class="h">Rivals</div>
    ${rv.length ? `<ul class="list">${rv.map(r => `<li class="li">${avatar(r.n, r.c, 's')}<div><div class="t1">${esc(r.n)}</div><div class="t2">${r.k.startsWith('id:') ? 'Plays your links' : 'On this phone'}</div></div><span class="sc"><b><span class="res-w">${r.w}</span>–<span class="res-l">${r.l}</span>${r.d ? `–<span class="res-d">${r.d}</span>` : ''}</b><span class="res-p">W–L${r.d ? '–D' : ''}</span></span></li>`).join('')}</ul>` : '<p class="small">Nobody yet. Everyone you duel or who plays your links appears here.</p>'}
    <div class="h">Your stats</div>
    <div class="statg"><div class="st">Played<b>${st.played}</b></div><div class="st">Won<b>${st.won}</b></div><div class="st">Accuracy<b>${acc}%</b></div><div class="st">Best streak<b>${st.best}</b></div><div class="st">Perfect<b>${st.perfect}</b></div><div class="st">Level<b>${lm}</b></div></div>
    ${topTopics.length ? `<div class="h">Top topics</div><div class="card lvls">${topTopics.map(x => { const T = TOPICS[x.id]; return `<div class="lvrow"><span class="tic" style="--c:${T.c}">${T.ic}</span><div><div class="meta"><b>${esc(T.name)}</b><span>Lv ${x.L.lv} · ${titleFor(x.L.lv, TOPIC_TITLES)}</span></div><div class="xpbar" style="--c:${T.c}"><i style="width:${Math.round(x.L.into / x.L.need * 100)}%"></i></div></div></div>`; }).join('')}</div>` : ''}
    <div class="h">Badges · ${S.badges.length}/${BADGES.length}</div>
    <div class="bgrid">${BADGES.map(b => `<div class="bd ${S.badges.includes(b[0]) ? 'on' : ''}"><span class="bi">${b[3]}</span><b>${esc(b[1])}</b>${esc(b[2])}</div>`).join('')}</div>
    <div class="h">Settings</div>
    <div class="card stack">
      <div class="setrow"><span>Seating for duels on one phone</span><div class="seg"><button type="button" data-set="seat" data-v="face" aria-pressed="${S.settings.seat === 'face'}">Face to face</button><button type="button" data-set="seat" data-v="side" aria-pressed="${S.settings.seat === 'side'}">Side by side</button></div></div>
      <div class="setrow"><span>Answer time</span><div class="seg"><button type="button" data-set="relaxed" data-v="0" aria-pressed="${!S.settings.relaxed}">10 seconds</button><button type="button" data-set="relaxed" data-v="1" aria-pressed="${S.settings.relaxed}">15 seconds</button></div></div>
      <div class="setrow"><span>Practice bot</span><div class="seg">${['Easy','Normal','Hard'].map((n, i) => `<button type="button" data-set="botLevel" data-v="${i}" aria-pressed="${S.settings.botLevel === i}">${n}</button>`).join('')}</div></div>
      <div class="seg"><button type="button" data-set="sound" data-v="t" aria-pressed="${S.settings.sound}">Sound ${S.settings.sound ? 'on' : 'off'}</button><button type="button" data-set="vib" data-v="t" aria-pressed="${S.settings.vib}">Vibration ${S.settings.vib ? 'on' : 'off'}</button></div>
    </div>
    <button class="btn" type="button" data-go="history">${icon('history','sm')}Match history</button>
    <button class="btn danger ghost" type="button" id="resetBtn">Reset all progress</button>
    <p class="small" style="text-align:center">No account needed. Your progress stays on this phone.</p>
  </div>`;
  $('meName').onchange = () => {
    const v = $('meName').value.trim();
    if (!v){ toast('Your name can\'t be empty'); $('meName').value = S.me.name; return; }
    S.me.name = v; save(); renderMe();
  };
  $('me').querySelectorAll('[data-col]').forEach(b => b.onclick = () => { S.me.color = b.dataset.col; save(); SFX.tap(); renderMe(); });
  $('me').querySelectorAll('[data-frame]').forEach(b => b.onclick = () => { if (b.disabled) return; S.me.frame = b.dataset.frame; save(); SFX.tap(); renderMe(); });
  $('me').querySelectorAll('[data-theme-pick]').forEach(b => b.onclick = () => { S.settings.theme = b.dataset.themePick; save(); applyTheme(); SFX.tap(); renderMe(); });
  $('me').querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
    const k = b.dataset.set, v = b.dataset.v, y = $('me').scrollTop;
    if (k === 'seat') S.settings.seat = v; else if (k === 'relaxed') S.settings.relaxed = v === '1'; else if (k === 'botLevel') S.settings.botLevel = +v; else S.settings[k] = !S.settings[k];
    save(); SFX.tap(); renderMe(); $('me').scrollTop = y;
  });
  const rb = $('resetBtn');
  rb.onclick = () => {
    if (!rb.dataset.arm){ rb.dataset.arm = '1'; rb.textContent = 'Tap again to erase everything'; setTimeout(() => { if (rb.isConnected){ delete rb.dataset.arm; rb.textContent = 'Reset all progress'; } }, 3000); return; }
    try{ localStorage.removeItem(KEY); }catch(e){} location.reload();
  };
}

/* ================= welcome (first open) ================= */
function renderWelcome(){
  $('welcome').innerHTML = `<div class="col wel">
    <div class="wel-art" aria-hidden="true"><span class="b1"></span><span class="b2"></span><span class="spark">${icon('zap')}</span></div>
    <h1 class="logo big"><span class="a">Two</span> <span class="b">Minds</span></h1>
    <p class="lede">Head-to-head trivia. Same question, ten seconds, the fastest right answer wins.</p>
    <div class="card stack">
      <div class="wprev" id="wPrev">${avatar(S.me.name || '?', S.me.color, 'l')}</div>
      <div class="field">What should we call you?<input id="wName" maxlength="14" autocomplete="given-name" enterkeyhint="go" value="${esc(S.me.name)}" placeholder="Your name"></div>
      <div class="colors" id="wColors">${COLORS.map(c => `<button type="button" style="--c:${c}" data-c="${c}" aria-pressed="${S.me.color === c}" aria-label="Colour"></button>`).join('')}</div>
    </div>
    <button class="cta" type="button" id="wGo">Start playing</button>
    <p class="small" style="text-align:center">No account or password. Everything stays on this phone.</p>
  </div>`;
  const prev = () => { $('wPrev').innerHTML = avatar($('wName').value.trim() || '?', S.me.color, 'l'); };
  $('wName').oninput = prev;
  $('wColors').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; S.me.color = b.dataset.c; $('wColors').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); prev(); SFX.tap(); };
  const go_ = () => {
    const v = $('wName').value.trim();
    if (!v){ toast('Type your name to start'); $('wName').focus(); return; }
    S.me.name = v; S.onboarded = true; save(); SFX.right(); inboxOpen(); go('home');
  };
  $('wGo').onclick = go_;
  $('wName').onkeydown = e => { if (e.key === 'Enter') go_(); };
}

/* ================= who is on this phone with you ================= */
function pickOpponent(purpose, then){
  const md = $('modal'); md.hidden = false;
  const locals = rivalsList().filter(r => r.k.startsWith('local:') && r.n.toLowerCase() !== nameOf('me').toLowerCase()).slice(0, 6);
  let pickedColor = null;
  md.innerHTML = `<div class="sheet"><span class="grab"></span>
    <h3>${purpose === 'couple' ? 'Who are you playing with?' : 'Who are you dueling?'}</h3>
    <p class="small">They play on this phone with you${purpose === 'duel' ? ', on the other half of the screen' : ''}.</p>
    ${locals.length ? `<div class="opps">${locals.map((r, i) => `<button type="button" class="opp" data-i="${i}" aria-pressed="${r.n.toLowerCase() === (S.partner.name || '').toLowerCase()}">${avatar(r.n, r.c, 's')}<span>${esc(r.n)}</span></button>`).join('')}</div>` : ''}
    <div class="field">${locals.length ? 'Or type a name' : 'Their name'}<input id="opName" maxlength="14" autocomplete="off" value="${esc(S.partner.name || '')}" placeholder="Her name"></div>
    <button class="cta" type="button" id="opGo">${purpose === 'couple' ? 'Start' : 'Start duel'}</button><button class="btn ghost" type="button" id="opX">Cancel</button></div>`;
  md.querySelectorAll('.opp').forEach(b => b.onclick = () => {
    const r = locals[+b.dataset.i]; $('opName').value = r.n; pickedColor = r.c;
    md.querySelectorAll('.opp').forEach(x => x.setAttribute('aria-pressed', x === b)); SFX.tap();
  });
  $('opGo').onclick = () => {
    const v = $('opName').value.trim();
    if (!v){ toast('Type their name'); $('opName').focus(); return; }
    if (v.toLowerCase() === nameOf('me').toLowerCase()){ toast(`That's your name. Type theirs`); return; }
    const known = S.rivals[rivalKey(v)];
    let c = pickedColor && known && known.n.toLowerCase() === v.toLowerCase() ? pickedColor : (known ? known.c : (S.partner.name && S.partner.name.toLowerCase() === v.toLowerCase() ? S.partner.color : null));
    if (!c || c === S.me.color) c = freeColor([S.me.color]);
    S.partner = {name: v, color: c}; save(); md.hidden = true; then();
  };
  $('opX').onclick = () => { md.hidden = true; };
  $('opName').onkeydown = e => { if (e.key === 'Enter') $('opGo').click(); };
  if (!S.partner.name) setTimeout(() => $('opName').focus(), 60);
}

/* ================= boot ================= */
$('emoBar').innerHTML = EMOS.map((e, k) => `<button type="button" data-e="${k}" aria-label="Send ${e}">${e}</button>`).join('');
$('emoBar').addEventListener('pointerdown', e => { const b = e.target.closest('[data-e]'); if (!b) return; e.preventDefault(); sendEmo(+b.dataset.e); });
rollPeriods();
document.querySelectorAll('.tab').forEach(t => { const k = {home:'home', topics:'grid', friends:'users', couple:'heart', me:'user'}[t.dataset.go]; const ti = t.querySelector('.ti'); if (ti && k) ti.outerHTML = icon(k); });
// Two Minds open in two tabs: the idle tab picks up what the other one saved instead of overwriting it later
addEventListener('storage', e => {
  if (e.key !== KEY || !e.newValue) return;
  if (M || C){ storageStale = true; return; }
  reloadState();
});
let storageStale = false;
function reloadState(){
  storageStale = false; load(); applyTheme();
  const typing = document.activeElement && document.activeElement.matches('input, textarea');
  if (!typing && ['home','friends','me','topics','topic','couple','history'].includes(current)) go(current, {keepScroll:true});
}
applyTheme();
if (!handleHash()) go(S.me.name ? 'home' : 'welcome');
setTimeout(syncChallenges, 1200);
inboxOpen(); updateFriendDot();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.__TM = {S, pickRefs, materialize, b64e, b64d, linkFor, validLink, TOPIC_IDS};
})();
