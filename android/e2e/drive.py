"""Plays the native app on an Android emulator like a person would, against the local test backend.
A second player (B) is simulated over HTTP for the quick match. Screenshots go to e2e/shots/."""
import json, os, re, subprocess, sys, threading, time, urllib.request
import xml.etree.ElementTree as ET

PKG = 'io.github.dante3750.twominds'
SHOTS = os.path.join(os.path.dirname(__file__), 'shots'); os.makedirs(SHOTS, exist_ok=True)
API = 'http://127.0.0.1:8000'
fails = []

def adb(*a, out=False):
    r = subprocess.run(['adb', *a], capture_output=True, timeout=60)
    return r.stdout if out else r.returncode
def nodes():
    for _ in range(4):
        x = adb('exec-out', 'uiautomator', 'dump', '/dev/tty', out=True).decode('utf-8', 'replace')
        x = x[x.find('<?xml'):x.rfind('>') + 1] if '<?xml' in x else ''
        if x:
            try: return list(ET.fromstring(x).iter('node'))
            except ET.ParseError: pass
        time.sleep(1)
    return []
def center(n):
    a = list(map(int, re.findall(r'\d+', n.get('bounds')))); return (a[0] + a[2]) // 2, (a[1] + a[3]) // 2
def find(label, exact=True):
    for n in nodes():
        for k in ('text', 'content-desc', 'resource-id'):
            v = n.get(k) or ''
            if (v == label) if exact else (label.lower() in v.lower()): return n
    return None
def wait(label, t=25, exact=True):
    end = time.time() + t
    while time.time() < end:
        n = find(label, exact)
        if n is not None: return n
        time.sleep(0.8)
    return None
def tap(label, t=25, exact=True):
    n = wait(label, t, exact)
    if n is None: raise RuntimeError(f'not found: {label}')
    x, y = center(n); adb('shell', 'input', 'tap', str(x), str(y)); time.sleep(0.7)
def press(label, t=25):
    hide_keyboard(); tap(label, t)
def type_(text): adb('shell', 'input', 'text', text.replace(' ', '%s')); time.sleep(0.5)
def keyboard_up(): return b'mInputShown=true' in adb('shell', 'dumpsys', 'input_method', out=True)
def hide_keyboard():
    if keyboard_up(): adb('shell', 'input', 'keyevent', 'KEYCODE_BACK'); time.sleep(0.8)
def shot(name):
    with open(os.path.join(SHOTS, name + '.png'), 'wb') as f: f.write(adb('exec-out', 'screencap', '-p', out=True))
def check(name, ok):
    print(('PASS ' if ok else 'FAIL ') + name, flush=True)
    if not ok: fails.append(name)
def scroll(): adb('shell', 'input', 'swipe', '540', '1700', '540', '700', '400'); time.sleep(0.8)

# ---------- player B, over HTTP like the app
def post(path, body, token=None):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode(), method='POST', headers={'Content-Type': 'application/json', 'apikey': 'anon', **({'Authorization': 'Bearer ' + token} if token else {})})
    with urllib.request.urlopen(req, timeout=20) as r:
        t = r.read().decode(); return json.loads(t) if t.strip() else None
def player_b(topic):
    s = post('/auth/v1/verify', {'type': 'email', 'email': 'rival@e2e.dev', 'token': '123456'}); tok = s['access_token']
    try: post('/rest/v1/rpc/create_profile', {'p_username': 'rival_rohan', 'p_name': 'Rohan', 'p_color': '#38d6ff'}, tok)
    except Exception: pass
    m = None
    for _ in range(90):
        m = post('/rest/v1/rpc/quick_match', {'p_topic': topic, 'p_time_ms': 10000}, tok)
        if m: break
        time.sleep(2)
    if not m: print('B: no match'); return
    for r in range(7):
        post('/rest/v1/rpc/get_round', {'p_match': m['id'], 'p_round': r}, tok); time.sleep(2.5)
        post('/rest/v1/rpc/submit_answer', {'p_match': m['id'], 'p_round': r, 'p_option': r % 4, 'p_ms': 2500}, tok)
        time.sleep(1.5)
    post('/rest/v1/rpc/finish_match', {'p_match': m['id'], 'p_quit': False}, tok)
    print('B: finished', flush=True)

def play_rounds(pick=0, tag='bot'):
    for r in range(7):
        n = wait('opt0', 30)
        if n is None: raise RuntimeError(f'round {r + 1} never showed options')
        time.sleep(1.4)                                   # options fade in after the question
        if r == 0: shot(f'{tag}_round1')
        tap(f'opt{pick}', 5); time.sleep(0.6)
        if r == 0: shot(f'{tag}_reveal')
        time.sleep(1.6)

try:
    adb('shell', 'am', 'start', '-n', f'{PKG}/.MainActivity'); time.sleep(4)
    shot('01_signin')
    tap('email'); type_('ananya@e2e.dev'); press('Send my code')
    check('code screen', wait('code') is not None); shot('02_code')
    tap('code'); type_('123456')
    check('setup screen after sign-in', wait('What should we call you?', 20) is not None)
    tap('name'); type_('Ananya'); time.sleep(0.5); shot('03_setup')
    press('Start playing')
    check('home after setup', wait('Find an opponent', 25) is not None); time.sleep(1.5); shot('04_home')
    scroll(); shot('05_home_scrolled')

    tap('Topics'); time.sleep(1.5); shot('06_topics')
    tap('General Knowledge'); time.sleep(1.5); shot('07_topic')
    tap('Practice'); time.sleep(1.0); shot('08_vs')
    play_rounds(0, 'bot')
    check('results after a bot match', wait('See every round', 30) is not None); time.sleep(2.5); shot('09_results')
    tap('See every round'); time.sleep(2); shot('10_detail')
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK'); time.sleep(1)
    tap('Home'); time.sleep(1)

    # quick match against B
    threading.Thread(target=player_b, args=('science',), daemon=True).start()
    tap('Quick match'); time.sleep(1.2); shot('11_topic_sheet')
    tap('Science'); time.sleep(3); shot('12_search')
    play_rounds(1, 'live')
    check('results after a live quick match', wait('See every round', 60) is not None); time.sleep(3); shot('13_live_results')
    check('live result settled', wait('Waiting for the other score…', 2) is None)
    tap('Home'); time.sleep(1)

    tap('Friends'); time.sleep(2); shot('14_friends')
    tap('Profile'); time.sleep(2); shot('15_profile'); scroll(); shot('16_profile_scrolled'); scroll(); shot('17_profile_bottom')
    tap('Play'); time.sleep(1); tap('Couple'); time.sleep(1.5); shot('18_couple')
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK'); time.sleep(1)
    tap('Match history'); time.sleep(2); shot('19_history')
    adb('shell', 'input', 'keyevent', 'KEYCODE_BACK'); time.sleep(1)
    check('back button returns home', wait('Find an opponent', 5) is not None)
except Exception as e:
    print('ERROR', e, flush=True); fails.append(str(e)); shot('zz_error')

crash = adb('logcat', '-d', '-s', 'AndroidRuntime:E', out=True).decode('utf-8', 'replace')
if 'FATAL EXCEPTION' in crash: print(crash[-6000:]); fails.append('app crashed')
print('FAILED:', fails or 'none')
sys.exit(1 if fails else 0)
