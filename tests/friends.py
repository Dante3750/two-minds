"""Friends: request, accept, then challenge and play live without sharing links."""
import asyncio, json, os, time
from urllib.parse import urlparse
from playwright.async_api import async_playwright
from relaymock import Relay
URL = 'http://localhost:8765/'; SHOTS = os.path.join(os.path.dirname(__file__), '..', 'shots')
RELAY = {}; errs = []
R = Relay(); relay = R.route; RELAY = R.topics
async def phone(b, tag, name):
    c = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    await c.route('https://ntfy.sh/**', relay); pg = await c.new_page()
    pg.on('pageerror', lambda e: errs.append(f'{tag}: {e}'))
    await pg.goto(URL); await pg.wait_for_selector('#wName'); await pg.fill('#wName', name); await pg.click('#wGo')
    return c, pg
async def answer(pg, pick=lambda r: 0, gap=200):
    for r in range(7):
        await pg.wait_for_selector('#sOpts:not(.hide) .opt', timeout=25000); await pg.wait_for_timeout(gap)
        o = await pg.query_selector_all('#sOpts .opt'); await o[pick(r)].dispatch_event('pointerdown')
        await pg.wait_for_function("document.querySelector('#sOpts').classList.contains('hide') || !document.getElementById('results').hidden", timeout=25000)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        _, him = await phone(b, 'him', 'Rohan'); _, her = await phone(b, 'her', 'Ananya'); _, pri = await phone(b, 'priya', 'Priya')
        # 1. invite link -> request -> accept
        await him.click('.tab[data-go="friends"]'); await him.wait_for_selector('#shareMe'); await him.screenshot(path=f'{SHOTS}/f_empty.png')
        link = await him.evaluate("location.href.split('#')[0] + '#F=' + __TM.b64e({v:2, i: __TM.S.id, n: 'Rohan', c: __TM.S.me.color, code: __TM.S.code})")
        await her.goto(link); await her.wait_for_selector('#frGo'); await her.screenshot(path=f'{SHOTS}/f_add.png'); await her.click('#frGo')
        await him.wait_for_selector('#friends [data-acc]', timeout=8000); await him.screenshot(path=f'{SHOTS}/f_request.png')
        await him.click('#friends [data-acc]')
        await her.wait_for_function("Object.keys(__TM.S.friends).length === 1", timeout=8000)
        print('friends after accept:', await him.evaluate("Object.values(__TM.S.friends).map(f=>f.n)"), await her.evaluate("Object.values(__TM.S.friends).map(f=>f.n)"))
        # 2. add by code + decline
        code = await him.evaluate("__TM.S.code")
        await pri.click('.tab[data-go="friends"]'); await pri.fill('#addCode', code.upper()); await pri.click('#addForm .pillbtn')
        await him.wait_for_selector('#friends [data-dec]', timeout=8000); await him.click('#friends [data-dec]')
        await pri.wait_for_function("Object.keys(__TM.S.reqOut).length === 0", timeout=8000); print('declined request cleared on sender: yes')
        # 3. challenge a friend: no link
        await him.click('#friends [data-fch]'); await him.click('#topics [data-topic="space"]'); await him.wait_for_selector('#tpFCh'); await him.screenshot(path=f'{SHOTS}/f_topic.png')
        await him.click('#tpFCh'); await answer(him, lambda r: r % 2)
        await him.wait_for_selector('#friendSend.ok', timeout=8000); print('him:', await him.inner_text('#friendSend'))
        await her.click('.tab[data-go="home"]'); await her.wait_for_selector('#home [data-ib]', timeout=8000); await her.screenshot(path=f'{SHOTS}/f_her_home.png')
        await her.click('#home [data-ib]'); await her.wait_for_selector('#incGo'); await her.click('#incGo'); await answer(her)
        await her.wait_for_selector('#syncState.ok', timeout=8000); print('her:', await her.inner_text('#syncState'))
        # 4. live with a friend: invite pops up, one tap to join
        await him.click('#results [data-go="home"]'); await him.click('.tab[data-go="friends"]'); await him.click('#friends [data-flive]')
        await him.click('#topics [data-topic="music"]'); await him.click('#tpFLive'); await him.wait_for_selector('#lobby:not([hidden])')
        await her.wait_for_selector('#ivGo', timeout=10000); await her.screenshot(path=f'{SHOTS}/f_invite.png'); await him.screenshot(path=f'{SHOTS}/f_lobby.png')
        await her.click('#ivGo')
        await him.wait_for_selector('#solo:not([hidden])', timeout=12000); await her.wait_for_selector('#solo:not([hidden])', timeout=12000); print('live with friend started on both')
        async def react():
            await him.wait_for_selector('#emoBar:not([hidden]) [data-e]', timeout=15000); await him.wait_for_timeout(1200)
            await him.dispatch_event('#emoBar [data-e="1"]', 'pointerdown')
            await her.wait_for_selector('.emo.opp', timeout=6000); print('reaction arrived: yes')
            await her.screenshot(path=f'{SHOTS}/r_emo.png')
        await asyncio.gather(answer(him), answer(her, gap=700), react())
        await him.wait_for_selector('#results:not([hidden])', timeout=20000); await her.wait_for_selector('#results:not([hidden])', timeout=20000)
        a = [await him.get_attribute('#results .board b >> nth=0','data-count'), await him.get_attribute('#results .board b >> nth=1','data-count')]
        bb = [await her.get_attribute('#results .board b >> nth=0','data-count'), await her.get_attribute('#results .board b >> nth=1','data-count')]
        print('live scores consistent:', a == bb[::-1], a)
        await her.click('#chatBox [data-q="0"]'); await him.wait_for_function("document.querySelector('#chatList') && document.querySelector('#chatList').innerText.includes('GG!')", timeout=8000)
        await him.fill('#chatIn', 'rematch tomorrow ❤️'); await him.click('#chatForm .pillbtn')
        await her.wait_for_function("document.querySelector('#chatList').innerText.includes('rematch tomorrow')", timeout=8000); print('chat both ways: yes')
        await him.wait_for_timeout(300); await him.screenshot(path=f'{SHOTS}/r_chat.png', full_page=True)
        await him.click('#lvHome'); await him.click('.tab[data-go="friends"]'); await him.wait_for_timeout(400); await him.screenshot(path=f'{SHOTS}/f_list.png')
        await b.close()
    print('ERRORS:', errs or 'none')
asyncio.run(main())
