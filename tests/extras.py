"""Newer features: round dots, score race chart, share result, pasted links, leaving a "play with a friend" flow."""
import asyncio
from playwright.async_api import async_playwright
from relaymock import Relay
URL = 'http://localhost:8765/'; R = Relay(); errs = []; fails = []
def check(name, ok, extra=''):
    print(('PASS ' if ok else 'FAIL ') + name, extra)
    if not ok: fails.append(name)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        c = await b.new_context(viewport={'width': 360, 'height': 740}, has_touch=True, is_mobile=True)
        await c.route('https://ntfy.sh/**', R.route); pg = await c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.fill('#wName', 'Ana'); await pg.click('#wGo')
        await pg.click('.tab[data-go="topics"]'); await pg.click('#topics [data-topic="gk"]'); await pg.click('#tpBot')
        dots = []
        for r in range(7):
            await pg.wait_for_selector('#sOpts:not(.hide) .opt', timeout=20000); await pg.wait_for_timeout(150)
            if r == 3: dots = await pg.evaluate("[...document.querySelectorAll('#sLabel .sdots i')].map(i => i.className)")
            o = await pg.query_selector_all('#sOpts .opt'); await o[0].dispatch_event('pointerdown')
            await pg.wait_for_function("document.querySelector('#sOpts').classList.contains('hide') || !document.getElementById('results').hidden", timeout=20000)
        check('seven round dots, three decided, one current', len(dots) == 7 and sum(1 for d in dots[:3] if d.strip() in ('w', 'l', 'd')) == 3 and 'now' in dots[3], dots)
        await pg.wait_for_selector('#results:not([hidden])')
        n = await pg.evaluate("document.querySelectorAll('#results svg.race polyline').length")
        pts = await pg.evaluate("document.querySelector('#results svg.race polyline').getAttribute('points').split(' ').length")
        check('score race chart has both lines and 8 points', n == 2 and pts == 8, (n, pts))
        check('share result button', await pg.locator('#rBrag').count() == 1)
        # a pasted invite link opens like a tapped one
        link = await pg.evaluate("location.origin + location.pathname + '#F=' + __TM.b64e({v:2, i:'zedzed12', n:'Zed', c:'#38d6ff', code:'abc234'})")
        await pg.goto(URL); await pg.click('.tab[data-go="friends"]'); await pg.fill('#addCode', 'hey join me ' + link); await pg.click('#addForm button')
        await pg.wait_for_timeout(500)
        check('pasted link opens the invite', 'Add Zed' in await pg.inner_text('#incoming'))
        # "playing with <friend>" must not stick to later matches
        await pg.evaluate("__TM.S.friends['zedzed12'] = {i:'zedzed12', n:'Zed', c:'#38d6ff', code:'abc234', at: Date.now()}; localStorage.setItem('twominds.v2', JSON.stringify(__TM.S))")
        await pg.goto(URL); await pg.click('.tab[data-go="friends"]'); await pg.click('#friends [data-fch]'); await pg.click('#topics [data-topic="gk"]')
        with_friend = await pg.locator('#tpFCh').count() == 1
        await pg.click('.tab[data-go="home"]'); await pg.click('#hmLink'); await pg.click('#topics [data-topic="gk"]')
        check('friend flow ends when you go Home', with_friend and await pg.locator('#tpLink').count() == 1 and await pg.locator('#tpFCh').count() == 0)
        name_w = await pg.evaluate("(() => { go; return 0 })") if False else 0
        await pg.click('.tab[data-go="friends"]')
        ok = await pg.evaluate("(() => { const e = document.querySelector('#friends .li.fr .t1'); return e.scrollWidth <= e.clientWidth + 1; })()")
        check('friend name is not cut off at 360px', ok)
        await b.close()
    print('ERRORS:', errs or 'none'); print('FAILED:', fails or 'none')
asyncio.run(main())
