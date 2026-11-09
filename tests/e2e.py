"""End-to-end test of Two Minds in headless Chrome with a simulated ntfy relay."""
import asyncio, json, os, time
from urllib.parse import urlparse, parse_qs
from playwright.async_api import async_playwright
from relaymock import Relay
URL = os.environ.get('TM_URL', 'http://localhost:8765/')
SHOTS = os.path.join(os.path.dirname(__file__), '..', 'shots')
RELAY = {}          # topic -> [messages]
FAIL = {'on': False}
errs = []

R = Relay(); relay = R.route; RELAY = R.topics

async def phone(b, tag):
    c = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    await c.route('https://ntfy.sh/**', relay)
    pg = await c.new_page()
    pg.on('pageerror', lambda e: errs.append(f'{tag}: {e}'))
    pg.on('console', lambda m: errs.append(f'{tag} console: {m.text}') if m.type == 'error' and 'ERR_TUNNEL' not in m.text and 'fonts' not in m.text else None)
    return c, pg

async def play_solo(pg, pick=lambda i: 0):
    for r in range(7):
        await pg.wait_for_selector('#sOpts:not(.hide) .opt', timeout=15000)
        await pg.wait_for_timeout(150 + r*40)
        opts = await pg.query_selector_all('#sOpts .opt')
        await opts[pick(r)].dispatch_event('pointerdown')
        await pg.wait_for_function("document.querySelector('#sOpts').classList.contains('hide') || !document.getElementById('results').hidden", timeout=15000)
    await pg.wait_for_selector('#results:not([hidden])', timeout=8000)

async def accept(pg, link, name):
    await pg.goto(link); await pg.wait_for_selector('#incGo', timeout=6000)
    await pg.fill('#incName', name); await pg.click('#incGo')

async def main():
    os.makedirs(SHOTS, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        c1, him = await phone(b, 'him')
        # welcome: one name only
        await him.goto(URL); await him.wait_for_selector('#welcome:not([hidden]) #wName', timeout=6000)
        await him.screenshot(path=f'{SHOTS}/n_welcome.png')
        await him.fill('#wName', 'Rohan'); await him.click('#wGo'); await him.wait_for_selector('#home:not([hidden])')
        await him.screenshot(path=f'{SHOTS}/n_home_empty.png')
        # duel on one phone: opponent picked at the start
        await him.click('#hmDuel'); await him.click('#topics [data-topic="bollywood"]'); await him.click('#tpDuel')
        await him.wait_for_selector('#opName'); await him.screenshot(path=f'{SHOTS}/n_picker.png')
        await him.fill('#opName', 'Ananya'); await him.click('#opGo')
        for r in range(7):
            await him.wait_for_selector('#h0 .opts:not(.hide)', timeout=15000); await him.wait_for_timeout(150)
            await him.dispatch_event('#h0 .opt[data-i="0"]', 'pointerdown'); await him.wait_for_timeout(200)
            await him.dispatch_event('#h1 .opt[data-i="1"]', 'pointerdown')
            await him.wait_for_function("document.querySelector('#h0 .opts').classList.contains('hide') || !document.getElementById('results').hidden", timeout=15000)
        await him.wait_for_selector('#results:not([hidden])'); print('duel:', await him.inner_text('#results .winner'))
        # rematch skips the picker
        await him.click('#rAgain'); await him.wait_for_timeout(500)
        assert await him.evaluate("document.getElementById('modal').hidden"), 'rematch should not ask names'
        await him.click('#quitBtn'); await him.click('#quitBtn'); await him.wait_for_timeout(300)
        # link challenge
        await him.click('.tab[data-go="home"]'); await him.click('#hmLink'); await him.click('#topics [data-topic="cricket"]'); await him.click('#tpLink')
        await play_solo(him, lambda i: i % 2)
        await him.wait_for_timeout(500); await him.screenshot(path=f'{SHOTS}/n_ready.png')
        await him.click('#rShare'); await him.wait_for_timeout(400)
        link = await him.input_value('#lurl'); print('link chars:', len(link))
        # her phone: one name, play, score goes back by itself
        c2, her = await phone(b, 'her')
        await accept(her, link, 'Ananya')
        await her.wait_for_timeout(2600); await her.wait_for_selector('#sOpts:not(.hide)', timeout=10000)
        await her.wait_for_timeout(1500); await her.screenshot(path=f'{SHOTS}/n_her_round.png')
        await play_solo(her, lambda i: 0)
        await her.wait_for_selector('#syncState.ok', timeout=8000)
        print('her sync:', await her.inner_text('#syncState'))
        await her.wait_for_timeout(600); await her.screenshot(path=f'{SHOTS}/n_her_results.png', full_page=True)
        # a third friend plays the same link
        c3, pri = await phone(b, 'priya')
        await accept(pri, link, 'Priya'); await play_solo(pri, lambda i: 2)
        await pri.wait_for_selector('#syncState.ok', timeout=8000)
        await pri.wait_for_timeout(9000)
        print('priya board:', (await pri.inner_text('#liveBoard')).replace('\n', ' | '))
        # back on his phone: results arrive automatically
        await him.goto(URL); await him.wait_for_selector('#home:not([hidden])')
        await him.wait_for_function("document.querySelector('#home').innerText.includes('2 played')", timeout=12000)
        await him.wait_for_timeout(500); await him.screenshot(path=f'{SHOTS}/n_home.png')
        print('his challenges:', (await him.inner_text('#home .list')).replace('\n', ' | ')[:160])
        await him.click('#home [data-board]'); await him.wait_for_selector('#board:not([hidden]) .lb')
        await him.screenshot(path=f'{SHOTS}/n_board.png')
        print('board:', (await him.inner_text('#board .lb')).replace('\n', ' | '))
        # reopening links
        await her.goto(link); await her.wait_for_selector('#board:not([hidden])', timeout=6000); print('her reopen ->', await her.inner_text('#board h1'))
        await him.goto(link); await him.wait_for_selector('#board:not([hidden])', timeout=6000); print('his own link ->', await him.inner_text('#board h1'))
        # relay down: fallback appears
        R.fail = True
        c4, sam = await phone(b, 'sam'); await accept(sam, link, 'Sam'); await play_solo(sam)
        await sam.wait_for_selector('#syncState.bad #manualRes', timeout=12000); print('fallback shown: yes')
        R.fail = False
        # couple corner uses the picker with the remembered partner
        await him.goto(URL); await him.click('#home [data-go="couple"]'); await him.click('#cKnow')
        await him.wait_for_selector('#opGo'); await him.click('#opGo')
        for k in range(10):
            await him.click('#cvGo'); await him.click('#cplay .opt >> nth=1'); await him.click('#cvGo')
            await him.click('#cplay .opt >> nth=1' if k % 2 else '#cplay .opt >> nth=2'); await him.click('#kNext')
        print('know:', await him.inner_text('.big-pct'))
        # profile + themes
        await him.click('#coupleRes [data-go="couple"]'); await him.click('.tab[data-go="me"]'); await him.wait_for_timeout(300)
        await him.screenshot(path=f'{SHOTS}/n_profile.png')
        for t in ['blush', 'ocean', 'midnight', 'velvet']:
            await him.click(f'[data-theme-pick="{t}"]'); await him.click('.tab[data-go="home"]'); await him.wait_for_timeout(250)
            await him.screenshot(path=f'{SHOTS}/n_theme_{t}.png'); await him.click('.tab[data-go="me"]')
        await b.close()
    print('ERRORS:', errs or 'none')
asyncio.run(main())
