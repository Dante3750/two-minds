"""Android back button, history detail, Us editing, friend removal UI."""
import asyncio
from playwright.async_api import async_playwright
from relaymock import Relay
URL = 'http://localhost:8765/'; R = Relay(); errs = []; fails = []
def check(name, ok, extra=''):
    print(('PASS ' if ok else 'FAIL ') + name, extra)
    if not ok: fails.append(name)
cur = "(document.querySelector('main > section:not([hidden])')||{}).id"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        c = await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
        await c.route('https://ntfy.sh/**', R.route); pg = await c.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL); await pg.fill('#wName', 'Ana'); await pg.click('#wGo')
        await pg.click('.tab[data-go="topics"]'); await pg.click('#topics [data-topic="gk"]')
        await pg.go_back(); await pg.wait_for_timeout(300); a = await pg.evaluate(cur)
        await pg.go_back(); await pg.wait_for_timeout(300); b2 = await pg.evaluate(cur)
        check('back walks topic -> topics -> home', (a, b2) == ('topics', 'home'), (a, b2))
        # back during a match asks first, second back quits
        await pg.click('.tab[data-go="topics"]'); await pg.click('#topics [data-topic="gk"]'); await pg.click('#tpBot')
        await pg.wait_for_selector('#sOpts:not(.hide) .opt', timeout=15000)
        await pg.go_back(); await pg.wait_for_timeout(300); still = await pg.evaluate("!document.getElementById('solo').hidden")
        await pg.go_back(); await pg.wait_for_timeout(400); left = await pg.evaluate("document.getElementById('solo').hidden")
        check('back in a match needs two presses', still and left)
        # play one bot match, open its history detail
        await pg.click('#tpBot')
        for r in range(7):
            await pg.wait_for_selector('#sOpts:not(.hide) .opt', timeout=20000); await pg.wait_for_timeout(150)
            o = await pg.query_selector_all('#sOpts .opt'); await o[0].dispatch_event('pointerdown')
            await pg.wait_for_function("document.querySelector('#sOpts').classList.contains('hide') || !document.getElementById('results').hidden", timeout=20000)
        await pg.wait_for_selector('#results:not([hidden])'); await pg.goto(URL)
        await pg.click('[data-hist]'); await pg.wait_for_selector('.hdet .rv')
        check('history detail shows 7 rounds', await pg.locator('.hdet .rv').count() == 7)
        await pg.go_back(); await pg.wait_for_timeout(300)
        check('back closes the sheet', await pg.evaluate("document.getElementById('modal').hidden"))
        # edit an Us question
        await pg.evaluate("__TM.S.us=[{q:'First date?',a:'Cafe',w:['Park','Mall','Beach']}]; localStorage.setItem('twominds.v2', JSON.stringify(__TM.S))"); await pg.reload()
        await pg.evaluate("document.querySelector('[data-go=us]') || 0"); await pg.click('.tab[data-go="topics"]'); await pg.click('#topics [data-topic="us"]'); await pg.click('#topic [data-go="us"]')
        await pg.click('[data-edit="0"]'); await pg.fill('#ua', 'Coffee shop'); await pg.click('#usForm button[type=submit]')
        check('Us question edited in place', await pg.evaluate("__TM.S.us.length === 1 && __TM.S.us[0].a === 'Coffee shop'"))
        # couple game has a quit button
        await pg.goto(URL); await pg.click('#hmCouple'); await pg.click('#cKnow'); await pg.fill('#opName', 'Rohan'); await pg.click('#opGo'); await pg.click('#cvGo')
        await pg.click('#cqQuit'); await pg.click('#cqQuit'); await pg.wait_for_timeout(300)
        check('couple game quits back to Couple corner', await pg.evaluate(cur) == 'couple')
        await b.close()
    print('ERRORS:', errs or 'none'); print('FAILED:', fails or 'none')
asyncio.run(main())
