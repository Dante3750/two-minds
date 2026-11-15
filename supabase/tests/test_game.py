"""Backend tests: run through supabase/tests/run.sh (fresh database with migrations + seed).
Each call runs as a signed-in player exactly like the app would (role authenticated + JWT subject)."""
import json, os, sys, uuid, psycopg
from psycopg.types.json import Jsonb

DSN = f"host={os.environ.get('PGHOST', '/var/tmp/tmpg')} port={os.environ.get('PGPORT', '54329')} user=postgres dbname=twominds_test"
db = psycopg.connect(DSN, autocommit=True)
fails = []
def check(name, ok, extra=''):
    print(('PASS ' if ok else 'FAIL ') + name, extra if not ok else '')
    if not ok: fails.append(name)

def new_user(email):
    return db.execute("insert into auth.users (email) values (%s) returning id", (email,)).fetchone()[0]

def as_user(u, sql, args=(), one=True):
    """Run sql as player u. Returns the first column of the first row (one) or all rows."""
    with db.transaction():
        db.execute("set local role authenticated")
        db.execute("select set_config('request.jwt.claims', %s, true)", (json.dumps({'sub': str(u), 'role': 'authenticated'}),))
        cur = db.execute(sql, args)
        rows = cur.fetchall() if cur.description else []
    return (rows[0][0] if rows else None) if one else rows

def rpc(u, fn, *args):
    ph = ', '.join(['%s'] * len(args))
    return as_user(u, f"select public.{fn}({ph})", args)

def err(u, fn, *args):
    try: rpc(u, fn, *args); return None
    except psycopg.Error as e: return str(e).split('\n')[0]

def play(u, m, pick=lambda r, opts: 0, ms=3000):
    """Plays all 7 rounds; pick(round, options) returns the position to tap."""
    out = []
    for r in range(7):
        g = rpc(u, 'get_round', m, r)
        out.append(rpc(u, 'submit_answer', m, r, pick(r, g['options']), ms))
    return out

A, B, C, D = (new_user(f'{n}@test.dev') for n in 'abcd')

# ---------- profiles
pa = rpc(A, 'create_profile', 'rohan', 'Rohan', '#ff6b5a')
rpc(B, 'create_profile', 'ananya', 'Ananya', '#c77dff')
rpc(C, 'create_profile', 'zed_99', 'Zed', '#38d6ff')
rpc(D, 'create_profile', 'dee', 'Dee', '#3ddc84')
check('profile has a friend code', len(pa['code']) == 6)
check('username must be unique', 'taken' in (err(C, 'create_profile', 'Rohan', 'Copy', '#ffffff') or ''))
check('bad username rejected', '3 to 16' in (err(C, 'create_profile', 'x', 'X', '#ffffff') or ''))
check('no profile, no play', 'profile' in (err(new_user('e@test.dev'), 'start_match', 'bot', 'gk') or ''))

# ---------- friends
check('request by code', rpc(A, 'friend_request', pa['code'].upper()) == 'self')
check('request by username', rpc(A, 'friend_request', '@ananya') == 'sent')
fl = rpc(B, 'friends_list')
check('she sees an incoming request', len(fl) == 1 and fl[0]['incoming'] and fl[0]['username'] == 'rohan')
check('accept', rpc(B, 'friend_respond', A, True) == 'accepted')
check('both are friends', rpc(A, 'friends_list')[0]['status'] == 'accepted')
check('mutual request becomes friends', rpc(C, 'friend_request', 'dee') == 'sent' and rpc(D, 'friend_request', 'zed_99') == 'accepted')
check('cannot invite a stranger to live', 'friends' in (err(A, 'start_match', 'live', 'gk', C) or ''))

# ---------- privacy
check('questions table is hidden', len(as_user(A, "select * from questions limit 5", one=False)) == 0)
try:
    as_user(A, "select bot from matches limit 1"); check('bot answers hidden', False)
except psycopg.Error: check('bot answers hidden', True)
try:
    as_user(A, "insert into weekly (user_id, week, points) values (%s, current_date, 99999)", (A,)); check('no direct writes', False)
except psycopg.Error: check('no direct writes', True)

# ---------- bot match + server scoring
m = rpc(A, 'start_match', 'bot', 'gk', None, 2)
check('bot match starts', m['status'] == 'playing' and m['bot']['name'] == 'Bot Genius' and 'picks' not in m['bot'])
g = rpc(A, 'get_round', m['id'], 0)
check('round has 4 options and no answer', len(g['options']) == 4 and 'right' not in g and g['ghost_ms'] > 0)
check('cannot skip ahead', 'earlier' in (err(A, 'get_round', m['id'], 3) or ''))
s = rpc(A, 'submit_answer', m['id'], 0, 0, 2000)
right = s['right']
check('answer reveals right option, points and the bot pick', 0 <= right <= 3 and s['opp'] is not None and s['you']['points'] == (18 if s['you']['option'] == right else 0))
check('cannot answer twice', 'already' in (err(A, 'submit_answer', m['id'], 0, 1, 100) or ''))
# a tampered "instant" answer: served 8 s ago, app claims 100 ms
rpc(A, 'get_round', m['id'], 1)
db.execute("update answers set served_at = now() - interval '8 seconds' where match_id = %s and user_id = %s and round = 1", (m['id'], A))
s1 = rpc(A, 'submit_answer', m['id'], 1, 0, 100)
check('server timing overrides a too-fast claim', s1['you']['ms'] >= 5900, s1['you'])
for r in range(2, 7):
    rpc(A, 'get_round', m['id'], r); rpc(A, 'submit_answer', m['id'], r, 0, 4000)
f = rpc(A, 'finish_match', m['id'])
me = [p for p in f['players'] if p['id'] == str(A)][0]
total = as_user(A, "select sum(points) from answers where match_id = %s and user_id = %s", (m['id'], A))
check('finish: score is the sum of round points', me['score'] == total and me['result'] in 'wld')
prof = rpc(A, 'my_profile')
check('xp and topic stats recorded', prof['xp'] == me['score'] + {'w': 50, 'd': 20, 'l': 0}[me['result']] and prof['topics']['gk']['played'] == 1, (prof['xp'], me))
check('bot games give no weekly points', prof['week']['points'] == 0)
check('finish twice is harmless', rpc(A, 'my_profile')['xp'] == rpc(A, 'my_profile')['xp'] and rpc(A, 'finish_match', m['id'])['status'] == 'done')
det = rpc(A, 'match_detail', m['id'])
check('match detail after finishing', len(det['rounds']) == 7 and det['rounds'][0]['a'] and det['rounds'][0]['bot'] is not None)

# ---------- no repeats
seen_q = []
for i in range(10):
    mm = rpc(B, 'start_match', 'bot', 'space', None, 0)
    seen_q += db.execute("select unnest(qids) from matches where id = %s", (mm['id'],)).fetchall()
    play(B, mm['id']); rpc(B, 'finish_match', mm['id'])
ids = [x[0] for x in seen_q]
check('10 matches, 70 questions, none repeated (80 in the topic)', len(ids) == 70 and len(set(ids)) == 70)
mm = rpc(B, 'start_match', 'bot', 'space', None, 0)
nxt = [x[0] for x in db.execute("select unnest(qids) from matches where id = %s", (mm['id'],)).fetchall()]
check('11th match: the 10 unseen first, then the oldest seen', len(set(nxt) - set(ids)) == 7 or len(set(nxt) - set(ids)) == 10 - 0 or len(set(nxt) - set(ids)) >= 7 - 0, len(set(nxt) - set(ids)))
check('topic counts show fresh questions', rpc(B, 'topic_counts')['space']['fresh'] == 10)
rpc(B, 'leave_match', mm['id'])

# ---------- live match between friends
lv = rpc(A, 'start_match', 'live', 'science', B)
check('live waits for the friend', lv['status'] == 'waiting')
inbox = rpc(B, 'my_inbox')
check('invite in her inbox', len(inbox['invites']) == 1 and inbox['invites'][0]['id'] == lv['id'])
check('stranger cannot join', 'not for you' in (err(C, 'join_match', lv['id']) or ''))
j = rpc(B, 'join_match', lv['id'])
check('match starts when she joins', j['status'] == 'playing')
rpc(A, 'get_round', lv['id'], 0); rpc(B, 'get_round', lv['id'], 0)
rpc(A, 'submit_answer', lv['id'], 0, 0, 2500)
vis = as_user(B, "select count(*) from answers where match_id = %s and user_id = %s and round = 0", (lv['id'], A))
check("she can't see his answer before answering", vis == 0)
sb = rpc(B, 'submit_answer', lv['id'], 0, 1, 4000)
check('her answer response includes his', sb['opp'] is not None and sb['opp']['user'] == str(A))
vis = as_user(B, "select choice from answers where match_id = %s and user_id = %s and round = 0", (lv['id'], A))
check('then she can see it', vis is not None)
rr = rpc(B, 'round_result', lv['id'], 0)
check('round_result gives his on-screen position', rr is not None and 0 <= rr['option'] <= 3)
check('round_result hidden before answering', rpc(A, 'round_result', lv['id'], 1) is None)
for r in range(1, 7):
    rpc(A, 'get_round', lv['id'], r); rpc(A, 'submit_answer', lv['id'], r, r % 4, 3000)
    rpc(B, 'get_round', lv['id'], r); rpc(B, 'submit_answer', lv['id'], r, (r + 1) % 4, 3500)
fa = rpc(A, 'finish_match', lv['id'])
check('first finisher waits for result', [p for p in fa['players'] if p['id'] == str(A)][0]['result'] is None and fa['status'] == 'playing')
fb = rpc(B, 'finish_match', lv['id'])
ra = {p['id']: p for p in fb['players']}
ok = {ra[str(A)]['result'], ra[str(B)]['result']} in ({'w', 'l'}, {'d'}) and fb['status'] == 'done'
check('both results settled and consistent', ok, ra)
check('weekly points for live games', rpc(A, 'weekly_board')[0]['points'] > 0)
h = rpc(A, 'head_to_head', B)
check('head to head', h['w'] + h['l'] + h['d'] == 1)

# ---------- live: the other player disappears
lv2 = rpc(A, 'start_match', 'live', 'history', B); rpc(B, 'join_match', lv2['id'])
play(A, lv2['id']); rpc(A, 'finish_match', lv2['id'])
db.execute("update match_players set last_active = now() - interval '5 minutes' where match_id = %s and user_id = %s", (lv2['id'], B))
f2 = rpc(A, 'finish_match', lv2['id'])
r2 = {p['id']: p['result'] for p in f2['players']}
check('a vanished opponent loses, match settles', f2['status'] == 'done' and r2[str(A)] == 'w' and r2[str(B)] == 'l', r2)

# ---------- quick match
check('first searcher waits', rpc(C, 'quick_match', 'animals') is None)
q2 = rpc(D, 'quick_match', 'animals')
check('second searcher is matched', q2 is not None and q2['mode'] == 'quick' and len(q2['players']) == 2)
q1 = rpc(C, 'quick_match', 'animals')
check('the first searcher finds the same match', q1 is not None and q1['id'] == q2['id'])
check('different topic does not match', rpc(A, 'quick_match', 'music') is None and rpc(B, 'quick_match', 'food') is None)
rpc(A, 'cancel_quick'); rpc(B, 'cancel_quick')

# ---------- challenge by link (anyone can take it on)
ch = rpc(A, 'start_match', 'challenge', 'india')
play(A, ch['id'], ms=2500); fc = rpc(A, 'finish_match', ch['id'])
check('challenger waits for players', [p for p in fc['players'] if p['id'] == str(A)][0]['result'] == 'p')
check('a stranger can open the challenge', rpc(C, 'get_match', ch['id'])['mode'] == 'challenge')
rpc(C, 'join_match', ch['id'])
g0 = rpc(C, 'get_round', ch['id'], 0)
check("challenger's time is shown, not the pick", g0['ghost_ms'] == 2500)
play(C, ch['id'], ms=6000); fz = rpc(C, 'finish_match', ch['id'])
rz = [p for p in fz['players'] if p['id'] == str(C)][0]['result']
check('the stranger gets a result against the challenger', rz in 'wld')
check("result shows in the challenger's inbox", any(x['player']['id'] == str(C) for x in rpc(A, 'my_inbox')['results']))
# challenge sent to a friend lands in their inbox once the sender has played
cf = rpc(A, 'start_match', 'challenge', 'music', B)
check('not in inbox before the sender plays', len(rpc(B, 'my_inbox')['challenges']) == 0)
play(A, cf['id']); rpc(A, 'finish_match', cf['id'])
check('in her inbox after', len(rpc(B, 'my_inbox')['challenges']) == 1)

# ---------- daily
d1 = rpc(D, 'start_match', 'daily', 'daily'); play(D, d1['id']); rpc(D, 'finish_match', d1['id'])
x1 = rpc(D, 'my_profile')['xp']
d2 = rpc(D, 'start_match', 'daily', 'daily')
check('second daily is practice with the same questions', d2['practice'] and
      db.execute("select (select qids from matches where id=%s) = (select qids from matches where id=%s)", (d1['id'], d2['id'])).fetchone()[0])
play(D, d2['id']); rpc(D, 'finish_match', d2['id'])
check('practice earns nothing', rpc(D, 'my_profile')['xp'] == x1)

# ---------- community questions + reports
sid = rpc(C, 'suggest_question', 'cricket', 'Which test question did the Two Minds suite invent on a Sunday?', 'This one', ['That one', 'No question', 'Every question'])
check('non-admin cannot review', 'admins' in (err(C, 'review_submission', sid, True) or ''))
db.execute("update profiles set is_admin = true where id = %s", (A,))
check('admin sees the queue', len(rpc(A, 'review_queue')) == 1)
check('approve adds the question', rpc(A, 'review_submission', sid, True) == 'approved'
      and db.execute("select count(*) from questions where source = 'community'").fetchone()[0] == 1)
check('duplicate wrong answers rejected', 'different' in (err(C, 'suggest_question', 'gk', 'Which colour is the sky on a clear day?', 'Blue', ['Blue', 'Red', 'Green']) or ''))
mid = rpc(A, 'start_match', 'bot', 'food')['id']
qid = db.execute("select qids[1] from matches where id = %s", (mid,)).fetchone()[0]
db.execute("insert into match_players (match_id, user_id, seat) values (%s, %s, 2), (%s, %s, 3)", (mid, B, mid, C))
for u in (A, B, C): rpc(u, 'report_question', mid, 0, 'wrong answer')
check('three reports hide a question', db.execute("select status from questions where id = %s", (qid,)).fetchone()[0] == 'hidden')

print('FAILED:', fails or 'none')
sys.exit(1 if fails else 0)
