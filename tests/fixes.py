"""Regression tests for the audit fixes: stale live links, re-search, crafted inbox messages, daily replay, two tabs."""
import asyncio, json, time
from playwright.async_api import async_playwright
from relaymock import Relay
URL = 'http://localhost:8765/'
R = Relay(); errs = []; fails = []
def check(name, ok, extra=''):
    print(('PASS ' if ok else 'FAIL ') + name, extra)
    if not ok: fails.append(name)
async def phone(b, name, ctx=None):
    c = ctx or await b.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    if not ctx: await c.route('https://ntfy.sh/**', R.route)
    pg = await c.new_page(); pg.on('pageerror', lambda e: errs.append(f'{name}: {e}'))
    await pg.goto(URL)
    if name:
        await pg.wait_for_selector('#wName'); await pg.fill('#wName', name); await pg.click('#wGo')
    return c, pg
async def play(pg, gap=150):
    for r in range(7):
        await pg.wait_for_selector('#sOpts:not(.hide) .opt', timeout=25000); await pg.wait_for_timeout(gap)
        o = await pg.query_selector_all('#sOpts .opt'); await o[0].dispatch_event('pointerdown')
        await pg.wait_for_function("document.querySelector('#sOpts').classList.contains('hide') || !document.getElementById('results').hidden", timeout=25000)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        # 1. reopening an old live link must not start a fake match from replayed messages
        _, him = await phone(b, 'Rohan'); _, her = await phone(b, 'Ananya')
        await him.click('#hmLive'); await him.click('#topics [data-topic="gk"]'); await him.click('#tpLive')
        await him.click('#lbShare'); await him.wait_for_timeout(300); link = await him.input_value('#lurl')
        await her.goto(link); await her.click('#incGo')
        await asyncio.gather(play(him), play(her))
        await her.wait_for_selector('#results:not([hidden])', timeout=20000)
        await him.click('#lvHome'); await her.click('#lvHome')
        await her.goto(URL + '#'); await her.goto(link); await her.click('#incGo'); await her.wait_for_timeout(5000)
        check('old live link does not replay a match', await her.evaluate("document.getElementById('solo').hidden"))
        # 2. cancel a quick match search, search again: still gets matched
        await him.goto(URL); await her.goto(URL)
        await him.click('#hmQuick'); await him.click('#topics [data-topic="science"]'); await him.click('#tpQuick'); await him.wait_for_timeout(1500)
        await him.click('#mmCancel'); await him.wait_for_timeout(500)
        await him.click('#hmQuick'); await him.click('#topics [data-topic="science"]'); await him.click('#tpQuick')
        await her.click('#hmQuick'); await her.click('#topics [data-topic="science"]'); await her.click('#tpQuick')
        ok = True
        try: await asyncio.gather(him.wait_for_selector('#solo:not([hidden])', timeout=20000), her.wait_for_selector('#solo:not([hidden])', timeout=20000))
        except Exception: ok = False
        check('re-search after cancel gets matched', ok)
        await him.goto(URL); await her.goto(URL)
        # 3. crafted inbox messages are harmless
        code = await her.evaluate("__TM.S.code")
        evil = [{'type':'freq','i':'constructor','n':'X','c':'#ffffff','code':'abcdef'},
                {'type':'freq','i':'evil1','n':'<img src=x onerror=p()>','c':'#ffffff','code':'abcdef'},
                {'type':'ch','i':'constructor','n':'X','c':'#ffffff','code':'abcdef','link':'c=x'}]
        for e in evil: await him.evaluate(f"fetch('https://ntfy.sh/twominds-u-{code}', {{method:'POST', body: JSON.stringify({json.dumps(e)})}})")
        await her.reload(); await her.wait_for_timeout(2500)
        st = await her.evaluate("window.p=()=>window.__pwn=1, ({req: Object.keys(__TM.S.reqIn), pwn: window.__pwn || 0, home: !document.getElementById('home').hidden, inbox: __TM.S.inbox.length})")
        check('reserved ids rejected, names escaped', st['req'] == ['evil1'] and st['pwn'] == 0 and st['home'] and st['inbox'] == 0, st)
        # 4. Daily Duel: second play is practice
        await her.click('#hmDaily'); await play(her); await her.wait_for_selector('#results:not([hidden])')
        xp1 = await her.evaluate("Object.values(__TM.S.xp.me).reduce((a,b)=>a+b,0)")
        await her.goto(URL); await her.click('#hmDaily'); await play(her); await her.wait_for_selector('#results:not([hidden])')
        xp2 = await her.evaluate("Object.values(__TM.S.xp.me).reduce((a,b)=>a+b,0)")
        check('daily replay gives no XP', xp1 == xp2 and xp1 > 0, (xp1, xp2))
        # 5. two tabs: the idle tab follows the other one
        ctx, t1 = await phone(b, 'Priya'); _, t2 = await phone(b, None, ctx)
        await t1.click('.tab[data-go="me"]'); await t1.evaluate("document.querySelector('#me details.edit').open = true"); await t1.fill('#meName', 'Priya K'); await t1.press('#meName', 'Tab'); await t2.wait_for_timeout(800)
        check('second tab picks up the new name', 'Priya K' in await t2.inner_text('#home'))
        # 6. long names don't overflow at 360px
        await t1.set_viewport_size({'width': 360, 'height': 780}); await t1.fill('#meName', 'Wolfeschlegelstein'); await t1.press('#meName', 'Tab')
        await t1.click('.tab[data-go="home"]'); await t1.wait_for_timeout(400)
        sw = await t1.evaluate("document.getElementById('home').scrollWidth <= document.getElementById('home').clientWidth + 1")
        check('no sideways scroll at 360px with a long name', sw)
        # 7. emoji name gives an emoji initial
        await t1.click('.tab[data-go="me"]'); await t1.evaluate("document.querySelector('#me details.edit').open = true"); await t1.fill('#meName', '🦊 Fox'); await t1.press('#meName', 'Tab')
        check('emoji initial', (await t1.inner_text('#me .phead .av')).strip() == '🦊')
        await b.close()
    print('ERRORS:', errs or 'none'); print('FAILED:', fails or 'none')
asyncio.run(main())
